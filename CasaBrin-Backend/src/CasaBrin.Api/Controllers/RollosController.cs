using CasaBrin.Api.Common;
using CasaBrin.Api.Dtos;
using CasaBrin.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CasaBrin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RollosController : ControllerBase
{
    private readonly IRolloService _rollos;
    private readonly IBarcodeService _barcode;

    public RollosController(IRolloService rollos, IBarcodeService barcode)
    {
        _rollos = rollos;
        _barcode = barcode;
    }

    // Listado con filtros (por tela, ubicacion, estado).
    [HttpGet]
    public async Task<ActionResult<List<RolloDto>>> Listar(
        [FromQuery] int? idTela, [FromQuery] int? idUbicacion, [FromQuery] string? estado)
        => Ok(await _rollos.ListarAsync(idTela, idUbicacion, estado));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RolloDto>> PorId(int id)
        => Ok(await _rollos.ObtenerPorIdAsync(id));

    // RF-06: consulta de un rollo por escaneo del codigo de barras.
    [HttpGet("codigo/{codigo}")]
    public async Task<ActionResult<RolloDto>> PorCodigo(string codigo)
        => Ok(await _rollos.ObtenerPorCodigoAsync(codigo));

    // RF-03/04/07/11: ingreso de mercaderia (crea tela y N rollos por ubicacion).
    [HttpPost("ingreso")]
    public async Task<ActionResult<IngresoResultado>> Ingreso([FromBody] IngresoMercaderiaRequest req)
        => Ok(await _rollos.IngresoAsync(req, User.GetUserId()));

    // RF-08/09: corte de metros de un rollo (devuelve valor = metros * precio).
    [HttpPost("{id:int}/cortar")]
    public async Task<ActionResult<CorteResultado>> Cortar(int id, [FromBody] CortarRequest req)
        => Ok(await _rollos.CortarAsync(id, req, User.GetUserId()));

    // RF-11: traslado entre bodega y local.
    [HttpPost("{id:int}/trasladar")]
    public async Task<ActionResult<RolloDto>> Trasladar(int id, [FromBody] TrasladarRequest req)
        => Ok(await _rollos.TrasladarAsync(id, req, User.GetUserId()));

    // Ajuste manual de inventario.
    [HttpPost("{id:int}/ajustar")]
    public async Task<ActionResult<RolloDto>> Ajustar(int id, [FromBody] AjustarRequest req)
        => Ok(await _rollos.AjustarAsync(id, req, User.GetUserId()));

    // Anulacion (baja logica).
    [HttpPost("{id:int}/anular")]
    public async Task<IActionResult> Anular(int id, [FromBody] MotivoRequest req)
    {
        await _rollos.AnularAsync(id, req.Motivo, User.GetUserId());
        return NoContent();
    }

    // RF-05: etiqueta imprimible. Devuelve el PNG del codigo de barras del rollo.
    [HttpGet("{id:int}/barcode.png")]
    public async Task<IActionResult> BarcodeRollo(int id)
    {
        var rollo = await _rollos.ObtenerPorIdAsync(id);
        var png = _barcode.GenerarPng(rollo.CodigoBarras);
        return File(png, "image/png");
    }

    // Genera el PNG de cualquier codigo (util para etiquetas web).
    [HttpGet("barcode.png")]
    public IActionResult Barcode([FromQuery] string codigo)
    {
        if (string.IsNullOrWhiteSpace(codigo))
            throw AppException.Validation("Debes indicar el codigo a generar.");
        var png = _barcode.GenerarPng(codigo);
        return File(png, "image/png");
    }
}
