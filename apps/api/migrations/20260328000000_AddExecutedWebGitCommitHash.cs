using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FactHarbor.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddExecutedWebGitCommitHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExecutedWebGitCommitHash",
                table: "Jobs",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExecutedWebGitCommitHash",
                table: "Jobs");
        }
    }
}
