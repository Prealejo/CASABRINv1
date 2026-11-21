using CasaBrin.Api.Common;
using CasaBrin.Api.Dtos;
using CasaBrin.Api.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CasaBrin.Api.Tests;

public class RolloServiceTests
{
    // ================= CORTE =================

    [Fact]
    public async Task Cortar_DescuentaMetros_YCalculaValor()
    {
        using var t = new TestDb(precioMetro: 5m);
        var svc = new RolloService(t.Db);
        var id = t.CrearRollo(100m);

        var r = await svc.CortarAsync(id, new CortarRequest(30m, "venta mostrador"), TestDb.UsuarioId);

        Assert.Equal(100m, r.MetrosAntes);
        Assert.Equal(70m, r.MetrosDespues);
        Assert.Equal(5m, r.PrecioMetro);
        Assert.Equal(150m, r.ValorTotal);          // 30 m * 5 = 150
        Assert.Equal("Disponible", r.Estado);

        var enBd = await t.Db.Rollos.AsNoTracking().FirstAsync(x => x.IdRollo == id);
        Assert.Equal(70m, enBd.MetrosActuales);     // persistio en la BD
    }

    [Fact]
    public async Task Cortar_TodoElRollo_LoMarcaAgotado()
    {
        using var t = new TestDb(precioMetro: 8m);
        var svc = new RolloService(t.Db);
        var id = t.CrearRollo(50m);

        var r = await svc.CortarAsync(id, new CortarRequest(50m, null), TestDb.UsuarioId);

        Assert.Equal(0m, r.MetrosDespues);
        Assert.Equal("Agotado", r.Estado);
        Assert.Equal(400m, r.ValorTotal);

        var enBd = await t.Db.Rollos.AsNoTracking().FirstAsync(x => x.IdRollo == id);
        Assert.Equal("Agotado", enBd.Estado);
    }

    [Fact]
    public async Task Cortar_MasMetrosDeLosDisponibles_Falla()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);
        var id = t.CrearRollo(20m);

        var ex = await Assert.ThrowsAsync<AppException>(
            () => svc.CortarAsync(id, new CortarRequest(25m, null), TestDb.UsuarioId));
        Assert.Equal(400, ex.StatusCode);

        // No debe haberse modificado nada.
        var enBd = await t.Db.Rollos.AsNoTracking().FirstAsync(x => x.IdRollo == id);
        Assert.Equal(20m, enBd.MetrosActuales);
        Assert.False(await t.Db.Movimientos.AnyAsync());
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public async Task Cortar_MetrosNoPositivos_Falla(decimal metros)
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);
        var id = t.CrearRollo(20m);

        await Assert.ThrowsAsync<AppException>(
            () => svc.CortarAsync(id, new CortarRequest(metros, null), TestDb.UsuarioId));
    }

    [Fact]
    public async Task Cortar_RolloInexistente_Falla()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);

        var ex = await Assert.ThrowsAsync<AppException>(
            () => svc.CortarAsync(999, new CortarRequest(1m, null), TestDb.UsuarioId));
        Assert.Equal(404, ex.StatusCode);
    }

    [Fact]
    public async Task Cortar_RolloAgotado_Falla()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);
        var id = t.CrearRollo(10m);
        await svc.CortarAsync(id, new CortarRequest(10m, null), TestDb.UsuarioId); // queda Agotado

        var ex = await Assert.ThrowsAsync<AppException>(
            () => svc.CortarAsync(id, new CortarRequest(1m, null), TestDb.UsuarioId));
        Assert.Equal(400, ex.StatusCode);
    }

    [Fact]
    public async Task Cortar_RegistraMovimientoSalida()
    {
        using var t = new TestDb(precioMetro: 3m);
        var svc = new RolloService(t.Db);
        var id = t.CrearRollo(40m);

        await svc.CortarAsync(id, new CortarRequest(12.5m, "corte cliente"), TestDb.UsuarioId);

        var mov = await t.Db.Movimientos.AsNoTracking().SingleAsync(m => m.TipoMovimiento == "Salida");
        Assert.Equal(id, mov.IdRollo);
        Assert.Equal(12.5m, mov.Metros);
        Assert.Equal(40m, mov.MetrosAntes);
        Assert.Equal(27.5m, mov.MetrosDespues);
        Assert.Equal(37.5m, mov.ValorTotal);       // 12.5 * 3
        Assert.Equal(TestDb.UsuarioId, mov.IdUsuario);
    }

    [Fact]
    public async Task Cortar_VariosCortes_SumanCorrectamente()
    {
        using var t = new TestDb(precioMetro: 2m);
        var svc = new RolloService(t.Db);
        var id = t.CrearRollo(100m);

        await svc.CortarAsync(id, new CortarRequest(10m, null), TestDb.UsuarioId);
        await svc.CortarAsync(id, new CortarRequest(15m, null), TestDb.UsuarioId);
        await svc.CortarAsync(id, new CortarRequest(25m, null), TestDb.UsuarioId);

        var enBd = await t.Db.Rollos.AsNoTracking().FirstAsync(x => x.IdRollo == id);
        Assert.Equal(50m, enBd.MetrosActuales);
        Assert.Equal(3, await t.Db.Movimientos.CountAsync(m => m.TipoMovimiento == "Salida"));
    }

    // ================= INGRESO =================

    [Fact]
    public async Task Ingreso_TelaExistente_CreaRollosEnVariasUbicaciones()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);

        // 3 piezas de 50 m a Bodega y 1 pieza de 50 m al Local.
        var req = new IngresoMercaderiaRequest(
            IdTela: 1,
            Tela: null,
            Lineas: new List<LineaIngreso>
            {
                new(50m, 3, TestDb.BodegaId),
                new(50m, 1, TestDb.LocalId)
            },
            Observacion: "compra inicial");

        var res = await svc.IngresoAsync(req, TestDb.UsuarioId);

        Assert.Equal(4, res.RollosCreados.Count);
        Assert.Equal(3, res.RollosCreados.Count(r => r.IdUbicacion == TestDb.BodegaId));
        Assert.Equal(1, res.RollosCreados.Count(r => r.IdUbicacion == TestDb.LocalId));
        Assert.All(res.RollosCreados, r => Assert.Equal(50m, r.MetrosActuales));

        // Un movimiento de Ingreso por rollo.
        Assert.Equal(4, await t.Db.Movimientos.CountAsync(m => m.TipoMovimiento == "Ingreso"));
    }

    [Fact]
    public async Task Ingreso_TelaNueva_CreaTelaYRollos()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);

        var req = new IngresoMercaderiaRequest(
            IdTela: null,
            Tela: new NuevaTela("Lino Crudo", "Crudo", null, null, 30m),
            Lineas: new List<LineaIngreso> { new(80m, 2, TestDb.BodegaId) },
            Observacion: null);

        var res = await svc.IngresoAsync(req, TestDb.UsuarioId);

        Assert.Equal("Lino Crudo", res.TelaNombre);
        Assert.Equal(2, res.RollosCreados.Count);
        Assert.Equal(2, await t.Db.Telas.CountAsync()); // la sembrada + la nueva
    }

    [Fact]
    public async Task Ingreso_SinTela_Falla()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);

        var req = new IngresoMercaderiaRequest(null, null,
            new List<LineaIngreso> { new(10m, 1, TestDb.BodegaId) }, null);

        await Assert.ThrowsAsync<AppException>(() => svc.IngresoAsync(req, TestDb.UsuarioId));
    }

    [Fact]
    public async Task Ingreso_UbicacionInexistente_Falla()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);

        var req = new IngresoMercaderiaRequest(1, null,
            new List<LineaIngreso> { new(10m, 1, 999) }, null);

        await Assert.ThrowsAsync<AppException>(() => svc.IngresoAsync(req, TestDb.UsuarioId));
    }

    // ================= TRASLADO =================

    [Fact]
    public async Task Trasladar_CambiaUbicacion_YRegistraMovimiento()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);
        var id = t.CrearRollo(60m, TestDb.BodegaId);

        var r = await svc.TrasladarAsync(id, new TrasladarRequest(TestDb.LocalId, "reposicion local"), TestDb.UsuarioId);

        Assert.Equal(TestDb.LocalId, r.IdUbicacion);
        var mov = await t.Db.Movimientos.AsNoTracking().SingleAsync(m => m.TipoMovimiento == "Traslado");
        Assert.Equal(TestDb.BodegaId, mov.IdUbicacionOrigen);
        Assert.Equal(TestDb.LocalId, mov.IdUbicacionDestino);
    }

    [Fact]
    public async Task Trasladar_MismaUbicacion_Falla()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);
        var id = t.CrearRollo(60m, TestDb.BodegaId);

        await Assert.ThrowsAsync<AppException>(
            () => svc.TrasladarAsync(id, new TrasladarRequest(TestDb.BodegaId, null), TestDb.UsuarioId));
    }

    // ================= AJUSTE =================

    [Fact]
    public async Task Ajustar_CorrigeMetros_YRegistraMovimiento()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);
        var id = t.CrearRollo(100m);

        var r = await svc.AjustarAsync(id, new AjustarRequest(85m, "merma por humedad"), TestDb.UsuarioId);

        Assert.Equal(85m, r.MetrosActuales);
        var mov = await t.Db.Movimientos.AsNoTracking().SingleAsync(m => m.TipoMovimiento == "Ajuste");
        Assert.Equal(100m, mov.MetrosAntes);
        Assert.Equal(85m, mov.MetrosDespues);
    }

    [Fact]
    public async Task Ajustar_MasQueLosIniciales_Falla()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);
        var id = t.CrearRollo(100m);

        await Assert.ThrowsAsync<AppException>(
            () => svc.AjustarAsync(id, new AjustarRequest(120m, "error"), TestDb.UsuarioId));
    }

    // ================= ANULACION =================

    [Fact]
    public async Task Anular_MarcaAnulado_YDejaMetrosEnCero()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);
        var id = t.CrearRollo(70m);

        await svc.AnularAsync(id, "rollo danado", TestDb.UsuarioId);

        var enBd = await t.Db.Rollos.AsNoTracking().FirstAsync(x => x.IdRollo == id);
        Assert.Equal("Anulado", enBd.Estado);
        Assert.Equal(0m, enBd.MetrosActuales);

        // Un rollo anulado ya no se puede cortar.
        await Assert.ThrowsAsync<AppException>(
            () => svc.CortarAsync(id, new CortarRequest(1m, null), TestDb.UsuarioId));
    }

    // ================= CONSULTA POR CODIGO =================

    [Fact]
    public async Task ObtenerPorCodigo_DevuelveRollo()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);
        var id = t.CrearRollo(45m);
        var codigo = await t.Db.Rollos.AsNoTracking().Where(r => r.IdRollo == id)
                        .Select(r => r.CodigoBarras).FirstAsync();

        var r = await svc.ObtenerPorCodigoAsync(codigo);
        Assert.Equal(id, r.IdRollo);
        Assert.Equal(45m, r.MetrosActuales);
    }

    [Fact]
    public async Task ObtenerPorCodigo_Inexistente_Falla()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);

        var ex = await Assert.ThrowsAsync<AppException>(() => svc.ObtenerPorCodigoAsync("NOEXISTE"));
        Assert.Equal(404, ex.StatusCode);
    }
}
