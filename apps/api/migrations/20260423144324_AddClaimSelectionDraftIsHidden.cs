using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FactHarbor.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddClaimSelectionDraftIsHidden : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsHidden",
                table: "ClaimSelectionDrafts",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsHidden",
                table: "ClaimSelectionDrafts");
        }
    }
}
