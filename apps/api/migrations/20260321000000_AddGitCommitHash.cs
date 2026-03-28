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
            migrationBuilder.AddColumn<string>(
                name: "GitCommitHash",
                table: "Jobs",
                type: "TEXT",
                nullable: true);
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
