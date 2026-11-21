using CasaBrin.Api.Data;
using CasaBrin.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace CasaBrin.Api.Services;

public interface IReporteService
{
    Task<DashboardDto> DashboardAsync();
    Task<List<AlertaStockDto>> ListarAlertasAsync();
    Task<PagedResult<MovimientoDto>> ListarMovimientosAsync(
        string? tipo, int? idTela, int? idRollo, DateTime? desde, DateTime? hasta, int page, int pageSize);
}

public class ReporteService : IReporteService
{
    private readonly AppDbContext _db;
    public ReporteService(AppDbContext db) => _db = db;

    // Dashboard general (RF-12): totales, valor del inventario y ultimos movimientos.
    public async Task<DashboardDto> DashboardAsync()
    {
        var stock = await _db.StockTela.Where(s => s.Activo).ToListAsync();

        var totalTelas = stock.Count;
        var metrosTotales = stock.Sum(s => s.MetrosTotales);
        var metrosBodega = stock.Sum(s => s.MetrosBodega);
        var metrosLocal = stock.Sum(s => s.MetrosLocal);
        var valorInventario = stock.Sum(s => Math.Round(s.MetrosTotales * s.PrecioMetro, 2));
        var alertas = stock.Count(s => s.BajoStock);

        var totalRollos = await _db.Rollos.CountAsync(r => r.Estado == "Disponible");

        var ultimos = await _db.MovimientosDetalle
            .OrderByDescending(m => m.FechaMovimiento).ThenByDescending(m => m.IdMovimiento)
            .Take(10)
            .ToListAsync();

        return new DashboardDto(
            totalTelas, totalRollos, metrosTotales, metrosBodega, metrosLocal,
            valorInventario, alertas, ultimos.Select(Mapeos.Movimiento).ToList());
    }

    // Alertas de stock bajo (RF-13).
    public async Task<List<AlertaStockDto>> ListarAlertasAsync()
    {
        var bajos = await _db.StockTela
            .Where(s => s.Activo && s.BajoStock)
            .OrderBy(s => s.Nombre)
            .ToListAsync();

        return bajos.Select(s => new AlertaStockDto(
            s.IdTela, s.Codigo, s.Nombre, s.TipoTela,
            s.StockMinimo, s.MetrosTotales, s.RollosDisponibles)).ToList();
    }

    // Historial de movimientos con filtros y paginacion (RF-14).
    public async Task<PagedResult<MovimientoDto>> ListarMovimientosAsync(
        string? tipo, int? idTela, int? idRollo, DateTime? desde, DateTime? hasta, int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var q = _db.MovimientosDetalle.AsQueryable();
        if (!string.IsNullOrWhiteSpace(tipo)) q = q.Where(m => m.TipoMovimiento == tipo);
        if (idTela is not null) q = q.Where(m => m.IdTela == idTela);
        if (idRollo is not null) q = q.Where(m => m.IdRollo == idRollo);
        if (desde is not null) q = q.Where(m => m.FechaMovimiento >= desde);
        if (hasta is not null) q = q.Where(m => m.FechaMovimiento <= hasta);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(m => m.FechaMovimiento).ThenByDescending(m => m.IdMovimiento)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return new PagedResult<MovimientoDto>(
            items.Select(Mapeos.Movimiento).ToList(), total, page, pageSize);
    }
}
