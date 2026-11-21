using CasaBrin.Api.Dtos;
using CasaBrin.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CasaBrin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportesController : ControllerBase
{
    private readonly IReporteService _reportes;
    public ReportesController(IReporteService reportes) => _reportes = reportes;

    // RF-12: panel general del inventario.
    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardDto>> Dashboard()
        => Ok(await _reportes.DashboardAsync());

    // RF-13: telas con stock por debajo del minimo.
    [HttpGet("alertas")]
    public async Task<ActionResult<List<AlertaStockDto>>> Alertas()
        => Ok(await _reportes.ListarAlertasAsync());

    // RF-14: historial de movimientos (entradas, salidas, traslados, ajustes).
    [HttpGet("movimientos")]
    public async Task<ActionResult<PagedResult<MovimientoDto>>> Movimientos(
        [FromQuery] string? tipo,
        [FromQuery] int? idTela,
        [FromQuery] int? idRollo,
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? orden = null)
        => Ok(await _reportes.ListarMovimientosAsync(tipo, idTela, idRollo, desde, hasta, page, pageSize,
            ascendente: string.Equals(orden, "asc", StringComparison.OrdinalIgnoreCase)));

    // Resumen del reporte: cantidad y metros por tipo de movimiento (mismos filtros).
    [HttpGet("movimientos/resumen")]
    public async Task<ActionResult<ResumenMovimientosDto>> Resumen(
        [FromQuery] string? tipo,
        [FromQuery] int? idTela,
        [FromQuery] int? idRollo,
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta)
        => Ok(await _reportes.ResumenMovimientosAsync(tipo, idTela, idRollo, desde, hasta));
}
