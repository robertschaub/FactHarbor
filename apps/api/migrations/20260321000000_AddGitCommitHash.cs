using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FactHarbor.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGitCommitHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Use 'IF NOT EXISTS' so this migration is safe to apply on databases that
            // already have this column via the startup schema-patch that predated this
            // migration (Program.cs raw ALTER TABLE, removed in this commit).
            // Requires SQLite 3.37.0+ (2021-11-27) — safe for all supported environments.
            migrationBuilder.Sql(
                "ALTER TABLE Jobs ADD COLUMN IF NOT EXISTS GitCommitHash TEXT");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // SQLite does not support DROP COLUMN in a simple ALTER TABLE on older versions,
            // but EF Core's SQLite provider handles this via table rebuild when needed.
            migrationBuilder.DropColumn(
                name: "GitCommitHash",
                table: "Jobs");
        }
    }
}
