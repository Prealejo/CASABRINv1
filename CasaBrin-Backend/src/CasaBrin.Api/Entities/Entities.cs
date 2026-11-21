namespace CasaBrin.Api.Entities;

// ---------------------------------------------------------------------
//  ENTIDADES (tablas)
// ---------------------------------------------------------------------

public class Usuario
{
    public int IdUsuario { get; set; }
    public string NombreUsuario { get; set; } = string.Empty;
    public string NombreCompleto { get; set; } = string.Empty;
    public string? Correo { get; set; }
    public string ContrasenaHash { get; set; } = string.Empty;
    public string Rol { get; set; } = "Operador";           // Admin | Operador
    public bool Activo { get; set; } = true;
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaActualizacion { get; set; }

    // --- Seguridad de acceso y recuperacion sin correo ---
    public string? CodigoRecuperacionHash { get; set; }      // hash BCrypt del codigo de un solo uso
    public bool DebeCambiarContrasena { get; set; }          // true tras una clave temporal del Admin
    public int IntentosFallidos { get; set; }                // intentos fallidos consecutivos
    public DateTime? BloqueadoHasta { get; set; }            // bloqueo temporal (UTC)
}

public class Proveedor
{
    public int IdProveedor { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public string? Direccion { get; set; }
    public bool Activo { get; set; } = true;
}

public class Ubicacion
{
    public int IdUbicacion { get; set; }
    public string Nombre { get; set; } = string.Empty;       // Bodega | Local
    public string? Descripcion { get; set; }
    public bool Activo { get; set; } = true;
}

public class TipoTela
{
    public int IdTipoTela { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;
}

public class Tela
{
    public int IdTela { get; set; }
    public string Codigo { get; set; } = string.Empty;       // calculado en BD (TEL000001)
    public string Nombre { get; set; } = string.Empty;
    public int IdTipoTela { get; set; }
    public string? Color { get; set; }
    public string? CodigoColor { get; set; }                  // codigo de color del proveedor (p. ej. "AZ-210")
    public string? Diseno { get; set; }
    public int? IdProveedor { get; set; }
    public decimal PrecioMetro { get; set; }
    public decimal StockMinimo { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaActualizacion { get; set; }

    public TipoTela? TipoTela { get; set; }
    public Proveedor? Proveedor { get; set; }
    public ICollection<Rollo> Rollos { get; set; } = new List<Rollo>();
}

public class Rollo
{
    public int IdRollo { get; set; }
    public string CodigoBarras { get; set; } = string.Empty; // calculado en BD (CB00000001)
    public int IdTela { get; set; }
    public int IdUbicacion { get; set; }
    public decimal MetrosIniciales { get; set; }
    public decimal MetrosActuales { get; set; }
    public string Estado { get; set; } = "Disponible";       // Disponible | Agotado | Anulado
    public string? Observacion { get; set; }
    public DateTime FechaIngreso { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>(); // concurrencia optimista

    public Tela? Tela { get; set; }
    public Ubicacion? Ubicacion { get; set; }
}

public class Movimiento
{
    public long IdMovimiento { get; set; }
    public int IdRollo { get; set; }
    public int IdTela { get; set; }
    public string TipoMovimiento { get; set; } = string.Empty; // Ingreso|Salida|Traslado|Ajuste|Anulacion
    public decimal Metros { get; set; }
    public decimal MetrosAntes { get; set; }
    public decimal MetrosDespues { get; set; }
    public int? IdUbicacionOrigen { get; set; }
    public int? IdUbicacionDestino { get; set; }
    public decimal PrecioMetro { get; set; }
    public decimal ValorTotal { get; set; }
    public int IdUsuario { get; set; }
    public string? Observacion { get; set; }
    public DateTime FechaMovimiento { get; set; }

    public Rollo? Rollo { get; set; }
    public Tela? Tela { get; set; }
    public Usuario? Usuario { get; set; }
}

// ---------------------------------------------------------------------
//  ENTIDADES SIN CLAVE (mapean vistas de SQL Server)
// ---------------------------------------------------------------------

public class StockTelaView
{
    public int IdTela { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public int IdTipoTela { get; set; }
    public string TipoTela { get; set; } = string.Empty;
    public string? Color { get; set; }
    public string? Diseno { get; set; }
    public decimal PrecioMetro { get; set; }
    public decimal StockMinimo { get; set; }
    public bool Activo { get; set; }
    public decimal MetrosTotales { get; set; }
    public int RollosDisponibles { get; set; }
    public decimal MetrosBodega { get; set; }
    public decimal MetrosLocal { get; set; }
    public bool BajoStock { get; set; }
}

public class MovimientoDetalleView
{
    public long IdMovimiento { get; set; }
    public DateTime FechaMovimiento { get; set; }
    public string TipoMovimiento { get; set; } = string.Empty;
    public int IdRollo { get; set; }
    public string CodigoBarras { get; set; } = string.Empty;
    public int IdTela { get; set; }
    public string CodigoTela { get; set; } = string.Empty;
    public string Tela { get; set; } = string.Empty;
    public decimal Metros { get; set; }
    public decimal MetrosAntes { get; set; }
    public decimal MetrosDespues { get; set; }
    public decimal PrecioMetro { get; set; }
    public decimal ValorTotal { get; set; }
    public int? IdUbicacionOrigen { get; set; }
    public string? UbicacionOrigen { get; set; }
    public int? IdUbicacionDestino { get; set; }
    public string? UbicacionDestino { get; set; }
    public int IdUsuario { get; set; }
    public string NombreUsuario { get; set; } = string.Empty;
    public string Usuario { get; set; } = string.Empty;
    public string? Observacion { get; set; }
}
