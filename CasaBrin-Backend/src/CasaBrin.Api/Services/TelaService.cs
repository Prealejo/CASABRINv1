using CasaBrin.Api.Common;
using CasaBrin.Api.Data;
using CasaBrin.Api.Dtos;
using CasaBrin.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace CasaBrin.Api.Services;

public interface ITelaService
{
    Task<List<TelaDto>> ListarAsync(string? buscar, bool incluirInactivas);
    Task<TelaDetalleDto> ObtenerDetalleAsync(int id);
    Task<TelaDto> CrearAsync(CrearTelaRequest req);
    Task<TelaDto> ActualizarAsync(int id, ActualizarTelaRequest req);
    Task ActualizarFichaAsync(int id, ActualizarFichaTelaRequest req);
}

public class TelaService : ITelaService
{
    private readonly AppDbContext _db;
    public TelaService(AppDbContext db) => _db = db;

    public async Task<List<TelaDto>> ListarAsync(string? buscar, bool incluirInactivas)
    {
        var q = _db.StockTela.AsQueryable();
        if (!incluirInactivas) q = q.Where(s => s.Activo);

        if (!string.IsNullOrWhiteSpace(buscar))
        {
            var b = buscar.Trim();
            q = q.Where(s =>
                EF.Functions.Like(s.Nombre, $"%{b}%") ||
                EF.Functions.Like(s.Codigo, $"%{b}%") ||
                EF.Functions.Like(s.TipoTela, $"%{b}%") ||
                (s.Color != null && EF.Functions.Like(s.Color, $"%{b}%")) ||
                // codigo de color y proveedor viven en la tabla Telas (no en la vista)
                _db.Telas.Any(t => t.IdTela == s.IdTela && (
                    (t.CodigoColor != null && EF.Functions.Like(t.CodigoColor, $"%{b}%")) ||
                    (t.Proveedor != null && EF.Functions.Like(t.Proveedor.Nombre, $"%{b}%")))));
        }

        var stock = await q.OrderBy(s => s.Nombre).ToListAsync();
        var ids = stock.Select(s => s.IdTela).ToList();

        var provs = await _db.Telas
            .Where(t => ids.Contains(t.IdTela))
            .Select(t => new { t.IdTela, t.IdProveedor, t.CodigoColor, Nombre = t.Proveedor != null ? t.Proveedor.Nombre : null })
            .ToDictionaryAsync(x => x.IdTela);

        return stock.Select(s =>
        {
            provs.TryGetValue(s.IdTela, out var p);
            return Mapeos.TelaDesdeVista(s, p?.IdProveedor, p?.Nombre, p?.CodigoColor);
        }).ToList();
    }

    public async Task<TelaDetalleDto> ObtenerDetalleAsync(int id)
    {
        var stock = await _db.StockTela.FirstOrDefaultAsync(s => s.IdTela == id)
            ?? throw AppException.NotFound("Tela no encontrada.");

        var tela = await _db.Telas.Include(t => t.Proveedor).FirstAsync(t => t.IdTela == id);
        var dto = Mapeos.TelaDesdeVista(stock, tela.IdProveedor, tela.Proveedor?.Nombre, tela.CodigoColor);

        var rollos = await _db.Rollos
            .Include(r => r.Tela).ThenInclude(t => t!.Proveedor).Include(r => r.Ubicacion)
            .Where(r => r.IdTela == id && r.Estado != "Anulado")
            .OrderByDescending(r => r.FechaIngreso)
            .ToListAsync();

        return new TelaDetalleDto(dto, rollos.Select(Mapeos.Rollo).ToList());
    }

    public async Task<TelaDto> CrearAsync(CrearTelaRequest req)
    {
        await ValidarCatalogos(req.IdTipoTela, req.IdProveedor);

        var tela = new Tela
        {
            Nombre = req.Nombre.Trim(),
            IdTipoTela = req.IdTipoTela,
            Color = req.Color,
            Diseno = req.Diseno,
            IdProveedor = req.IdProveedor,
            PrecioMetro = req.PrecioMetro,
            StockMinimo = req.StockMinimo,
            Activo = true
        };
        _db.Telas.Add(tela);
        await _db.SaveChangesAsync();
        return await MapConStock(tela.IdTela);
    }

    public async Task<TelaDto> ActualizarAsync(int id, ActualizarTelaRequest req)
    {
        await ValidarCatalogos(req.IdTipoTela, req.IdProveedor);
        var tela = await _db.Telas.FindAsync(id) ?? throw AppException.NotFound("Tela no encontrada.");

        tela.Nombre = req.Nombre.Trim();
        tela.IdTipoTela = req.IdTipoTela;
        tela.Color = req.Color;
        tela.Diseno = req.Diseno;
        tela.IdProveedor = req.IdProveedor;
        tela.PrecioMetro = req.PrecioMetro;
        tela.StockMinimo = req.StockMinimo;
        tela.Activo = req.Activo;
        tela.FechaActualizacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await MapConStock(id);
    }

    private async Task ValidarCatalogos(int idTipoTela, int? idProveedor)
    {
        if (!await _db.TiposTela.AnyAsync(t => t.IdTipoTela == idTipoTela && t.Activo))
            throw AppException.Validation("El tipo de tela indicado no existe.");
        if (idProveedor.HasValue && !await _db.Proveedores.AnyAsync(p => p.IdProveedor == idProveedor.Value))
            throw AppException.Validation("El proveedor indicado no existe.");
    }

    private async Task<TelaDto> MapConStock(int id)
    {
        var stock = await _db.StockTela.FirstAsync(s => s.IdTela == id);
        var tela = await _db.Telas.Include(t => t.Proveedor).FirstAsync(t => t.IdTela == id);
        return Mapeos.TelaDesdeVista(stock, tela.IdProveedor, tela.Proveedor?.Nombre, tela.CodigoColor);
    }

    // Edicion rapida desde Inventario: nombre, color, codigo de color, diseno, proveedor y stock minimo.
    public async Task ActualizarFichaAsync(int id, ActualizarFichaTelaRequest req)
    {
        var tela = await _db.Telas.FindAsync(id) ?? throw AppException.NotFound("Tela no encontrada.");

        var nombre = (req.Nombre ?? string.Empty).Trim();
        if (nombre.Length < 2) throw AppException.Validation("El nombre de la tela es obligatorio.");
        if (req.StockMinimo < 1) throw AppException.Validation("El stock minimo debe ser 1 o mayor.");
        if (req.IdProveedor.HasValue && !await _db.Proveedores.AnyAsync(p => p.IdProveedor == req.IdProveedor.Value))
            throw AppException.Validation("El proveedor indicado no existe.");

        var codigoColor = Mapeos.CodigoColor(req.CodigoColor);
        if (codigoColor is not null)
        {
            var nombreNorm = nombre.ToLower();
            var duplicada = await _db.Telas
                .Where(t => t.IdTela != id && t.Activo && t.CodigoColor == codigoColor && t.Nombre.ToLower() == nombreNorm)
                .Select(t => t.Codigo)
                .FirstOrDefaultAsync();
            if (duplicada is not null)
                throw AppException.Conflict($"Ya existe la tela {duplicada} con ese nombre y el codigo de color {codigoColor}.");
        }

        tela.Nombre = nombre;
        tela.Color = Mapeos.Limpio(req.Color);
        tela.CodigoColor = codigoColor;
        tela.Diseno = Mapeos.Limpio(req.Diseno);
        tela.IdProveedor = req.IdProveedor;
        tela.StockMinimo = req.StockMinimo;
        tela.FechaActualizacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }
}
