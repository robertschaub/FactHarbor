using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FactHarbor.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddHourlyLimit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "HourlyLimit",
                table: "InviteCodes",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HourlyLimit",
                table: "InviteCodes");
        }
    }
}
