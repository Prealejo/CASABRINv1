using CasaBrin.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace CasaBrin.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Proveedor> Proveedores => Set<Proveedor>();
    public DbSet<Ubicacion> Ubicaciones => Set<Ubicacion>();
    public DbSet<TipoTela> TiposTela => Set<TipoTela>();
    public DbSet<Tela> Telas => Set<Tela>();
    public DbSet<Rollo> Rollos => Set<Rollo>();
    public DbSet<Movimiento> Movimientos => Set<Movimiento>();

    // Vistas (solo lectura)
    public DbSet<StockTelaView> StockTela => Set<StockTelaView>();
    public DbSet<MovimientoDetalleView> MovimientosDetalle => Set<MovimientoDetalleView>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // En SQL Server, Codigo y CodigoBarras son columnas calculadas (PERSISTED) creadas
        // por el script de base de datos. En SQLite (pruebas) se tratan como columnas normales
        // para poder asignarles valor y que EnsureCreated funcione.
        var esSqlServer = Database.IsSqlServer();

        // ---------- Usuarios ----------
        b.Entity<Usuario>(e =>
        {
            e.ToTable("Usuarios");
            e.HasKey(x => x.IdUsuario);
            e.Property(x => x.NombreUsuario).HasMaxLength(60);
            e.Property(x => x.CodigoRecuperacionHash).HasMaxLength(100);
            e.HasIndex(x => x.NombreUsuario).IsUnique();
        });

        // ---------- Proveedores ----------
        b.Entity<Proveedor>(e =>
        {
            e.ToTable("Proveedores");
            e.HasKey(x => x.IdProveedor);
            e.HasIndex(x => x.Nombre).IsUnique();
        });

        // ---------- Ubicaciones ----------
        b.Entity<Ubicacion>(e =>
        {
            e.ToTable("Ubicaciones");
            e.HasKey(x => x.IdUbicacion);
            e.HasIndex(x => x.Nombre).IsUnique();
        });

        // ---------- TiposTela ----------
        b.Entity<TipoTela>(e =>
        {
            e.ToTable("TiposTela");
            e.HasKey(x => x.IdTipoTela);
            e.HasIndex(x => x.Nombre).IsUnique();
        });

        // ---------- Telas ----------
        b.Entity<Tela>(e =>
        {
            e.ToTable("Telas");
            e.HasKey(x => x.IdTela);
            // Codigo es columna calculada en BD: no se inserta ni actualiza
            if (esSqlServer)
                e.Property(x => x.Codigo).HasComputedColumnSql(null, stored: true).ValueGeneratedOnAddOrUpdate();
            else
                e.Property(x => x.Codigo).HasMaxLength(20);
            e.Property(x => x.PrecioMetro).HasPrecision(12, 2);
            e.Property(x => x.StockMinimo).HasPrecision(12, 2);
            e.Property(x => x.CodigoColor).HasMaxLength(30);
            e.HasOne(x => x.TipoTela).WithMany().HasForeignKey(x => x.IdTipoTela);
            e.HasOne(x => x.Proveedor).WithMany().HasForeignKey(x => x.IdProveedor);
        });

        // ---------- Rollos ----------
        b.Entity<Rollo>(e =>
        {
            e.ToTable("Rollos");
            e.HasKey(x => x.IdRollo);
            if (esSqlServer)
                e.Property(x => x.CodigoBarras).HasComputedColumnSql(null, stored: true).ValueGeneratedOnAddOrUpdate();
            else
                e.Property(x => x.CodigoBarras).HasMaxLength(20);
            e.Property(x => x.MetrosIniciales).HasPrecision(12, 2);
            e.Property(x => x.MetrosActuales).HasPrecision(12, 2);
            if (esSqlServer)
                e.Property(x => x.RowVersion).IsRowVersion();   // concurrencia optimista
            else
                e.Property(x => x.RowVersion).IsConcurrencyToken(false).ValueGeneratedNever();
            e.HasOne(x => x.Tela).WithMany(t => t.Rollos).HasForeignKey(x => x.IdTela);
            e.HasOne(x => x.Ubicacion).WithMany().HasForeignKey(x => x.IdUbicacion);
        });

        // ---------- Movimientos ----------
        b.Entity<Movimiento>(e =>
        {
            e.ToTable("Movimientos");
            e.HasKey(x => x.IdMovimiento);
            e.Property(x => x.Metros).HasPrecision(12, 2);
            e.Property(x => x.MetrosAntes).HasPrecision(12, 2);
            e.Property(x => x.MetrosDespues).HasPrecision(12, 2);
            e.Property(x => x.PrecioMetro).HasPrecision(12, 2);
            e.Property(x => x.ValorTotal).HasPrecision(14, 2);
            e.HasOne(x => x.Rollo).WithMany().HasForeignKey(x => x.IdRollo);
            e.HasOne(x => x.Tela).WithMany().HasForeignKey(x => x.IdTela);
            e.HasOne(x => x.Usuario).WithMany().HasForeignKey(x => x.IdUsuario);
        });

        // ---------- Vistas ----------
        b.Entity<StockTelaView>(e =>
        {
            e.HasNoKey();
            e.ToView("vw_StockTela");
        });
        b.Entity<MovimientoDetalleView>(e =>
        {
            e.HasNoKey();
            e.ToView("vw_MovimientosDetalle");
        });
    }
}
