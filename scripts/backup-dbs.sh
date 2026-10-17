#!/usr/bin/env bash
# FactHarbor SQLite backup (production VPS).
# Takes consistent copies of the production databases with `sqlite3 .backup`
# (online backup API, WAL-safe), verifies each copy with PRAGMA integrity_check
# and deletes dated backups older than the retention window.
#
# Usage:
#   /opt/factharbor/scripts/backup-dbs.sh                 # back up and prune
#   FH_BACKUP_RETENTION_DAYS=30 /opt/factharbor/scripts/backup-dbs.sh
#
# Cron (root crontab), daily 03:00 UTC:
#   0 3 * * * /opt/factharbor/scripts/backup-dbs.sh >> /var/log/factharbor-backup.log 2>&1
#
# deploy.sh runs this script before every deploy and aborts the deploy when it
# fails (set -e in deploy.sh). A same-day re-run overwrites that day's files.
#
# Environment overrides (all optional):
#   FH_DATA_DIR               directory holding the databases   (default /opt/factharbor/data)
#   FH_BACKUP_DIR             where backups are written          (default /opt/factharbor/backups)
#   FH_BACKUP_RETENTION_DAYS  prune dated backups older than N   (default 14)
#   FH_BACKUP_DBS             base names to back up, space-separated
#                             (default "factharbor config source-reliability")

set -euo pipefail

DATA_DIR="${FH_DATA_DIR:-/opt/factharbor/data}"
BACKUP_DIR="${FH_BACKUP_DIR:-/opt/factharbor/backups}"
RETENTION_DAYS="${FH_BACKUP_RETENTION_DAYS:-14}"
DBS="${FH_BACKUP_DBS:-factharbor config source-reliability}"
STAMP="$(date -u +%Y%m%d)"

log() { printf '[%s] backup: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
die() { log "ERROR: $*" >&2; exit 1; }

command -v sqlite3 >/dev/null 2>&1 || die "sqlite3 CLI not found (install: sudo apt-get install -y sqlite3)"
case "$RETENTION_DAYS" in
  ''|*[!0-9]*) die "FH_BACKUP_RETENTION_DAYS must be a whole number, got '$RETENTION_DAYS'" ;;
esac
[ -d "$DATA_DIR" ] || die "data directory not found: $DATA_DIR"

# The databases are owned by the service user and the backup directory may be
# root-owned. Re-run under sudo when either is not accessible to the caller.
need_root=0
for name in $DBS; do
  src="$DATA_DIR/$name.db"
  if [ -e "$src" ] && [ ! -r "$src" ]; then
    need_root=1
  fi
done
if [ -d "$BACKUP_DIR" ]; then
  if [ ! -w "$BACKUP_DIR" ]; then need_root=1; fi
elif [ ! -w "$(dirname "$BACKUP_DIR")" ]; then
  need_root=1
fi
if [ "$need_root" -eq 1 ] && [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null 2>&1 || die "databases or backup directory not accessible as $(id -un) and sudo is unavailable"
  log "re-running with sudo (databases or backup directory not accessible as $(id -un))"
  exec sudo -n env \
    FH_DATA_DIR="$DATA_DIR" \
    FH_BACKUP_DIR="$BACKUP_DIR" \
    FH_BACKUP_RETENTION_DAYS="$RETENTION_DAYS" \
    FH_BACKUP_DBS="$DBS" \
    bash "$0" "$@"
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR" 2>/dev/null || true

backed_up=0
for name in $DBS; do
  src="$DATA_DIR/$name.db"
  if [ ! -f "$src" ]; then
    log "skip: $src does not exist"
    continue
  fi
  dest="$BACKUP_DIR/${name}_${STAMP}.db"
  tmp="$dest.tmp"
  rm -f -- "$tmp"
  sqlite3 "$src" ".backup '$tmp'"
  check="$(sqlite3 "$tmp" 'PRAGMA integrity_check;' | head -n 1)"
  if [ "$check" != "ok" ]; then
    rm -f -- "$tmp"
    die "integrity check failed for backup of $src: $check"
  fi
  mv -f -- "$tmp" "$dest"
  chmod 600 "$dest"
  log "ok: $dest ($(du -h "$dest" | cut -f1))"
  backed_up=$((backed_up + 1))
done
[ "$backed_up" -gt 0 ] || die "no database found in $DATA_DIR (expected: $DBS)"

# Prune dated backups (<name>_YYYYMMDD.db) older than the retention window.
pruned=0
while IFS= read -r old; do
  rm -f -- "$old"
  log "pruned: $old"
  pruned=$((pruned + 1))
done < <(find "$BACKUP_DIR" -maxdepth 1 -type f \
           -name '*_[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9].db' \
           -mtime "+$RETENTION_DAYS" -print)

log "done: $backed_up database(s) backed up, $pruned pruned, retention ${RETENTION_DAYS} days, dir $BACKUP_DIR"
