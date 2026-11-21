using CasaBrin.Api.Common;
using CasaBrin.Api.Dtos;
using CasaBrin.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

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
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest req)
        => Ok(await _auth.LoginAsync(req));

    // Recuperacion sin correo: usuario + codigo de un solo uso -> nueva contrasena.
    // Devuelve el NUEVO codigo de recuperacion (se muestra una sola vez).
    [HttpPost("recuperar")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<CodigoRecuperacionResponse>> Recuperar([FromBody] RecuperarContrasenaRequest req)
        => Ok(await _auth.RecuperarAsync(req));

    // Cambio de la propia contrasena (obligatorio despues de una clave temporal).
    [HttpPost("cambiar-contrasena")]
    [Authorize]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<UsuarioDto>> CambiarMiContrasena([FromBody] CambiarMiContrasenaRequest req)
        => Ok(await _auth.CambiarMiContrasenaAsync(User.GetUserId(), req));

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
