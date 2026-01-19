using Microsoft.EntityFrameworkCore.Migrations;
using System;

#nullable disable

namespace FactHarbor.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAnalysisMetrics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AnalysisMetrics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    JobId = table.Column<Guid>(type: "TEXT", nullable: false),
                    MetricsJson = table.Column<string>(type: "NVARCHAR(MAX)", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnalysisMetrics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AnalysisMetrics_Jobs_JobId",
                        column: x => x.JobId,
                        principalTable: "Jobs",
                        principalColumn: "JobId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AnalysisMetrics_CreatedUtc",
                table: "AnalysisMetrics",
                column: "CreatedUtc");

            migrationBuilder.CreateIndex(
                name: "IX_AnalysisMetrics_JobId",
                table: "AnalysisMetrics",
                column: "JobId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AnalysisMetrics");
        }
    }
}
