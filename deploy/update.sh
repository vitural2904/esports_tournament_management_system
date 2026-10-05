#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Run as root only on the configured VPS, with an already installed immutable release.
if [[ $EUID -ne 0 || $# -ne 1 ]]; then
  echo 'Usage: sudo bash deploy/update.sh /opt/bracket/releases/<release-id>' >&2
  exit 1
fi
candidate=$(realpath -e -- "$1")
case "$candidate" in /opt/bracket/releases/*) ;; *) echo 'Release must be under /opt/bracket/releases.' >&2; exit 1 ;; esac
[[ -f "$candidate/release.json" && -d "$candidate/node_modules" && -f "$candidate/dist/index.html" ]]
[[ -L /opt/bracket/current ]]
[[ -f /etc/bracket/app.env && -f /etc/bracket/backup.env ]]
mountpoint -q /mnt/bracket-offsite
# Env files are trusted root-owned shell assignments; never source files from uploads.
set -a
# shellcheck disable=SC1091
source /etc/bracket/app.env
# shellcheck disable=SC1091
source /etc/bracket/backup.env
set +a
[[ ${NODE_ENV:-} == production && ${DATABASE_PATH:-} == /var/lib/bracket/* ]]
[[ ${OFFSITE_DIRECTORY:-} == /mnt/bracket-offsite && ${BACKUP_KEEP_DAYS:-} =~ ^[0-9]+$ ]]
previous=$(readlink -f /opt/bracket/current)
[[ "$candidate" != "$previous" ]]
stopped=false
trap 'if [[ $stopped == true ]]; then systemctl stop bracket.service; echo "Update failed. API left stopped. Keep database and pre-migration backup. No automatic schema rollback." >&2; fi' EXIT

systemctl stop bracket.service
stopped=true
# No writes can land between this snapshot and migration.
runuser -u bracket -- env "DATABASE_PATH=$DATABASE_PATH" "RELEASE_ROOT=$previous" "BACKUP_DIRECTORY=$BACKUP_DIRECTORY" "OFFSITE_DIRECTORY=$OFFSITE_DIRECTORY" "BACKUP_KEEP_DAYS=$BACKUP_KEEP_DAYS" /usr/bin/node "$previous/scripts/production-backup.mjs"
cd "$candidate"
runuser -u bracket -- env "NODE_ENV=production" "APP_ORIGIN=$APP_ORIGIN" "API_PORT=$API_PORT" "DATABASE_PATH=$DATABASE_PATH" "TRUSTED_PROXY=$TRUSTED_PROXY" /usr/bin/node scripts/check-release.mjs
link=/opt/bracket/.next-release
[[ ! -e "$link" && ! -L "$link" ]]
ln -s -- "$candidate" "$link"
mv -Tf -- "$link" /opt/bracket/current
systemctl start bracket.service
healthy=false
for ((attempt=0; attempt<30; attempt++)); do
  if curl --fail --silent --max-time 2 "http://127.0.0.1:$API_PORT/api/health" >/dev/null; then healthy=true; break; fi
  sleep 1
done
[[ $healthy == true ]]
# Caddy's static-file cache must also switch to the new symlink target.
systemctl reload caddy.service
stopped=false
echo 'Update healthy. Check HTTPS, login, roles and tournament data before continuing play.'
