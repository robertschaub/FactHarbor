using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FactHarbor.Api.Data;

namespace FactHarbor.Api.Models
{
    /// <summary>
    /// Stores performance, quality, and cost metrics for each analysis job.
    /// Part of Phase 1: Measurement Infrastructure
    /// </summary>
    public class AnalysisMetrics
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public string JobId { get; set; } = string.Empty;

        /// <summary>
        /// Full metrics data stored as JSON
        /// </summary>
        [Required]
        [Column(TypeName = "NVARCHAR(MAX)")]
        public string MetricsJson { get; set; } = string.Empty;

        [Required]
        public DateTime CreatedUtc { get; set; }

        // Navigation property
        [ForeignKey(nameof(JobId))]
        public JobEntity? Job { get; set; }
    }
}
