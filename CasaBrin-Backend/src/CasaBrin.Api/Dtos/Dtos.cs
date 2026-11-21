using System.ComponentModel.DataAnnotations;

namespace CasaBrin.Api.Dtos;

// ---------------- Comunes ----------------
public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

// ---------------- Autenticacion (RF-01, RF-02) ----------------
public record LoginRequest(
    [Required] string Usuario,
    [Required] string Contrasena);

public record LoginResponse(string Token, DateTime ExpiraEn, UsuarioDto Usuario);

public record UsuarioDto(int IdUsuario, string NombreUsuario, string NombreCompleto,
                         string? Correo, string Rol, bool Activo);

public record CrearUsuarioRequest(
    [Required, MinLength(3)] string NombreUsuario,
    [Required] string NombreCompleto,
    string? Correo,
    [Required, MinLength(6)] string Contrasena,
    [Required] string Rol);

public record ActualizarUsuarioRequest(
    [Required] string NombreCompleto,
    string? Correo,
    [Required] string Rol,
    bool Activo);

public record CambiarPasswordRequest(
    [Required, MinLength(6)] string NuevaContrasena);

// ---------------- Catalogos ----------------
public record TipoTelaDto(int IdTipoTela, string Nombre, bool Activo);
public record CrearTipoTelaRequest([Required] string Nombre);

public record UbicacionDto(int IdUbicacion, string Nombre, string? Descripcion, bool Activo);

public record ProveedorDto(int IdProveedor, string Nombre, string? Telefono,
                           string? Correo, string? Direccion, bool Activo);
public record CrearProveedorRequest([Required] string Nombre, string? Telefono,
                                    string? Correo, string? Direccion);

// ---------------- Telas (RF-03) ----------------
public record TelaDto(int IdTela, string Codigo, string Nombre, int IdTipoTela, string TipoTela,
                      string? Color, string? Diseno, int? IdProveedor, string? Proveedor,
                      decimal PrecioMetro, decimal StockMinimo, bool Activo,
                      decimal MetrosTotales, int RollosDisponibles,
                      decimal MetrosBodega, decimal MetrosLocal, bool BajoStock);

public record CrearTelaRequest(
    [Required] string Nombre,
    [Required] int IdTipoTela,
    string? Color,
    string? Diseno,
    int? IdProveedor,
    [Range(0, double.MaxValue)] decimal PrecioMetro,
    [Range(0, double.MaxValue)] decimal StockMinimo);

public record ActualizarTelaRequest(
    [Required] string Nombre,
    [Required] int IdTipoTela,
    string? Color,
    string? Diseno,
    int? IdProveedor,
    [Range(0, double.MaxValue)] decimal PrecioMetro,
    [Range(0, double.MaxValue)] decimal StockMinimo,
    bool Activo);

public record TelaDetalleDto(TelaDto Tela, IReadOnlyList<RolloDto> Rollos);

// ---------------- Rollos (RF-04, RF-06, RF-11) ----------------
public record RolloDto(int IdRollo, string CodigoBarras, int IdTela, string TelaCodigo, string TelaNombre,
                       string? Color, int IdUbicacion, string Ubicacion,
                       decimal MetrosIniciales, decimal MetrosActuales, decimal PrecioMetro,
                       decimal ValorActual, string Estado, DateTime FechaIngreso, string? Observacion);

// Ingreso de mercaderia: crea (o usa) una tela y varios rollos a la vez (RF-07)
public record LineaIngreso(
    [Range(0.01, double.MaxValue, ErrorMessage = "Los metros deben ser mayores a 0")] decimal Metros,
    [Range(1, int.MaxValue, ErrorMessage = "La cantidad de piezas debe ser al menos 1")] int Cantidad,
    [Required] int IdUbicacion);

public record NuevaTela(
    [Required] string Nombre,
    string? Color,
    string? Diseno,
    int? IdProveedor,
    [Range(1, double.MaxValue, ErrorMessage = "El stock minimo debe ser 1 o mayor.")] decimal StockMinimo);

public record IngresoMercaderiaRequest(
    int? IdTela,
    NuevaTela? Tela,
    [Required, MinLength(1)] List<LineaIngreso> Lineas,
    string? Observacion);

public record IngresoResultado(int IdTela, string TelaNombre, IReadOnlyList<RolloDto> RollosCreados);

// Corte / salida de metros (RF-08)  -> el corazon del sistema
public record CortarRequest(
    [Range(0.01, double.MaxValue, ErrorMessage = "Los metros a cortar deben ser mayores a 0")] decimal Metros,
    string? Observacion);

public record CorteResultado(int IdRollo, string CodigoBarras, decimal MetrosAntes, decimal MetrosDespues,
                             decimal PrecioMetro, decimal ValorTotal, string Estado);

// Traslado entre bodega/local (RF-11)
public record TrasladarRequest([Required] int IdUbicacionDestino, string? Observacion);

// Ajuste manual de metros (correccion de inventario)
public record AjustarRequest(
    [Range(0, double.MaxValue)] decimal NuevosMetros,
    [Required] string Motivo);

// Motivo simple (anulacion de rollo)
public record MotivoRequest([Required] string Motivo);

// ---------------- Movimientos / Reportes (RF-12, RF-13, RF-14) ----------------
public record MovimientoDto(long IdMovimiento, DateTime Fecha, string Tipo, int IdRollo, string CodigoBarras,
                            int IdTela, string CodigoTela, string Tela, decimal Metros,
                            decimal MetrosAntes, decimal MetrosDespues, decimal PrecioMetro, decimal ValorTotal,
                            string? UbicacionOrigen, string? UbicacionDestino, string Usuario, string? Observacion);

public record AlertaStockDto(int IdTela, string Codigo, string Nombre, string TipoTela,
                             decimal StockMinimo, decimal MetrosTotales, int RollosDisponibles);

public record DashboardDto(int TotalTelas, int TotalRollosDisponibles, decimal MetrosTotales,
                           decimal MetrosBodega, decimal MetrosLocal, decimal ValorInventario,
                           int AlertasBajoStock, IReadOnlyList<MovimientoDto> UltimosMovimientos);
