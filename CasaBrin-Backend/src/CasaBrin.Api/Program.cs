using System.Text;
using CasaBrin.Api.Auth;
using CasaBrin.Api.Common;
using CasaBrin.Api.Data;
using CasaBrin.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------
//  Base de datos (EF Core + SQL Server)
// ---------------------------------------------------------------------
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ---------------------------------------------------------------------
//  Configuracion y servicios de aplicacion
// ---------------------------------------------------------------------
var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
                  ?? throw new InvalidOperationException("Falta la seccion 'Jwt' en la configuracion.");
builder.Services.AddSingleton(jwtSettings);

builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddSingleton<IPasswordHasher, PasswordHasher>();
builder.Services.AddSingleton<IBarcodeService, BarcodeService>();

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICatalogoService, CatalogoService>();
builder.Services.AddScoped<ITelaService, TelaService>();
builder.Services.AddScoped<IRolloService, RolloService>();
builder.Services.AddScoped<IReporteService, ReporteService>();

// ---------------------------------------------------------------------
//  Autenticacion JWT (RF-01, RNF-06)
// ---------------------------------------------------------------------
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization();

// ---------------------------------------------------------------------
//  CORS (RF-15: web + movil consumen la misma API)
// ---------------------------------------------------------------------
var origenes = builder.Configuration.GetSection("Cors:OrigenesPermitidos").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(o => o.AddPolicy("CasaBrinCors", p =>
{
    if (origenes.Length > 0)
        p.WithOrigins(origenes).AllowAnyHeader().AllowAnyMethod();
    else
        p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
}));

// ---------------------------------------------------------------------
//  Controllers + Swagger (con soporte de token Bearer)
// ---------------------------------------------------------------------
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Casa Brin - API de Inventario", Version = "v1" });
    var scheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Pega aqui el token JWT (sin la palabra 'Bearer').",
        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
    };
    c.AddSecurityDefinition("Bearer", scheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement { [scheme] = Array.Empty<string>() });
});

var app = builder.Build();

// ---------------------------------------------------------------------
//  Pipeline HTTP
// ---------------------------------------------------------------------
app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("CasaBrinCors");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Endpoint de salud simple.
app.MapGet("/", () => Results.Ok(new { servicio = "Casa Brin API", estado = "ok" }));

app.Run();

// Necesario para las pruebas de integracion (WebApplicationFactory).
public partial class Program { }
