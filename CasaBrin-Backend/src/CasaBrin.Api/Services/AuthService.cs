using CasaBrin.Api.Auth;
using CasaBrin.Api.Common;
using CasaBrin.Api.Data;
using CasaBrin.Api.Dtos;
using CasaBrin.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace CasaBrin.Api.Services;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest req);
    Task<List<UsuarioDto>> ListarUsuariosAsync();
    Task<UsuarioDto> CrearUsuarioAsync(CrearUsuarioRequest req);
    Task<UsuarioDto> ActualizarUsuarioAsync(int id, ActualizarUsuarioRequest req);
    Task CambiarPasswordAsync(int id, string nuevaContrasena);
    Task DesactivarUsuarioAsync(int id);

    // Recuperacion sin correo
    Task<CodigoRecuperacionResponse> RecuperarAsync(RecuperarContrasenaRequest req);
    Task<CodigoRecuperacionResponse> GenerarCodigoRecuperacionAsync(int idUsuario);
    Task<UsuarioDto> CambiarMiContrasenaAsync(int idUsuario, CambiarMiContrasenaRequest req);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokens;
    private readonly IPasswordHasher _hasher;
    private static readonly string[] RolesValidos = { "Admin", "Operador" };

    public AuthService(AppDbContext db, ITokenService tokens, IPasswordHasher hasher)
    {
        _db = db;
        _tokens = tokens;
        _hasher = hasher;
    }

    private const string MsgCredenciales = "Usuario o contrasena incorrectos.";

    public async Task<LoginResponse> LoginAsync(LoginRequest req)
    {
        var nombre = (req.Usuario ?? string.Empty).Trim();
        if (nombre.Length == 0 || string.IsNullOrEmpty(req.Contrasena))
            throw AppException.Validation("Ingresa tu usuario y tu contrasena.");

        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.NombreUsuario == nombre);
        // Mismo mensaje si el usuario no existe: no revela que nombres son validos.
        if (usuario is null) throw AppException.Unauthorized(MsgCredenciales);

        VerificarBloqueo(usuario);

        if (!usuario.Activo)
            throw AppException.Unauthorized(MsgCredenciales);

        if (!_hasher.Verify(req.Contrasena, usuario.ContrasenaHash))
        {
            await RegistrarFallo(usuario);
            throw AppException.Unauthorized(MsgCredenciales);
        }

        await ReiniciarIntentos(usuario);
        var (token, expira) = _tokens.GenerarToken(usuario);
        return new LoginResponse(token, expira, Map(usuario));
    }

    // ------------------------------------------------------------------
    //  RECUPERACION SIN CORREO
    // ------------------------------------------------------------------

    // El usuario prueba su identidad con el codigo de un solo uso que le entrego el Admin.
    public async Task<CodigoRecuperacionResponse> RecuperarAsync(RecuperarContrasenaRequest req)
    {
        const string msg = "Usuario o codigo de recuperacion incorrectos.";
        var nombre = (req.Usuario ?? string.Empty).Trim();
        var codigo = CodigoRecuperacion.Normalizar(req.CodigoRecuperacion);
        if (nombre.Length == 0 || codigo.Length == 0)
            throw AppException.Validation("Ingresa tu usuario y tu codigo de recuperacion.");

        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.NombreUsuario == nombre);
        if (usuario is null) throw AppException.Validation(msg);

        VerificarBloqueo(usuario);

        if (!usuario.Activo || usuario.CodigoRecuperacionHash is null
            || !_hasher.Verify(codigo, usuario.CodigoRecuperacionHash))
        {
            await RegistrarFallo(usuario);
            throw AppException.Validation(msg);
        }

        PoliticaContrasena.Validar(req.NuevaContrasena, usuario.NombreUsuario);

        // Codigo consumido: se reemplaza por uno nuevo que se muestra una sola vez.
        var nuevoCodigo = CodigoRecuperacion.Generar();
        usuario.ContrasenaHash = _hasher.Hash(req.NuevaContrasena);
        usuario.CodigoRecuperacionHash = _hasher.Hash(CodigoRecuperacion.Normalizar(nuevoCodigo));
        usuario.DebeCambiarContrasena = false;
        usuario.IntentosFallidos = 0;
        usuario.BloqueadoHasta = null;
        usuario.FechaActualizacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new CodigoRecuperacionResponse(nuevoCodigo);
    }

    // El Admin genera (o regenera) el codigo de un usuario. El anterior deja de servir.
    public async Task<CodigoRecuperacionResponse> GenerarCodigoRecuperacionAsync(int idUsuario)
    {
        var usuario = await _db.Usuarios.FindAsync(idUsuario)
            ?? throw AppException.NotFound("Usuario no encontrado.");
        var codigo = CodigoRecuperacion.Generar();
        usuario.CodigoRecuperacionHash = _hasher.Hash(CodigoRecuperacion.Normalizar(codigo));
        usuario.FechaActualizacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new CodigoRecuperacionResponse(codigo);
    }

    // Cambio de la propia contrasena (obligatorio tras una clave temporal).
    public async Task<UsuarioDto> CambiarMiContrasenaAsync(int idUsuario, CambiarMiContrasenaRequest req)
    {
        var usuario = await _db.Usuarios.FindAsync(idUsuario)
            ?? throw AppException.NotFound("Usuario no encontrado.");
        if (!_hasher.Verify(req.ContrasenaActual ?? string.Empty, usuario.ContrasenaHash))
            throw AppException.Validation("La contrasena actual no es correcta.");
        if (req.NuevaContrasena == req.ContrasenaActual)
            throw AppException.Validation("La nueva contrasena debe ser distinta de la actual.");
        PoliticaContrasena.Validar(req.NuevaContrasena, usuario.NombreUsuario);

        usuario.ContrasenaHash = _hasher.Hash(req.NuevaContrasena);
        usuario.DebeCambiarContrasena = false;
        usuario.FechaActualizacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Map(usuario);
    }

    private static void VerificarBloqueo(Usuario usuario)
    {
        if (usuario.BloqueadoHasta is { } hasta && hasta > DateTime.UtcNow)
        {
            var minutos = Math.Max(1, (int)Math.Ceiling((hasta - DateTime.UtcNow).TotalMinutes));
            throw new AppException(
                $"Demasiados intentos fallidos. Por seguridad la cuenta esta bloqueada; intenta de nuevo en {minutos} min.",
                429);
        }
    }

    private async Task RegistrarFallo(Usuario usuario)
    {
        usuario.IntentosFallidos++;
        if (usuario.IntentosFallidos >= Bloqueo.IntentosMaximos)
        {
            usuario.BloqueadoHasta = DateTime.UtcNow.Add(Bloqueo.Duracion);
            usuario.IntentosFallidos = 0;
        }
        await _db.SaveChangesAsync();
    }

    private async Task ReiniciarIntentos(Usuario usuario)
    {
        if (usuario.IntentosFallidos == 0 && usuario.BloqueadoHasta is null) return;
        usuario.IntentosFallidos = 0;
        usuario.BloqueadoHasta = null;
        await _db.SaveChangesAsync();
    }

    public async Task<List<UsuarioDto>> ListarUsuariosAsync() =>
        await _db.Usuarios.OrderBy(u => u.NombreUsuario).Select(u => Map(u)).ToListAsync();

    public async Task<UsuarioDto> CrearUsuarioAsync(CrearUsuarioRequest req)
    {
        ValidarRol(req.Rol);
        if (await _db.Usuarios.AnyAsync(u => u.NombreUsuario == req.NombreUsuario))
            throw AppException.Conflict("Ya existe un usuario con ese nombre.");
        PoliticaContrasena.Validar(req.Contrasena, req.NombreUsuario);

        var usuario = new Usuario
        {
            NombreUsuario = req.NombreUsuario.Trim(),
            NombreCompleto = req.NombreCompleto.Trim(),
            Correo = req.Correo,
            ContrasenaHash = _hasher.Hash(req.Contrasena),
            Rol = req.Rol,
            Activo = true
        };
        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync();
        return Map(usuario);
    }

    public async Task<UsuarioDto> ActualizarUsuarioAsync(int id, ActualizarUsuarioRequest req)
    {
        ValidarRol(req.Rol);
        var usuario = await _db.Usuarios.FindAsync(id)
            ?? throw AppException.NotFound("Usuario no encontrado.");

        usuario.NombreCompleto = req.NombreCompleto.Trim();
        usuario.Correo = req.Correo;
        usuario.Rol = req.Rol;
        usuario.Activo = req.Activo;
        usuario.FechaActualizacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Map(usuario);
    }

    public async Task CambiarPasswordAsync(int id, string nuevaContrasena)
    {
        var usuario = await _db.Usuarios.FindAsync(id)
            ?? throw AppException.NotFound("Usuario no encontrado.");
        PoliticaContrasena.Validar(nuevaContrasena, usuario.NombreUsuario);
        // Clave asignada por el Admin = temporal: el usuario debe cambiarla al ingresar.
        usuario.ContrasenaHash = _hasher.Hash(nuevaContrasena);
        usuario.DebeCambiarContrasena = true;
        usuario.IntentosFallidos = 0;
        usuario.BloqueadoHasta = null;
        usuario.FechaActualizacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    // Se desactiva en lugar de borrar para conservar la trazabilidad de movimientos.
    public async Task DesactivarUsuarioAsync(int id)
    {
        var usuario = await _db.Usuarios.FindAsync(id)
            ?? throw AppException.NotFound("Usuario no encontrado.");
        usuario.Activo = false;
        usuario.FechaActualizacion = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private static void ValidarRol(string rol)
    {
        if (!RolesValidos.Contains(rol))
            throw AppException.Validation("El rol debe ser 'Admin' u 'Operador'.");
    }

    private static UsuarioDto Map(Usuario u) =>
        new(u.IdUsuario, u.NombreUsuario, u.NombreCompleto, u.Correo, u.Rol, u.Activo,
            u.DebeCambiarContrasena, u.CodigoRecuperacionHash != null);
}
