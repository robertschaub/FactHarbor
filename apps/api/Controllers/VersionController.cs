using Microsoft.AspNetCore.Mvc;
using FactHarbor.Api.Helpers;

namespace FactHarbor.Api.Controllers;

[ApiController]
[Route("version")]
public sealed class VersionController : ControllerBase
{
    [HttpGet]
    public IActionResult Get(
        [FromServices] IConfiguration cfg,
        [FromServices] IHostEnvironment env,
        [FromServices] AppBuildInfo buildInfo)
    {
        var asm = typeof(VersionController).Assembly.GetName();
        var payload = new
        {
            service = "factharbor-api",
            environment = env.EnvironmentName,
            assembly_version = asm.Version?.ToString(),
            db_provider = cfg["Db:Provider"] ?? "sqlite",
            git_sha = buildInfo.GetGitCommitHash(),
            now_utc = DateTime.UtcNow.ToString("o")
        };
        return Ok(payload);
    }
}
