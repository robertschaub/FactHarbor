namespace FactHarbor.Api.Tests;

public static class FixtureFiles
{
    public static string ReadAnalyzerV2Fixture(string fileName)
    {
        var repoRoot = FindRepoRoot();
        var fixturePath = Path.Combine(
            repoRoot,
            "apps",
            "web",
            "test",
            "fixtures",
            "analyzer-v2",
            fileName);

        return File.ReadAllText(fixturePath);
    }

    private static string FindRepoRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            var fixtureDirectory = Path.Combine(
                directory.FullName,
                "apps",
                "web",
                "test",
                "fixtures",
                "analyzer-v2");

            if (Directory.Exists(fixtureDirectory))
                return directory.FullName;

            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException("Could not find repository root containing analyzer-v2 fixtures.");
    }
}
