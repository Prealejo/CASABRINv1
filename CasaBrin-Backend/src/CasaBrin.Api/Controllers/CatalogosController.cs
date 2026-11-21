using CasaBrin.Api.Dtos;
using CasaBrin.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CasaBrin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CatalogosController : ControllerBase
{
    private readonly ICatalogoService _catalogo;
    public CatalogosController(ICatalogoService catalogo) => _catalogo = catalogo;

    [HttpGet("tipos-tela")]
    public async Task<ActionResult<List<TipoTelaDto>>> TiposTela()
        => Ok(await _catalogo.ListarTiposTelaAsync());

    [HttpPost("tipos-tela")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<TipoTelaDto>> CrearTipoTela([FromBody] CrearTipoTelaRequest req)
        => Ok(await _catalogo.CrearTipoTelaAsync(req));

    [HttpGet("ubicaciones")]
    public async Task<ActionResult<List<UbicacionDto>>> Ubicaciones()
        => Ok(await _catalogo.ListarUbicacionesAsync());

    [HttpGet("proveedores")]
    public async Task<ActionResult<List<ProveedorDto>>> Proveedores()
        => Ok(await _catalogo.ListarProveedoresAsync());

    [HttpPost("proveedores")]
    public async Task<ActionResult<ProveedorDto>> CrearProveedor([FromBody] CrearProveedorRequest req)
        => Ok(await _catalogo.CrearProveedorAsync(req));
}
