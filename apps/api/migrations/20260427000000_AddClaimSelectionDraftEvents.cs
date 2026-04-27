using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FactHarbor.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddClaimSelectionDraftEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClaimSelectionDraftEvents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DraftId = table.Column<string>(type: "TEXT", nullable: false),
                    TsUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ActorType = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    Action = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Result = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    BeforeStatus = table.Column<string>(type: "TEXT", maxLength: 32, nullable: true),
                    AfterStatus = table.Column<string>(type: "TEXT", maxLength: 32, nullable: true),
                    SourceIp = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    Message = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClaimSelectionDraftEvents", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClaimSelectionDraftEvents_DraftId_Id",
                table: "ClaimSelectionDraftEvents",
                columns: new[] { "DraftId", "Id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "ClaimSelectionDraftEvents");
        }
    }
}
