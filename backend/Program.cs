using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using LepotaOkol.Api;

var builder = WebApplication.CreateBuilder(args);

// Добавление контекста базы данных для PostgreSQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Добавление OpenAPI (Swagger)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "LepotaOkol API",
        Version = "v1",
        Description = "API для сервиса 'Лепота Окол'"
    });
});

// Добавление контроллера
builder.Services.AddControllers();

var allowedAngularOrigin = "http://localhost:4200";

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularDev", policy =>
    {
        policy.WithOrigins(allowedAngularOrigin)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseStaticFiles();  // Позволяет серверу раздавать статические файлы, например, изображения

app.UseCors("AllowAngularDev");

app.MapControllers();

// Настройка пайплайна HTTP-запросов
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "LepotaOkol API v1");
    });
}

app.UseHttpsRedirection();

var summaries = new[] { "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching" };

app.MapGet("/weatherforecast", () =>
{
    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast(
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

app.Run();

// Контекст базы данных
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    { }

    public DbSet<MyEntity> MyEntities { get; set; }
}

// Модель для хранения данных в базе
public class MyEntity
{
    public int Id { get; set; }
    public string Name { get; set; }
}

// Прогноз погоды
record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
