using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using ZXing;
using ZXing.Common;

namespace CasaBrin.Api.Services;

public interface IBarcodeService
{
    /// <summary>Genera un PNG con el codigo de barras (Code128) del texto dado.</summary>
    byte[] GenerarPng(string codigo, int ancho = 500, int alto = 180);
}

public class BarcodeService : IBarcodeService
{
    public byte[] GenerarPng(string codigo, int ancho = 500, int alto = 180)
    {
        if (string.IsNullOrWhiteSpace(codigo))
            throw new ArgumentException("El codigo no puede estar vacio.", nameof(codigo));

        var writer = new BarcodeWriterPixelData
        {
            Format = BarcodeFormat.CODE_128,
            Options = new EncodingOptions
            {
                Width = ancho,
                Height = alto,
                Margin = 10,
                PureBarcode = false // incluye el texto legible debajo del codigo
            }
        };

        var pixelData = writer.Write(codigo.Trim().ToUpperInvariant());

        // ZXing entrega BGRA; ImageSharp lee Bgra32 y exporta PNG.
        using var image = Image.LoadPixelData<Bgra32>(pixelData.Pixels, pixelData.Width, pixelData.Height);
        using var ms = new MemoryStream();
        image.SaveAsPng(ms);
        return ms.ToArray();
    }
}
