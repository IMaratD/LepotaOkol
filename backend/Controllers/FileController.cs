using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;
using System.IO;
using System.Threading.Tasks;

namespace LepotaOkol.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FileController : ControllerBase
    {
        private readonly string _uploadPath;

        public FileController(IConfiguration configuration)
        {
            _uploadPath = configuration.GetValue<string>("FileStorage:UploadPath");
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadFile(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var fileDirectory = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", _uploadPath);
            if (!Directory.Exists(fileDirectory))
            {
                Directory.CreateDirectory(fileDirectory);
            }

            // Генерируем имя файла
            var fileNameWithoutExt = Path.GetFileNameWithoutExtension(file.FileName);
            var webpFileName = $"{fileNameWithoutExt}.webp";
            var webpFilePath = Path.Combine(fileDirectory, webpFileName);

            // Читаем файл в ImageSharp
            using (var image = await Image.LoadAsync(file.OpenReadStream()))
            {
                // Опционально: изменить размер (если нужно)
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Mode = ResizeMode.Max,
                    Size = new Size(800, 800) // Макс. размер 800x800
                }));

                // Сохранение в WebP формате
                await image.SaveAsync(webpFilePath, new WebpEncoder { Quality = 80 });
            }

            return Ok(new { FilePath = $"/uploads/{webpFileName}" });
        }

        [HttpGet("convert/{format}")]
        public async Task<IActionResult> ConvertWebP(string format, string fileName)
        {
            var fileDirectory = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", _uploadPath);
            var webpFilePath = Path.Combine(fileDirectory, fileName);

            if (!System.IO.File.Exists(webpFilePath))
                return NotFound("File not found");

            var outputFileName = Path.GetFileNameWithoutExtension(fileName) + "." + format;
            var outputFilePath = Path.Combine(fileDirectory, outputFileName);

            using (var image = await Image.LoadAsync(webpFilePath))
            {
                if (format == "jpg")
                {
                    await image.SaveAsJpegAsync(outputFilePath);
                }
                else if (format == "png")
                {
                    await image.SaveAsPngAsync(outputFilePath);
                }
                else
                {
                    return BadRequest("Unsupported format");
                }
            }

            return Ok(new { FilePath = $"/uploads/{outputFileName}" });
        }
    }
}
