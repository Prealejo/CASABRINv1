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

    public async Task<LoginResponse> LoginAsync(LoginRequest req)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.NombreUsuario == req.Usuario);
        if (usuario is null || !usuario.Activo || !_hasher.Verify(req.Contrasena, usuario.ContrasenaHash))
            throw AppException.Unauthorized("Usuario o contrasena incorrectos.");

        var (token, expira) = _tokens.GenerarToken(usuario);
        return new LoginResponse(token, expira, Map(usuario));
    }

    public async Task<List<UsuarioDto>> ListarUsuariosAsync() =>
        await _db.Usuarios.OrderBy(u => u.NombreUsuario).Select(u => Map(u)).ToListAsync();

    public async Task<UsuarioDto> CrearUsuarioAsync(CrearUsuarioRequest req)
    {
        ValidarRol(req.Rol);
        if (await _db.Usuarios.AnyAsync(u => u.NombreUsuario == req.NombreUsuario))
            throw AppException.Conflict("Ya existe un usuario con ese nombre.");

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
        usuario.ContrasenaHash = _hasher.Hash(nuevaContrasena);
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
        new(u.IdUsuario, u.NombreUsuario, u.NombreCompleto, u.Correo, u.Rol, u.Activo);
}
