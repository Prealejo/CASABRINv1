using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace CasaBrin.Api.Common;

/// <summary>Excepcion de negocio que se traduce a un codigo HTTP.</summary>
public class AppException : Exception
{
    public int StatusCode { get; }
    public AppException(string message, int statusCode = 400) : base(message) => StatusCode = statusCode;

    public static AppException NotFound(string msg) => new(msg, 404);
    public static AppException Validation(string msg) => new(msg, 400);
    public static AppException Conflict(string msg) => new(msg, 409);
    public static AppException Unauthorized(string msg) => new(msg, 401);
}

/// <summary>Convierte excepciones en respuestas JSON uniformes (ProblemDetails).</summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await _next(ctx);
        }
        catch (AppException ex)
        {
            await Write(ctx, ex.StatusCode, ex.Message);
        }
        catch (DbUpdateConcurrencyException)
        {
            await Write(ctx, 409, "El registro fue modificado por otro usuario. Vuelve a intentarlo.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error no controlado");
            // Exponemos el mensaje real para diagnosticar (app local / de tesis).
            var detalle = ex.InnerException?.Message ?? ex.Message;
            await Write(ctx, 500, $"Error del servidor: {detalle}");
        }
    }

    private static async Task Write(HttpContext ctx, int status, string detail)
    {
        if (ctx.Response.HasStarted) return;
        ctx.Response.Clear();
        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = "application/json";
        var payload = JsonSerializer.Serialize(new { status, detail });
        await ctx.Response.WriteAsync(payload);
    }
}

public static class ClaimsExtensions
{
    public static int GetUserId(this ClaimsPrincipal user)
    {
        var id = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(id, out var value)
            ? value
            : throw AppException.Unauthorized("Token invalido: falta el identificador de usuario.");
    }
}
