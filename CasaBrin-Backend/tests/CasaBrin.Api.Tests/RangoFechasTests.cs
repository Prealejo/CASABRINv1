using CasaBrin.Api.Services;
using Xunit;

namespace CasaBrin.Api.Tests;

public class RangoFechasTests
{
    [Fact]
    public void Hasta_SoloFecha_IncluyeTodoElDia()
    {
        var (_, hasta) = RangoFechas.Normalizar(null, new DateTime(2026, 11, 20));

        Assert.Equal(new DateTime(2026, 11, 20, 23, 59, 59).AddTicks(9_999_999), hasta);
    }

    [Fact]
    public void Desde_SoloFecha_NoSeModifica()
    {
        var (desde, _) = RangoFechas.Normalizar(new DateTime(2026, 11, 20), null);

        Assert.Equal(new DateTime(2026, 11, 20), desde);
    }

    [Fact]
    public void FechasConZona_SeConviertenAUtc()
    {
        var desdeUtc = new DateTime(2026, 11, 20, 5, 0, 0, DateTimeKind.Utc);
        var hastaLocal = new DateTime(2026, 11, 21, 4, 59, 59, DateTimeKind.Utc).ToLocalTime();

        var (desde, hasta) = RangoFechas.Normalizar(desdeUtc, hastaLocal);

        Assert.Equal(desdeUtc, desde);
        Assert.Equal(DateTimeKind.Utc, hasta!.Value.Kind);
        Assert.Equal(new DateTime(2026, 11, 21, 4, 59, 59, DateTimeKind.Utc), hasta);
    }

    [Fact]
    public void Hasta_ConHora_NoSeExtiende()
    {
        var h = new DateTime(2026, 11, 20, 15, 30, 0);
        var (_, hasta) = RangoFechas.Normalizar(null, h);

        Assert.Equal(h, hasta);
    }
}
