using CasaBrin.Api.Common;
using CasaBrin.Api.Data;
using CasaBrin.Api.Dtos;
using CasaBrin.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace CasaBrin.Api.Services;

public interface IRolloService
{
    Task<IngresoResultado> IngresoAsync(IngresoMercaderiaRequest req, int idUsuario);
    Task<RolloDto> ObtenerPorCodigoAsync(string codigo);
    Task<RolloDto> ObtenerPorIdAsync(int id);
    Task<List<RolloDto>> ListarAsync(int? idTela, int? idUbicacion, string? estado);
    Task<CorteResultado> CortarAsync(int idRollo, CortarRequest req, int idUsuario);
    Task<RolloDto> TrasladarAsync(int idRollo, TrasladarRequest req, int idUsuario);
    Task<RolloDto> AjustarAsync(int idRollo, AjustarRequest req, int idUsuario);
    Task AnularAsync(int idRollo, string motivo, int idUsuario);
}

public class RolloService : IRolloService
{
    private readonly AppDbContext _db;
    public RolloService(AppDbContext db) => _db = db;

    // ------------------------------------------------------------------
    //  INGRESO DE MERCADERIA (RF-03, RF-04, RF-07, RF-11)
    //  Crea (o reutiliza) una Tela y genera N rollos repartidos en las
    //  ubicaciones indicadas (ej. 3 piezas a Bodega y 1 al Local).
    // ------------------------------------------------------------------
    public async Task<IngresoResultado> IngresoAsync(IngresoMercaderiaRequest req, int idUsuario)
    {
        if (req.IdTela is null && req.Tela is null)
            throw AppException.Validation("Debes indicar una tela existente (IdTela) o los datos de una tela nueva.");
        if (req.IdTela is not null && req.Tela is not null)
            throw AppException.Validation("Indica solo una tela existente o una nueva, no ambas.");
        if (req.Lineas is null || req.Lineas.Count == 0)
            throw AppException.Validation("Debes registrar al menos una linea de ingreso.");

        // Validar ubicaciones de todas las lineas antes de tocar nada.
        var idsUbic = req.Lineas.Select(l => l.IdUbicacion).Distinct().ToList();
        var ubicOk = await _db.Ubicaciones.Where(u => idsUbic.Contains(u.IdUbicacion) && u.Activo)
                                          .Select(u => u.IdUbicacion).ToListAsync();
        var faltante = idsUbic.Except(ubicOk).ToList();
        if (faltante.Count > 0)
            throw AppException.Validation($"Ubicacion(es) inexistente(s) o inactiva(s): {string.Join(", ", faltante)}.");

        await using var tx = await _db.Database.BeginTransactionAsync();

        Tela tela;
        if (req.IdTela is not null)
        {
            tela = await _db.Telas.FirstOrDefaultAsync(t => t.IdTela == req.IdTela.Value)
                   ?? throw AppException.NotFound("La tela indicada no existe.");
            if (!tela.Activo) throw AppException.Validation("La tela indicada esta inactiva.");
        }
        else
        {
            var nt = req.Tela!;
            if (string.IsNullOrWhiteSpace(nt.Nombre))
                throw AppException.Validation("El nombre de la tela es obligatorio.");
            if (nt.StockMinimo < 1)
                throw AppException.Validation("El stock minimo debe ser 1 o mayor.");
            if (nt.IdProveedor.HasValue && !await _db.Proveedores.AnyAsync(p => p.IdProveedor == nt.IdProveedor.Value))
                throw AppException.Validation("El proveedor indicado no existe.");

            // Evita duplicar la misma tela: mismo nombre y mismo codigo de color.
            var codigoColor = Mapeos.CodigoColor(nt.CodigoColor);
            if (codigoColor is not null)
            {
                var nombreNorm = nt.Nombre.Trim().ToLower();
                var duplicada = await _db.Telas
                    .Where(t => t.Activo && t.CodigoColor == codigoColor && t.Nombre.ToLower() == nombreNorm)
                    .Select(t => t.Codigo)
                    .FirstOrDefaultAsync();
                if (duplicada is not null)
                    throw AppException.Conflict(
                        $"Ya existe la tela {duplicada} con el nombre '{nt.Nombre.Trim()}' y el codigo de color {codigoColor}. " +
                        "Elige 'Tela existente' para ingresar mas rollos.");
            }

            // El tipo de tela ya no se pide en el formulario: se usa/crea uno por defecto ("General").
            var tipoGeneral = await _db.TiposTela.FirstOrDefaultAsync(t => t.Nombre == "General");
            if (tipoGeneral is null)
            {
                tipoGeneral = new TipoTela { Nombre = "General", Activo = true };
                _db.TiposTela.Add(tipoGeneral);
                await _db.SaveChangesAsync();
            }

            tela = new Tela
            {
                Nombre = nt.Nombre.Trim(),
                IdTipoTela = tipoGeneral.IdTipoTela,
                Color = string.IsNullOrWhiteSpace(nt.Color) ? null : nt.Color.Trim(),
                CodigoColor = codigoColor,
                Diseno = string.IsNullOrWhiteSpace(nt.Diseno) ? null : nt.Diseno.Trim(),
                IdProveedor = nt.IdProveedor,
                PrecioMetro = 0m,          // el precio ya no se captura en el ingreso
                StockMinimo = nt.StockMinimo,
                Activo = true
            };
            _db.Telas.Add(tela);
            await _db.SaveChangesAsync(); // obtiene IdTela y Codigo calculado
        }

        var ahora = DateTime.UtcNow;
        var rollos = new List<Rollo>();
        foreach (var linea in req.Lineas)
        {
            if (linea.Metros <= 0) throw AppException.Validation("Los metros de cada pieza deben ser mayores a 0.");
            if (linea.Cantidad <= 0) throw AppException.Validation("La cantidad de piezas debe ser al menos 1.");

            for (var i = 0; i < linea.Cantidad; i++)
            {
                var rollo = new Rollo
                {
                    IdTela = tela.IdTela,
                    IdUbicacion = linea.IdUbicacion,
                    MetrosIniciales = linea.Metros,
                    MetrosActuales = linea.Metros,
                    Estado = "Disponible",
                    Observacion = req.Observacion,
                    FechaIngreso = ahora
                };
                _db.Rollos.Add(rollo);
                rollos.Add(rollo);
            }
        }
        await _db.SaveChangesAsync(); // obtiene IdRollo y CodigoBarras calculado

        // Movimiento de Ingreso por cada rollo (RF-14 historial).
        foreach (var r in rollos)
        {
            _db.Movimientos.Add(new Movimiento
            {
                IdRollo = r.IdRollo,
                IdTela = tela.IdTela,
                TipoMovimiento = "Ingreso",
                Metros = r.MetrosIniciales,
                MetrosAntes = 0m,
                MetrosDespues = r.MetrosIniciales,
                IdUbicacionOrigen = null,
                IdUbicacionDestino = r.IdUbicacion,
                PrecioMetro = tela.PrecioMetro,
                ValorTotal = Math.Round(r.MetrosIniciales * tela.PrecioMetro, 2),
                IdUsuario = idUsuario,
                Observacion = req.Observacion,
                FechaMovimiento = ahora
            });
        }
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        // Recargar con navegaciones para el DTO.
        var ids = rollos.Select(r => r.IdRollo).ToList();
        var creados = await _db.Rollos.AsNoTracking()
            .Include(r => r.Tela).ThenInclude(t => t!.Proveedor).Include(r => r.Ubicacion)
            .Where(r => ids.Contains(r.IdRollo))
            .OrderBy(r => r.IdRollo)
            .ToListAsync();

        return new IngresoResultado(tela.IdTela, tela.Nombre, creados.Select(Mapeos.Rollo).ToList());
    }

    // ------------------------------------------------------------------
    //  CONSULTA POR ESCANEO (RF-06) y por Id
    // ------------------------------------------------------------------
    public async Task<RolloDto> ObtenerPorCodigoAsync(string codigo)
    {
        var cod = (codigo ?? string.Empty).Trim().ToUpperInvariant();
        var rollo = await _db.Rollos.AsNoTracking()
            .Include(r => r.Tela).ThenInclude(t => t!.Proveedor).Include(r => r.Ubicacion)
            .FirstOrDefaultAsync(r => r.CodigoBarras == cod)
            ?? throw AppException.NotFound($"No se encontro ningun rollo con el codigo '{cod}'.");
        return Mapeos.Rollo(rollo);
    }

    public async Task<RolloDto> ObtenerPorIdAsync(int id)
    {
        var rollo = await _db.Rollos.AsNoTracking()
            .Include(r => r.Tela).ThenInclude(t => t!.Proveedor).Include(r => r.Ubicacion)
            .FirstOrDefaultAsync(r => r.IdRollo == id)
            ?? throw AppException.NotFound("Rollo no encontrado.");
        return Mapeos.Rollo(rollo);
    }

    public async Task<List<RolloDto>> ListarAsync(int? idTela, int? idUbicacion, string? estado)
    {
        var q = _db.Rollos.AsNoTracking().Include(r => r.Tela).ThenInclude(t => t!.Proveedor).Include(r => r.Ubicacion).AsQueryable();
        if (idTela is not null) q = q.Where(r => r.IdTela == idTela);
        if (idUbicacion is not null) q = q.Where(r => r.IdUbicacion == idUbicacion);
        if (!string.IsNullOrWhiteSpace(estado)) q = q.Where(r => r.Estado == estado);
        var rollos = await q.OrderByDescending(r => r.FechaIngreso).ToListAsync();
        return rollos.Select(Mapeos.Rollo).ToList();
    }

    // ------------------------------------------------------------------
    //  CORTE / SALIDA DE METROS (RF-08, RF-09)  -> el corazon del sistema
    //  Anti-fallos:
    //    * Valida existencia, estado y metros disponibles.
    //    * Decremento ATOMICO y CONDICIONAL: el UPDATE solo aplica si aun
    //      hay metros suficientes, evitando vender de mas por concurrencia.
    //    * Si el rollo llega a 0 metros se marca 'Agotado'.
    //    * Registra el movimiento con el VALOR del corte (metros * precio).
    //    * Todo dentro de una transaccion.
    // ------------------------------------------------------------------
    public async Task<CorteResultado> CortarAsync(int idRollo, CortarRequest req, int idUsuario)
    {
        if (req.Metros <= 0)
            throw AppException.Validation("Los metros a cortar deben ser mayores a 0.");

        await using var tx = await _db.Database.BeginTransactionAsync();

        // Lectura inicial sin tracking (solo para validar y conocer precio/estado).
        var info = await _db.Rollos.AsNoTracking()
            .Where(r => r.IdRollo == idRollo)
            .Select(r => new
            {
                r.IdRollo,
                r.IdTela,
                r.IdUbicacion,
                r.Estado,
                r.MetrosActuales,
                Precio = r.Tela!.PrecioMetro
            })
            .FirstOrDefaultAsync()
            ?? throw AppException.NotFound("Rollo no encontrado.");

        if (info.Estado == "Anulado")
            throw AppException.Validation("El rollo esta anulado y no admite cortes.");
        if (info.Estado != "Disponible")
            throw AppException.Validation($"El rollo no esta disponible (estado actual: {info.Estado}).");
        if (req.Metros > info.MetrosActuales)
            throw AppException.Validation(
                $"No hay metros suficientes. Disponibles: {info.MetrosActuales:0.##} m, solicitados: {req.Metros:0.##} m.");

        var metros = req.Metros;
        var metrosAntes = info.MetrosActuales;
        var metrosDespues = Math.Round(metrosAntes - metros, 2);
        var precio = info.Precio;
        var valorTotal = Math.Round(metros * precio, 2);
        var nuevoEstado = metrosDespues <= 0 ? "Agotado" : "Disponible";

        // Decremento atomico y condicional: si otro corte se adelanto y ya no
        // hay metros suficientes, afectadas == 0 y se aborta.
        var afectadas = await _db.Rollos
            .Where(r => r.IdRollo == idRollo
                        && r.Estado == "Disponible"
                        && r.MetrosActuales >= metros)
            .ExecuteUpdateAsync(s => s
                .SetProperty(r => r.MetrosActuales, r => r.MetrosActuales - metros)
                .SetProperty(r => r.Estado, r => r.MetrosActuales - metros <= 0 ? "Agotado" : "Disponible"));

        if (afectadas == 0)
            throw AppException.Conflict(
                "No se pudo registrar el corte: el rollo cambio de estado o quedo sin metros suficientes. Vuelve a escanear.");

        _db.Movimientos.Add(new Movimiento
        {
            IdRollo = idRollo,
            IdTela = info.IdTela,
            TipoMovimiento = "Salida",
            Metros = metros,
            MetrosAntes = metrosAntes,
            MetrosDespues = metrosDespues,
            IdUbicacionOrigen = info.IdUbicacion,
            IdUbicacionDestino = null,
            PrecioMetro = precio,
            ValorTotal = valorTotal,
            IdUsuario = idUsuario,
            Observacion = req.Observacion,
            FechaMovimiento = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return new CorteResultado(idRollo, await CodigoDe(idRollo), metrosAntes, metrosDespues, precio, valorTotal, nuevoEstado);
    }

    // ------------------------------------------------------------------
    //  TRASLADO ENTRE UBICACIONES (RF-11)
    // ------------------------------------------------------------------
    public async Task<RolloDto> TrasladarAsync(int idRollo, TrasladarRequest req, int idUsuario)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();

        var rollo = await _db.Rollos.Include(r => r.Tela)
            .FirstOrDefaultAsync(r => r.IdRollo == idRollo)
            ?? throw AppException.NotFound("Rollo no encontrado.");

        if (rollo.Estado == "Anulado")
            throw AppException.Validation("El rollo esta anulado y no se puede trasladar.");
        if (!await _db.Ubicaciones.AnyAsync(u => u.IdUbicacion == req.IdUbicacionDestino && u.Activo))
            throw AppException.Validation("La ubicacion destino no existe o esta inactiva.");
        if (rollo.IdUbicacion == req.IdUbicacionDestino)
            throw AppException.Validation("El rollo ya se encuentra en esa ubicacion.");

        var origen = rollo.IdUbicacion;
        rollo.IdUbicacion = req.IdUbicacionDestino;

        _db.Movimientos.Add(new Movimiento
        {
            IdRollo = rollo.IdRollo,
            IdTela = rollo.IdTela,
            TipoMovimiento = "Traslado",
            Metros = rollo.MetrosActuales,
            MetrosAntes = rollo.MetrosActuales,
            MetrosDespues = rollo.MetrosActuales,
            IdUbicacionOrigen = origen,
            IdUbicacionDestino = req.IdUbicacionDestino,
            PrecioMetro = 0m,
            ValorTotal = 0m,
            IdUsuario = idUsuario,
            Observacion = req.Observacion,
            FechaMovimiento = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return await ObtenerPorIdAsync(rollo.IdRollo);
    }

    // ------------------------------------------------------------------
    //  AJUSTE MANUAL DE INVENTARIO (correccion de metros)
    // ------------------------------------------------------------------
    public async Task<RolloDto> AjustarAsync(int idRollo, AjustarRequest req, int idUsuario)
    {
        if (req.NuevosMetros < 0)
            throw AppException.Validation("Los metros no pueden ser negativos.");
        if (string.IsNullOrWhiteSpace(req.Motivo))
            throw AppException.Validation("Debes indicar el motivo del ajuste.");

        await using var tx = await _db.Database.BeginTransactionAsync();

        var rollo = await _db.Rollos.Include(r => r.Tela)
            .FirstOrDefaultAsync(r => r.IdRollo == idRollo)
            ?? throw AppException.NotFound("Rollo no encontrado.");
        if (rollo.Estado == "Anulado")
            throw AppException.Validation("El rollo esta anulado y no se puede ajustar.");
        if (req.NuevosMetros > rollo.MetrosIniciales)
            throw AppException.Validation(
                $"Los metros ajustados ({req.NuevosMetros:0.##}) no pueden superar los iniciales ({rollo.MetrosIniciales:0.##}).");

        var antes = rollo.MetrosActuales;
        var despues = Math.Round(req.NuevosMetros, 2);
        var delta = Math.Round(despues - antes, 2);
        var precio = rollo.Tela?.PrecioMetro ?? 0m;

        rollo.MetrosActuales = despues;
        rollo.Estado = despues <= 0 ? "Agotado" : "Disponible";

        _db.Movimientos.Add(new Movimiento
        {
            IdRollo = rollo.IdRollo,
            IdTela = rollo.IdTela,
            TipoMovimiento = "Ajuste",
            Metros = delta,
            MetrosAntes = antes,
            MetrosDespues = despues,
            IdUbicacionOrigen = rollo.IdUbicacion,
            IdUbicacionDestino = rollo.IdUbicacion,
            PrecioMetro = precio,
            ValorTotal = Math.Round(Math.Abs(delta) * precio, 2),
            IdUsuario = idUsuario,
            Observacion = req.Motivo,
            FechaMovimiento = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return await ObtenerPorIdAsync(rollo.IdRollo);
    }

    // ------------------------------------------------------------------
    //  ANULACION DE ROLLO (baja logica, conserva historial)
    // ------------------------------------------------------------------
    public async Task AnularAsync(int idRollo, string motivo, int idUsuario)
    {
        if (string.IsNullOrWhiteSpace(motivo))
            throw AppException.Validation("Debes indicar el motivo de la anulacion.");

        await using var tx = await _db.Database.BeginTransactionAsync();

        var rollo = await _db.Rollos.FirstOrDefaultAsync(r => r.IdRollo == idRollo)
            ?? throw AppException.NotFound("Rollo no encontrado.");
        if (rollo.Estado == "Anulado")
            throw AppException.Validation("El rollo ya estaba anulado.");

        var antes = rollo.MetrosActuales;
        rollo.Estado = "Anulado";
        rollo.MetrosActuales = 0m;

        _db.Movimientos.Add(new Movimiento
        {
            IdRollo = rollo.IdRollo,
            IdTela = rollo.IdTela,
            TipoMovimiento = "Anulacion",
            Metros = antes,
            MetrosAntes = antes,
            MetrosDespues = 0m,
            IdUbicacionOrigen = rollo.IdUbicacion,
            IdUbicacionDestino = null,
            PrecioMetro = 0m,
            ValorTotal = 0m,
            IdUsuario = idUsuario,
            Observacion = motivo,
            FechaMovimiento = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
    }

    private async Task<string> CodigoDe(int idRollo) =>
        await _db.Rollos.AsNoTracking().Where(r => r.IdRollo == idRollo)
            .Select(r => r.CodigoBarras).FirstAsync();
}
