using CasaBrin.Api.Data;
using CasaBrin.Api.Entities;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace CasaBrin.Api.Tests;

/// <summary>
/// Crea un AppDbContext respaldado por SQLite en memoria. La conexion se
/// mantiene abierta mientras viva el objeto para no perder los datos.
/// </summary>
public sealed class TestDb : IDisposable
{
    private readonly SqliteConnection _conn;
    public AppDbContext Db { get; }

    // Ids sembrados de referencia
    public const int UsuarioId = 1;
    public const int BodegaId = 1;
    public const int LocalId = 2;
    public const int TipoTelaId = 1;

    public TestDb(decimal precioMetro = 5m, decimal stockMinimo = 0m)
    {
        _conn = new SqliteConnection("DataSource=:memory:");
        _conn.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_conn)
            .Options;

        Db = new AppDbContext(options);
        Db.Database.EnsureCreated();

        Sembrar(precioMetro, stockMinimo);
    }

    private void Sembrar(decimal precioMetro, decimal stockMinimo)
    {
        Db.Usuarios.Add(new Usuario
        {
            IdUsuario = UsuarioId,
            NombreUsuario = "admin",
            NombreCompleto = "Administrador",
            ContrasenaHash = "x",
            Rol = "Admin",
            Activo = true,
            FechaCreacion = DateTime.UtcNow
        });
        Db.Ubicaciones.Add(new Ubicacion { IdUbicacion = BodegaId, Nombre = "Bodega", Activo = true });
        Db.Ubicaciones.Add(new Ubicacion { IdUbicacion = LocalId, Nombre = "Local", Activo = true });
        Db.TiposTela.Add(new TipoTela { IdTipoTela = TipoTelaId, Nombre = "Algodon", Activo = true });
        Db.Telas.Add(new Tela
        {
            IdTela = 1,
            Codigo = "TEL000001",
            Nombre = "Algodon Blanco",
            IdTipoTela = TipoTelaId,
            Color = "Blanco",
            PrecioMetro = precioMetro,
            StockMinimo = stockMinimo,
            Activo = true,
            FechaCreacion = DateTime.UtcNow
        });
        Db.SaveChanges();
    }

    /// <summary>Crea un rollo disponible con los metros indicados y devuelve su Id.</summary>
    public int CrearRollo(decimal metros, int idUbicacion = BodegaId, int idTela = 1)
    {
        var rollo = new Rollo
        {
            IdTela = idTela,
            IdUbicacion = idUbicacion,
            CodigoBarras = $"CB{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}",
            MetrosIniciales = metros,
            MetrosActuales = metros,
            Estado = "Disponible",
            FechaIngreso = DateTime.UtcNow
        };
        Db.Rollos.Add(rollo);
        Db.SaveChanges();
        Db.Entry(rollo).State = EntityState.Detached;
        return rollo.IdRollo;
    }

    public void Dispose()
    {
        Db.Dispose();
        _conn.Dispose();
    }
}
