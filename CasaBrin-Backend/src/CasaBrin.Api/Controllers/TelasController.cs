using CasaBrin.Api.Dtos;
using CasaBrin.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CasaBrin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TelasController : ControllerBase
{
    private readonly ITelaService _telas;
    public TelasController(ITelaService telas) => _telas = telas;

    // RF-10: busqueda por nombre, codigo, tipo o color.
    [HttpGet]
    public async Task<ActionResult<List<TelaDto>>> Listar(
        [FromQuery] string? buscar, [FromQuery] bool incluirInactivas = false)
        => Ok(await _telas.ListarAsync(buscar, incluirInactivas));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TelaDetalleDto>> Detalle(int id)
        => Ok(await _telas.ObtenerDetalleAsync(id));

    // RF-03: registro de productos textiles.
    [HttpPost]
    public async Task<ActionResult<TelaDto>> Crear([FromBody] CrearTelaRequest req)
    {
        var creada = await _telas.CrearAsync(req);
        return CreatedAtAction(nameof(Detalle), new { id = creada.IdTela }, creada);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TelaDto>> Actualizar(int id, [FromBody] ActualizarTelaRequest req)
        => Ok(await _telas.ActualizarAsync(id, req));

    // Ficha de la tela (codigo de color, proveedor, etc.) editable desde Inventario.
    [HttpPut("{id:int}/ficha")]
    public async Task<IActionResult> ActualizarFicha(int id, [FromBody] ActualizarFichaTelaRequest req)
    {
        await _telas.ActualizarFichaAsync(id, req);
        return NoContent();
    }
}
