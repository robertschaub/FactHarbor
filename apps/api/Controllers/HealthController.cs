using FactHarbor.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FactHarbor.Api.Controllers;

[ApiController]
[Route("health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromServices] IConfiguration cfg, [FromServices] FhDbContext db)
    {
        bool dbOk;
        string? dbError = null;
        try { dbOk = await db.Database.CanConnectAsync(); }
        catch (Exception ex) { dbOk = false; dbError = ex.Message; }

        var ok = dbOk;
        return ok
            ? Ok(new { ok = true, db = new { can_connect = dbOk, error = dbError }, now_utc = DateTime.UtcNow.ToString("o") })
            : StatusCode(503, new { ok = false, db = new { can_connect = dbOk, error = dbError }, now_utc = DateTime.UtcNow.ToString("o") });
    }
}
