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
        // Pad to equal length to prevent timing leak on length mismatch
        var maxLen = Math.Max(expectedBytes.Length, gotBytes.Length);
        var ePadded = new byte[maxLen];
        var gPadded = new byte[maxLen];
        expectedBytes.CopyTo(ePadded, 0);
        gotBytes.CopyTo(gPadded, 0);
        return CryptographicOperations.FixedTimeEquals(ePadded, gPadded)
            && expectedBytes.Length == gotBytes.Length;
    }
}
