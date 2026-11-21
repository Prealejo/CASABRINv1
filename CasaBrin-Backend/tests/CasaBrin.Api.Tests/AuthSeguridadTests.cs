using CasaBrin.Api.Auth;
using CasaBrin.Api.Common;
using CasaBrin.Api.Dtos;
using CasaBrin.Api.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CasaBrin.Api.Tests;

public class AuthSeguridadTests
{
    private const string ClaveInicial = "Inicial123";

    private static (TestDb t, AuthService svc, PasswordHasher hasher) Crear()
    {
        var t = new TestDb();
        var hasher = new PasswordHasher();
        var admin = t.Db.Usuarios.First(u => u.IdUsuario == TestDb.UsuarioId);
        admin.ContrasenaHash = hasher.Hash(ClaveInicial);
        t.Db.SaveChanges();
        var tokens = new TokenService(new JwtSettings
        {
            Key = "clave-de-pruebas-suficientemente-larga-1234567890",
            Issuer = "test",
            Audience = "test",
            ExpiraEnMinutos = 60
        });
        return (t, new AuthService(t.Db, tokens, hasher), hasher);
    }

    // ================= LOGIN Y BLOQUEO =================

    [Fact]
    public async Task Login_Correcto_DevuelveToken()
    {
        var (t, svc, _) = Crear();
        using var _t = t;

        var r = await svc.LoginAsync(new LoginRequest("  admin ", ClaveInicial));   // recorta espacios

        Assert.False(string.IsNullOrEmpty(r.Token));
        Assert.Equal("admin", r.Usuario.NombreUsuario);
    }

    [Fact]
    public async Task Login_CincoFallos_BloqueaAunqueLaClaveSeaCorrecta()
    {
        var (t, svc, _) = Crear();
        using var _t = t;

        for (var i = 0; i < Bloqueo.IntentosMaximos; i++)
        {
            var ex = await Assert.ThrowsAsync<AppException>(() => svc.LoginAsync(new LoginRequest("admin", "mala")));
            Assert.Equal(401, ex.StatusCode);
        }

        var bloqueo = await Assert.ThrowsAsync<AppException>(() => svc.LoginAsync(new LoginRequest("admin", ClaveInicial)));
        Assert.Equal(429, bloqueo.StatusCode);
    }

    [Fact]
    public async Task Login_Exitoso_ReiniciaIntentosFallidos()
    {
        var (t, svc, _) = Crear();
        using var _t = t;
        await Assert.ThrowsAsync<AppException>(() => svc.LoginAsync(new LoginRequest("admin", "mala")));

        await svc.LoginAsync(new LoginRequest("admin", ClaveInicial));

        var u = await t.Db.Usuarios.AsNoTracking().FirstAsync(x => x.IdUsuario == TestDb.UsuarioId);
        Assert.Equal(0, u.IntentosFallidos);
    }

    [Fact]
    public async Task Login_UsuarioInexistente_MismoMensajeQueClaveIncorrecta()
    {
        var (t, svc, _) = Crear();
        using var _t = t;

        var a = await Assert.ThrowsAsync<AppException>(() => svc.LoginAsync(new LoginRequest("nadie", "x")));
        var b = await Assert.ThrowsAsync<AppException>(() => svc.LoginAsync(new LoginRequest("admin", "x")));

        Assert.Equal(a.Message, b.Message);
    }

    // ================= RECUPERACION CON CODIGO =================

    [Fact]
    public async Task Recuperar_ConCodigoValido_CambiaClave_YEntregaCodigoNuevo()
    {
        var (t, svc, _) = Crear();
        using var _t = t;
        var codigo = (await svc.GenerarCodigoRecuperacionAsync(TestDb.UsuarioId)).Codigo;

        // Se acepta en minúsculas y con espacios en lugar de guiones.
        var r = await svc.RecuperarAsync(new RecuperarContrasenaRequest(
            "admin", codigo.ToLowerInvariant().Replace('-', ' '), "Nueva2026"));

        Assert.NotEqual(codigo, r.Codigo);
        var login = await svc.LoginAsync(new LoginRequest("admin", "Nueva2026"));
        Assert.NotNull(login.Token);

        // El código usado ya no sirve (es de un solo uso).
        var ex = await Assert.ThrowsAsync<AppException>(() => svc.RecuperarAsync(
            new RecuperarContrasenaRequest("admin", codigo, "Otra2026x")));
        Assert.Equal(400, ex.StatusCode);
    }

    [Fact]
    public async Task Recuperar_CodigoIncorrecto_Rechaza_YCuentaComoIntento()
    {
        var (t, svc, _) = Crear();
        using var _t = t;
        await svc.GenerarCodigoRecuperacionAsync(TestDb.UsuarioId);

        await Assert.ThrowsAsync<AppException>(() => svc.RecuperarAsync(
            new RecuperarContrasenaRequest("admin", "AAAA-BBBB-CCCC", "Nueva2026")));

        var u = await t.Db.Usuarios.AsNoTracking().FirstAsync(x => x.IdUsuario == TestDb.UsuarioId);
        Assert.Equal(1, u.IntentosFallidos);
    }

    [Fact]
    public async Task Recuperar_SinCodigoGenerado_Rechaza()
    {
        var (t, svc, _) = Crear();
        using var _t = t;

        await Assert.ThrowsAsync<AppException>(() => svc.RecuperarAsync(
            new RecuperarContrasenaRequest("admin", "AAAA-BBBB-CCCC", "Nueva2026")));
    }

    [Fact]
    public async Task Recuperar_ClaveDebil_RechazaYNoConsumeElCodigo()
    {
        var (t, svc, _) = Crear();
        using var _t = t;
        var codigo = (await svc.GenerarCodigoRecuperacionAsync(TestDb.UsuarioId)).Codigo;

        await Assert.ThrowsAsync<AppException>(() => svc.RecuperarAsync(
            new RecuperarContrasenaRequest("admin", codigo, "corta")));

        // El código sigue sirviendo con una clave válida.
        var r = await svc.RecuperarAsync(new RecuperarContrasenaRequest("admin", codigo, "Valida2026"));
        Assert.NotNull(r.Codigo);
    }

    // ================= CLAVE TEMPORAL DEL ADMIN =================

    [Fact]
    public async Task ClaveTemporal_ObligaACambiar_YCambiarLaQuitaLaMarca()
    {
        var (t, svc, _) = Crear();
        using var _t = t;

        await svc.CambiarPasswordAsync(TestDb.UsuarioId, "Temporal99");
        var login = await svc.LoginAsync(new LoginRequest("admin", "Temporal99"));
        Assert.True(login.Usuario.DebeCambiarContrasena);

        var yo = await svc.CambiarMiContrasenaAsync(TestDb.UsuarioId,
            new CambiarMiContrasenaRequest("Temporal99", "Definitiva1"));
        Assert.False(yo.DebeCambiarContrasena);
    }

    [Fact]
    public async Task CambiarMiContrasena_ActualIncorrecta_Rechaza()
    {
        var (t, svc, _) = Crear();
        using var _t = t;

        await Assert.ThrowsAsync<AppException>(() => svc.CambiarMiContrasenaAsync(TestDb.UsuarioId,
            new CambiarMiContrasenaRequest("NoEsEsta1", "Definitiva1")));
    }

    // ================= POLITICA Y CODIGOS =================

    [Theory]
    [InlineData("corta1")]          // menos de 8
    [InlineData("solamenteletras")] // sin números
    [InlineData("1234567890")]      // sin letras
    [InlineData("admin2026x")]      // contiene el usuario
    public void Politica_RechazaClavesDebiles(string clave)
    {
        Assert.Throws<AppException>(() => PoliticaContrasena.Validar(clave, "admin"));
    }

    [Fact]
    public void Politica_AceptaClaveValida()
    {
        PoliticaContrasena.Validar("Telas2026", "admin");
    }

    [Fact]
    public void Codigo_TieneFormatoYAlfabetoSinAmbiguos()
    {
        var c = CodigoRecuperacion.Generar();

        Assert.Matches("^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$", c);
        Assert.DoesNotContain('O', c);
        Assert.DoesNotContain('I', c);
        Assert.DoesNotContain('L', c);
        Assert.Equal("K7QM3HZPW9TX", CodigoRecuperacion.Normalizar(" k7qm-3hzp w9tx "));
    }
}
