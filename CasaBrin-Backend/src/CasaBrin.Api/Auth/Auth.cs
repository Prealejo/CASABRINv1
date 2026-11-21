using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CasaBrin.Api.Entities;
using Microsoft.IdentityModel.Tokens;

namespace CasaBrin.Api.Auth;

public class JwtSettings
{
    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpiraEnMinutos { get; set; } = 480;
}

public interface ITokenService
{
    (string token, DateTime expira) GenerarToken(Usuario usuario);
}

public class TokenService : ITokenService
{
    private readonly JwtSettings _jwt;
    public TokenService(JwtSettings jwt) => _jwt = jwt;

    public (string token, DateTime expira) GenerarToken(Usuario usuario)
    {
        var expira = DateTime.UtcNow.AddMinutes(_jwt.ExpiraEnMinutos);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, usuario.IdUsuario.ToString()),
            new Claim(ClaimTypes.Name, usuario.NombreUsuario),
            new Claim(ClaimTypes.Role, usuario.Rol),
            new Claim("nombre", usuario.NombreCompleto)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var jwt = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: expira,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(jwt), expira);
    }
}

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string hash);
}

public class PasswordHasher : IPasswordHasher
{
    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 11);
    public bool Verify(string password, string hash) => BCrypt.Net.BCrypt.Verify(password, hash);
}
