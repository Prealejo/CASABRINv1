using CasaBrin.Api.Dtos;
using CasaBrin.Api.Entities;

namespace CasaBrin.Api.Services;

public static class Mapeos
{
    // Requiere que el Rollo tenga cargadas las navegaciones Tela y Ubicacion.
    public static RolloDto Rollo(Rollo r)
    {
        var precio = r.Tela?.PrecioMetro ?? 0m;
        return new RolloDto(
            r.IdRollo,
            r.CodigoBarras,
            r.IdTela,
            r.Tela?.Codigo ?? string.Empty,
            r.Tela?.Nombre ?? string.Empty,
            r.Tela?.Color,
            r.IdUbicacion,
            r.Ubicacion?.Nombre ?? string.Empty,
            r.MetrosIniciales,
            r.MetrosActuales,
            precio,
            Math.Round(r.MetrosActuales * precio, 2),
            r.Estado,
            r.FechaIngreso,
            r.Observacion);
    }

    public static TelaDto TelaDesdeVista(StockTelaView s, int? idProveedor, string? proveedor) =>
        new(s.IdTela, s.Codigo, s.Nombre, s.IdTipoTela, s.TipoTela, s.Color, s.Diseno,
            idProveedor, proveedor, s.PrecioMetro, s.StockMinimo, s.Activo,
            s.MetrosTotales, s.RollosDisponibles, s.MetrosBodega, s.MetrosLocal, s.BajoStock);

    public static MovimientoDto Movimiento(MovimientoDetalleView m) =>
        new(m.IdMovimiento, m.FechaMovimiento, m.TipoMovimiento, m.IdRollo, m.CodigoBarras,
            m.IdTela, m.CodigoTela, m.Tela, m.Metros, m.MetrosAntes, m.MetrosDespues,
            m.PrecioMetro, m.ValorTotal, m.UbicacionOrigen, m.UbicacionDestino, m.Usuario, m.Observacion);
}
