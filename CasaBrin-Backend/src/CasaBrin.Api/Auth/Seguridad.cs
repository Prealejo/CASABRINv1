using System.Security.Cryptography;
using CasaBrin.Api.Common;

namespace CasaBrin.Api.Auth;

/// <summary>Reglas de contrasena para claves nuevas (crear, cambiar, recuperar, temporal).</summary>
public static class PoliticaContrasena
{
    public const int LongitudMinima = 8;

    /// <summary>Lanza 400 si la contrasena no cumple: 8+ caracteres, al menos una letra y un numero.</summary>
    public static void Validar(string? contrasena, string? nombreUsuario = null)
    {
        var c = contrasena ?? string.Empty;
        if (c.Length < LongitudMinima)
            throw AppException.Validation($"La contrasena debe tener al menos {LongitudMinima} caracteres.");
        if (c.Length > 128)
            throw AppException.Validation("La contrasena es demasiado larga (maximo 128 caracteres).");
        if (!c.Any(char.IsLetter) || !c.Any(char.IsDigit))
            throw AppException.Validation("La contrasena debe combinar letras y numeros.");
        if (!string.IsNullOrWhiteSpace(nombreUsuario)
            && c.Contains(nombreUsuario.Trim(), StringComparison.OrdinalIgnoreCase))
            throw AppException.Validation("La contrasena no puede contener el nombre de usuario.");
    }
}

/// <summary>
/// Codigos de recuperacion de un solo uso (sin correo). Formato XXXX-XXXX-XXXX con un
/// alfabeto sin caracteres ambiguos (sin 0/O, 1/I/L) para dictarlos o copiarlos sin errores.
/// En la base solo se guarda su hash BCrypt.
/// </summary>
public static class CodigoRecuperacion
{
    private const string Alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

    public static string Generar()
    {
        Span<char> c = stackalloc char[12];
        for (var i = 0; i < c.Length; i++)
            c[i] = Alfabeto[RandomNumberGenerator.GetInt32(Alfabeto.Length)];
        return $"{new string(c[..4])}-{new string(c[4..8])}-{new string(c[8..])}";
    }

    /// <summary>Quita espacios y guiones y pasa a mayusculas ("k7qm 3hzp-w9tx" → "K7QM3HZPW9TX").</summary>
    public static string Normalizar(string? codigo) =>
        new((codigo ?? string.Empty).Where(char.IsLetterOrDigit).Select(char.ToUpperInvariant).ToArray());
}

/// <summary>Bloqueo temporal por intentos fallidos (login y recuperacion comparten el contador).</summary>
public static class Bloqueo
{
    public const int IntentosMaximos = 5;
    public static readonly TimeSpan Duracion = TimeSpan.FromMinutes(15);
}
