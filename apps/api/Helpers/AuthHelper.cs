using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace FactHarbor.Api.Helpers;

public static class AuthHelper
{
    public static bool IsAdminKeyValid(HttpRequest request)
    {
        var cfg = request.HttpContext.RequestServices.GetService(typeof(IConfiguration)) as IConfiguration;
        var expected = cfg?["Admin:Key"];
        var got = request.Headers["X-Admin-Key"].ToString();

        if (string.IsNullOrWhiteSpace(expected) || string.IsNullOrWhiteSpace(got))
            return false;

        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var gotBytes = Encoding.UTF8.GetBytes(got);
        return CryptographicOperations.FixedTimeEquals(expectedBytes, gotBytes);
    }
}
