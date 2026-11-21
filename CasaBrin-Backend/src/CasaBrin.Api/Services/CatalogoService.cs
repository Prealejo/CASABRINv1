using CasaBrin.Api.Common;
using CasaBrin.Api.Data;
using CasaBrin.Api.Dtos;
using CasaBrin.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace CasaBrin.Api.Services;

public interface ICatalogoService
{
    Task<List<TipoTelaDto>> ListarTiposTelaAsync();
    Task<TipoTelaDto> CrearTipoTelaAsync(CrearTipoTelaRequest req);
    Task<List<UbicacionDto>> ListarUbicacionesAsync();
    Task<List<ProveedorDto>> ListarProveedoresAsync();
    Task<ProveedorDto> CrearProveedorAsync(CrearProveedorRequest req);
}

public class CatalogoService : ICatalogoService
{
    private readonly AppDbContext _db;
    public CatalogoService(AppDbContext db) => _db = db;

    public async Task<List<TipoTelaDto>> ListarTiposTelaAsync() =>
        await _db.TiposTela.Where(t => t.Activo).OrderBy(t => t.Nombre)
            .Select(t => new TipoTelaDto(t.IdTipoTela, t.Nombre, t.Activo)).ToListAsync();

    public async Task<TipoTelaDto> CrearTipoTelaAsync(CrearTipoTelaRequest req)
    {
        var nombre = req.Nombre.Trim();
        if (await _db.TiposTela.AnyAsync(t => t.Nombre == nombre))
            throw AppException.Conflict("Ya existe un tipo de tela con ese nombre.");
        var tipo = new TipoTela { Nombre = nombre, Activo = true };
        _db.TiposTela.Add(tipo);
        await _db.SaveChangesAsync();
        return new TipoTelaDto(tipo.IdTipoTela, tipo.Nombre, tipo.Activo);
    }

    public async Task<List<UbicacionDto>> ListarUbicacionesAsync() =>
        await _db.Ubicaciones.Where(u => u.Activo).OrderBy(u => u.Nombre)
            .Select(u => new UbicacionDto(u.IdUbicacion, u.Nombre, u.Descripcion, u.Activo)).ToListAsync();

    public async Task<List<ProveedorDto>> ListarProveedoresAsync() =>
        await _db.Proveedores.Where(p => p.Activo).OrderBy(p => p.Nombre)
            .Select(p => new ProveedorDto(p.IdProveedor, p.Nombre, p.Telefono, p.Correo, p.Direccion, p.Activo))
            .ToListAsync();

    public async Task<ProveedorDto> CrearProveedorAsync(CrearProveedorRequest req)
    {
        var nombre = req.Nombre.Trim();
        if (await _db.Proveedores.AnyAsync(p => p.Nombre == nombre))
            throw AppException.Conflict("Ya existe un proveedor con ese nombre.");
        var prov = new Proveedor { Nombre = nombre, Telefono = req.Telefono, Correo = req.Correo, Direccion = req.Direccion };
        _db.Proveedores.Add(prov);
        await _db.SaveChangesAsync();
        return new ProveedorDto(prov.IdProveedor, prov.Nombre, prov.Telefono, prov.Correo, prov.Direccion, prov.Activo);
    }
}
