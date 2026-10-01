# When to Add Complexity

FactHarbor starts simple and adds complexity **only when metrics prove it's necessary**. This page defines clear triggers for adding deferred features. **Philosophy**: Let data and user feedback drive complexity, not assumptions about future needs.

## 1. Add Elasticsearch

**Current**: PostgreSQL full-text search **Add Elasticsearch when**:

-   ✅ PostgreSQL search queries consistently \>500ms
-   ✅ Search accounts for \>20% of total database load
-   ✅ Users complain about search speed
-   ✅ Search index size \>50GB

**Metrics to monitor**:

-   Search query response time (P95, P99)
-   Database CPU usage during search
-   User search abandonment rate
-   Search result relevance scores

**Before adding**:

-   Try PostgreSQL search optimization (indexes, pg_trgm, GIN indexes)
-   Profile slow queries
-   Consider query result caching
-   Estimate Elasticsearch costs

**Implementation effort**: ~

## 2. Add TimescaleDB

**Current**: PostgreSQL with time-series data in regular tables **Add TimescaleDB when**:

-   ✅ Metrics queries consistently \>1 second
-   ✅ Metrics tables \>100GB
-   ✅ Need for time-series specific features (continuous aggregates, data retention policies)
-   ✅ Dashboard loading noticeably slow

**Metrics to monitor**:

-   Metrics query response time
-   Metrics table size growth rate
-   Dashboard load time
-   Time-series query patterns

**Before adding**:

-   Try PostgreSQL optimization (partitioning, materialized views)
-   Implement query result caching
-   Consider data aggregation strategies
-   Profile slow metrics queries

**Implementation effort**: ~

## 3. Add Federation

**Current**: Single-node deployment with read replicas **Add Federation when**:

-   ✅ 10,000+ users on single node
-   ✅ Users explicitly request ability to run own instances
-   ✅ Geographic latency becomes significant problem (\>200ms)
-   ✅ Censorship/control concerns emerge
-   ✅ Community demands decentralization

**Metrics to monitor**:

-   Total active users
-   Geographic distribution of users
-   Single-node performance limits
-   User feature requests
-   Community sentiment

**Before adding**:

-   Exhaust vertical scaling options
-   Add read replicas in multiple regions
-   Implement CDN for static content
-   Survey users about federation interest

**Implementation effort**: ~ (major undertaking)

## 4. Add Advanced User Management

**Current**: Simple manual roles (Reader, User, UCM Administrator, Moderator) **Add Advanced User Management when**:

-   ✅ Submission volume requires automated quota management
-   ✅ Manual role management becomes bottleneck (\>5 hours/week)
-   ✅ Clear patterns of abuse require automated detection
-   ✅ Multiple UCM Administrators need coordinated workflows

**Metrics to monitor**:

-   Number of registered users and submission volume
-   Time spent on manual role management
-   Abuse incident rate
-   Submission quality distribution
-   Community feedback on roles

**Before adding**:

-   Document current manual process thoroughly
-   Identify most time-consuming tasks
-   Prototype automated user management features
-   Get community feedback on proposal

**Implementation effort**: ~

## 5. Add Many-to-Many Scenarios

**Current**: Scenarios belong to single claims (one-to-many) **Add Many-to-Many Scenarios when**:

-   ✅ Users request "apply this scenario to other claims"
-   ✅ Clear use cases for scenario reuse emerge
-   ✅ Scenario duplication becomes significant storage issue
-   ✅ Cross-claim scenario analysis requested

**Metrics to monitor**:

-   Scenario duplication rate
-   User feature requests
-   Storage costs of scenarios
-   Query patterns involving scenarios

**Before adding**:

-   Analyze scenario duplication patterns
-   Design junction table schema
-   Plan data migration strategy
-   Consider query performance impact

**Implementation effort**: ~

## 6. Add Full UCM Config Versioning System

**Current**: Simple UCM config audit trail (immutable blobs, activation tracking) **Add Full Config Versioning when**:

-   ✅ UCM Administrators request "see complete config version history"
-   ✅ UCM Administrators request "restore to specific previous config version"
-   ✅ Need for config branching and merging emerges (e.g., A/B testing configs)
-   ✅ Collaborative config management requires conflict resolution

**Metrics to monitor**:

-   UCM Administrator feature requests for config versioning
-   Manual config rollback frequency
-   Config change conflict rate
-   Storage costs of full config history

**Before adding**:

-   Design config branching/merging strategy
-   Plan storage optimization (delta compression for config blobs)
-   Consider UI/UX for config version history
-   Estimate storage and performance impact

**Implementation effort**: ~

## 7. Add Graph Database

**Current**: Relational data model in PostgreSQL **Add Graph Database when**:

-   ✅ Complex relationship queries become common
-   ✅ Need for multi-hop traversals (friend-of-friend, citation chains)
-   ✅ PostgreSQL recursive queries too slow
-   ✅ Graph algorithms needed (PageRank, community detection)

**Metrics to monitor**:

-   Relationship query patterns
-   Recursive query performance
-   Use cases requiring graph traversals
-   Query complexity growth

**Before adding**:

-   Try PostgreSQL recursive CTEs
-   Consider graph extensions for PostgreSQL
-   Profile slow relationship queries
-   Evaluate Neo4j vs alternatives

**Implementation effort**: ~

## 8. Add Collaborative UCM Configuration Management

**Current**: Single UCM Administrator manages configuration via direct access **Add Collaborative UCM Management when**:

-   ✅ Multiple UCM Administrators need concurrent config access
-   ✅ Config change coordination becomes frequent issue
-   ✅ Need for live updates during configuration sessions
-   ✅ Collaborative review of config changes common

**Metrics to monitor**:

-   Config change conflict frequency
-   UCM Administrator feature requests
-   Collaborative config review patterns
-   Average config management session duration

**Before adding**:

-   Design config change conflict resolution strategy
-   Consider WebSocket infrastructure for live config preview
-   Plan UI/UX for collaborative config management
-   Estimate server resource requirements

**Implementation effort**: ~

## 9. Add Machine Learning Pipeline

**Current**: Rule-based quality scoring and LLM-based analysis **Add ML Pipeline when**:

-   ✅ Need for custom models beyond LLM APIs
-   ✅ Opportunity for specialized fine-tuning
-   ✅ Cost savings from specialized models
-   ✅ Real-time learning from user feedback

**Metrics to monitor**:

-   LLM API costs
-   Need for domain-specific models
-   Quality improvement opportunities
-   User feedback patterns

**Before adding**:

-   Collect training data (user feedback, corrections)
-   Experiment with fine-tuning approaches
-   Estimate cost savings vs infrastructure costs
-   Consider model hosting options

**Implementation effort**: ~

<span id="10-add-blockchain-web3-integration"></span>

## 10. Add Blockchain/Web3 Integration

**Current**: Traditional database with audit logs **Add Blockchain when**:

-   ✅ Need for immutable public audit trail
-   ✅ Decentralized verification demanded
-   ✅ Token economics would add value
-   ✅ Community governance requires voting
-   ✅ Cross-organization trust is critical

**Metrics to monitor**:

-   User requests for blockchain features
-   Need for external verification
-   Governance participation rate
-   Trust/verification requirements

**Before adding**:

-   Evaluate real vs perceived benefits
-   Consider costs (gas fees, infrastructure)
-   Design token economics carefully
-   Study successful Web3 content platforms

**Implementation effort**: ~

## Decision Framework

**For any complexity addition, ask**:

#### Do we have data?

-   Metrics showing current system inadequate?
-   User requests documenting need?
-   Performance problems proven?

#### Have we exhausted simpler options?

-   Optimization of current system?
-   Configuration tuning?
-   Simple workarounds?

#### Do we understand the cost?

-   Implementation time realistic?
-   Ongoing maintenance burden?
-   Infrastructure costs?
-   Technical debt implications?

#### Is the timing right?

-   Core product stable?
-   Team capacity available?
-   User demand strong enough?

**If all four answers are YES**: Proceed with complexity addition **If any answer is NO**: Defer and revisit later

## Monitoring Dashboard

**Recommended metrics to track**: **Performance**:

-   P95/P99 response times for all major operations
-   Database query performance
-   AKEL processing time
-   Search performance

**Usage**:

-   Active users (by period)
-   Claims processed (by period)
-   Search queries (by period)
-   Contribution rate

**Costs**:

-   Infrastructure costs per user
-   LLM API costs per claim
-   Storage costs per GB
-   Total operational costs

**Quality**:

-   Confidence score distribution
-   Evidence completeness
-   Source reliability trends
-   User satisfaction (surveys)

**Community**:

-   Active users
-   Moderation workload
-   Feature requests by category
-   Abuse incident rate

## Periodic Review Process

**Regularly review**:

1.  **Metrics dashboard**: Are any triggers close to thresholds?
2.  **User feedback**: What features are most requested?
3.  **Performance**: What's slowing down?
4.  **Costs**: What's most expensive?
5.  **Team capacity**: Can we handle new complexity?

**Decision**: Prioritize complexity additions based on:

-   Urgency (current pain vs future optimization)
-   Impact (user benefit vs internal efficiency)
-   Effort (quick wins vs major projects)
-   Dependencies (prerequisites needed)

## Related Pages

-   [Design Decisions](../../../specification/design-decisions.md)
-   [Architecture](../../../specification/architecture/index.md)
-   [Data Model](../../../specification/data-model/index.md)

\## Remember **Build what you need now. Measure everything. Add complexity only when data proves it's necessary.** The best architecture is the simplest one that works for current needs. 🎯
