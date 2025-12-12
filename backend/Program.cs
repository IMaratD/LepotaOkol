using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using LepotaOkol.Api;

var builder = WebApplication.CreateBuilder(args);

// =========================
// 1. ЕДИНАЯ CORS-ПОЛИТИКА
// =========================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

// =========================
// База данных
// =========================
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// =========================
// Swagger
// =========================
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

// Контроллеры
builder.Services.AddControllers();

var app = builder.Build();

// =========================
// 2. CORS ДЛЯ СТАТИКИ (картинок)
// =========================
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
    }
});

// =========================
// 3. ВКЛЮЧАЕМ ЕДИНУЮ ПОЛИТИКУ CORS
// =========================
app.UseCors("AllowAll");

// Контроллеры
app.MapControllers();

// Swagger (dev only)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "LepotaOkol API v1");
    });
}

app.UseHttpsRedirection();

app.Run();

// =========================
// Контекст БД
// =========================
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    { }

    public DbSet<MyEntity> MyEntities { get; set; }
}

// Модель
public class MyEntity
{
    public int Id { get; set; }
    public string Name { get; set; }
}
