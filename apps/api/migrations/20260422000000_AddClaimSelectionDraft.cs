using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FactHarbor.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddClaimSelectionDraft : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClaimSelectionDrafts",
                columns: table => new
                {
                    DraftId = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    Progress = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedUtc = table.Column<string>(type: "TEXT", nullable: false),
                    UpdatedUtc = table.Column<string>(type: "TEXT", nullable: false),
                    ExpiresUtc = table.Column<string>(type: "TEXT", nullable: false),
                    OriginalInputType = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    ActiveInputType = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    OriginalInputValue = table.Column<string>(type: "TEXT", nullable: false),
                    ActiveInputValue = table.Column<string>(type: "TEXT", nullable: false),
                    PipelineVariant = table.Column<string>(type: "TEXT", nullable: false),
                    InviteCode = table.Column<string>(type: "TEXT", nullable: true),
                    SelectionMode = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    RestartedViaOther = table.Column<bool>(type: "INTEGER", nullable: false),
                    RestartCount = table.Column<int>(type: "INTEGER", nullable: false),
                    DraftStateJson = table.Column<string>(type: "TEXT", nullable: true),
                    DraftAccessTokenHash = table.Column<string>(type: "TEXT", nullable: true),
                    FinalJobId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClaimSelectionDrafts", x => x.DraftId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClaimSelectionDrafts_Status",
                table: "ClaimSelectionDrafts",
                column: "Status");

            migrationBuilder.AddColumn<string>(
                name: "ClaimSelectionDraftId",
                table: "Jobs",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreparedStage1Json",
                table: "Jobs",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClaimSelectionJson",
                table: "Jobs",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_ClaimSelectionDraftId",
                table: "Jobs",
                column: "ClaimSelectionDraftId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "ClaimSelectionDrafts");

            migrationBuilder.DropIndex(name: "IX_Jobs_ClaimSelectionDraftId", table: "Jobs");
            migrationBuilder.DropColumn(name: "ClaimSelectionDraftId", table: "Jobs");
            migrationBuilder.DropColumn(name: "PreparedStage1Json", table: "Jobs");
            migrationBuilder.DropColumn(name: "ClaimSelectionJson", table: "Jobs");
        }
    }
}
