using Microsoft.AspNetCore.Mvc;

namespace FactHarbor.Api.Controllers;

[ApiController]
[Route("version")]
public sealed class VersionController : ControllerBase
{
    [HttpGet]
    public IActionResult Get([FromServices] IConfiguration cfg, [FromServices] IHostEnvironment env)
    {
        var asm = typeof(VersionController).Assembly.GetName();
        var payload = new
        {
            service = "factharbor-api",
            environment = env.EnvironmentName,
            assembly_version = asm.Version?.ToString(),
            db_provider = cfg["Db:Provider"] ?? "sqlite",
            now_utc = DateTime.UtcNow.ToString("o")
        };
        return Ok(payload);
    }
}
