namespace FactHarbor.Api.Helpers;

public static class AnalyzeInputValidator
{
    public static (bool valid, string? error) Validate(string inputType, string inputValue, string? pipelineVariant = null)
    {
        if (inputType != "url" && inputType != "text")
            return (false, "Invalid inputType: must be 'url' or 'text'");

        var validPipelines = new[] { "claimboundary" };
        if (pipelineVariant != null && !validPipelines.Contains(pipelineVariant))
            return (false, $"Invalid pipelineVariant: must be one of {string.Join(", ", validPipelines.Select(p => $"'{p}'"))}");

        if (string.IsNullOrWhiteSpace(inputValue))
            return (false, "Input cannot be empty");

        const int maxTextChars = 32_000;
        const int maxUrlChars = 2_000;
        var maxChars = inputType == "url" ? maxUrlChars : maxTextChars;
        if (inputValue.Length > maxChars)
            return (false, $"Input too long: max {maxChars} characters allowed for {inputType} input");

        if (inputType == "url")
        {
            var url = inputValue.Trim();
            if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                return (false, "URL must use http or https scheme");
        }

        var nonSpaceLen = inputValue.Count(c => !char.IsWhiteSpace(c));
        if (nonSpaceLen > 0)
        {
            var controlCount = inputValue.Count(c => char.IsControl(c) && c != '\r' && c != '\n' && c != '\t');
            if ((double)controlCount / nonSpaceLen > 0.05)
                return (false, "Input contains too many control characters");
        }

        if (inputType == "text")
        {
            var urlMatches = System.Text.RegularExpressions.Regex.Matches(
                inputValue,
                @"https?://",
                System.Text.RegularExpressions.RegexOptions.None,
                TimeSpan.FromSeconds(1));
            if (urlMatches.Count > 3)
                return (false, "Free-text input may not contain more than 3 embedded URLs");
        }

        return (true, null);
    }
}
