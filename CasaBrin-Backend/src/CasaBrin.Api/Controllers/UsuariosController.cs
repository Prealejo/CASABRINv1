using CasaBrin.Api.Dtos;
using CasaBrin.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CasaBrin.Api.Controllers;

// RF-02: gestion de usuarios. Solo el rol Admin puede administrarlos.
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsuariosController : ControllerBase
{
    private readonly IAuthService _auth;
    public UsuariosController(IAuthService auth) => _auth = auth;

    [HttpGet]
    public async Task<ActionResult<List<UsuarioDto>>> Listar()
        => Ok(await _auth.ListarUsuariosAsync());

    [HttpPost]
    public async Task<ActionResult<UsuarioDto>> Crear([FromBody] CrearUsuarioRequest req)
    {
        var creado = await _auth.CrearUsuarioAsync(req);
        return CreatedAtAction(nameof(Listar), new { id = creado.IdUsuario }, creado);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UsuarioDto>> Actualizar(int id, [FromBody] ActualizarUsuarioRequest req)
        => Ok(await _auth.ActualizarUsuarioAsync(id, req));

    [HttpPut("{id:int}/password")]
    public async Task<IActionResult> CambiarPassword(int id, [FromBody] CambiarPasswordRequest req)
    {
        await _auth.CambiarPasswordAsync(id, req.NuevaContrasena);
        return NoContent();
    }

    // Baja logica (se desactiva para conservar la trazabilidad de movimientos).
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Desactivar(int id)
    {
        await _auth.DesactivarUsuarioAsync(id);
        return NoContent();
    }
}
