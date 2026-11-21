using CasaBrin.Api.Common;
using CasaBrin.Api.Dtos;
using CasaBrin.Api.Entities;
using CasaBrin.Api.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CasaBrin.Api.Tests;

public class CodigoColorTests
{
    private static IngresoMercaderiaRequest IngresoNueva(string nombre, string? codigoColor, int? idProveedor = null) =>
        new(IdTela: null,
            Tela: new NuevaTela(nombre, "Azul", null, idProveedor, 20m, codigoColor),
            Lineas: new List<LineaIngreso> { new(40m, 1, TestDb.BodegaId) },
            Observacion: null);

    [Fact]
    public async Task Ingreso_TelaNueva_GuardaCodigoColorNormalizado_YProveedorEnRollos()
    {
        using var t = new TestDb();
        t.Db.Proveedores.Add(new Proveedor { IdProveedor = 7, Nombre = "Textiles Andinos", Activo = true });
        await t.Db.SaveChangesAsync();
        var svc = new RolloService(t.Db);

        var res = await svc.IngresoAsync(IngresoNueva("Satin", "  az-210 ", 7), TestDb.UsuarioId);

        var tela = await t.Db.Telas.AsNoTracking().FirstAsync(x => x.IdTela == res.IdTela);
        Assert.Equal("AZ-210", tela.CodigoColor);              // sin espacios y en mayúsculas
        Assert.Equal("AZ-210", res.RollosCreados[0].CodigoColor);
        Assert.Equal("Textiles Andinos", res.RollosCreados[0].Proveedor);
    }

    [Fact]
    public async Task Ingreso_TelaNueva_SinCodigoColor_LoDejaNulo()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);

        var res = await svc.IngresoAsync(IngresoNueva("Lino", "   "), TestDb.UsuarioId);

        var tela = await t.Db.Telas.AsNoTracking().FirstAsync(x => x.IdTela == res.IdTela);
        Assert.Null(tela.CodigoColor);
    }

    [Fact]
    public async Task Ingreso_TelaDuplicada_MismoNombreYCodigo_Rechaza()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);
        await svc.IngresoAsync(IngresoNueva("Satin", "AZ-210"), TestDb.UsuarioId);

        var ex = await Assert.ThrowsAsync<AppException>(
            () => svc.IngresoAsync(IngresoNueva("satin", "az-210"), TestDb.UsuarioId));

        Assert.Equal(409, ex.StatusCode);
        Assert.Equal(2, await t.Db.Telas.CountAsync());        // la sembrada + la primera, no una tercera
    }

    [Fact]
    public async Task Ingreso_MismoNombre_OtroCodigo_EsOtraTela()
    {
        using var t = new TestDb();
        var svc = new RolloService(t.Db);
        await svc.IngresoAsync(IngresoNueva("Satin", "AZ-210"), TestDb.UsuarioId);

        await svc.IngresoAsync(IngresoNueva("Satin", "RJ-105"), TestDb.UsuarioId);

        Assert.Equal(3, await t.Db.Telas.CountAsync());
    }

    [Fact]
    public async Task ActualizarFicha_CambiaCodigoColorYProveedor()
    {
        using var t = new TestDb();
        t.Db.Proveedores.Add(new Proveedor { IdProveedor = 3, Nombre = "Importadora Sur", Activo = true });
        await t.Db.SaveChangesAsync();
        var svc = new TelaService(t.Db);

        await svc.ActualizarFichaAsync(1, new ActualizarFichaTelaRequest("Algodon Blanco", "Blanco", "bl-001", "Liso", 3, 25m));

        var tela = await t.Db.Telas.AsNoTracking().FirstAsync(x => x.IdTela == 1);
        Assert.Equal("BL-001", tela.CodigoColor);
        Assert.Equal(3, tela.IdProveedor);
        Assert.Equal(25m, tela.StockMinimo);
        Assert.Equal("Liso", tela.Diseno);
    }

    [Fact]
    public async Task ActualizarFicha_ProveedorInexistente_Rechaza()
    {
        using var t = new TestDb();
        var svc = new TelaService(t.Db);

        var ex = await Assert.ThrowsAsync<AppException>(
            () => svc.ActualizarFichaAsync(1, new ActualizarFichaTelaRequest("Algodon Blanco", null, null, null, 999, 10m)));

        Assert.Equal(400, ex.StatusCode);
    }
}
