using CasaBrin.Api.Common;
using CasaBrin.Api.Dtos;
using CasaBrin.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CasaBrin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    public AuthController(IAuthService auth) => _auth = auth;

    // RF-01: inicio de sesion con usuario y contrasena.
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest req)
        => Ok(await _auth.LoginAsync(req));

    // Devuelve los datos del usuario autenticado (a partir del token).
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UsuarioDto>> Me()
    {
        var id = User.GetUserId();
        var usuarios = await _auth.ListarUsuariosAsync();
        var yo = usuarios.FirstOrDefault(u => u.IdUsuario == id)
                 ?? throw AppException.NotFound("Usuario no encontrado.");
        return Ok(yo);
    }
}
