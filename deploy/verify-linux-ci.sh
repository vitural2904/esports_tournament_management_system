#!/usr/bin/env bash
set -Eeuo pipefail
umask 022
# Owns only a fresh disposable GitHub Actions runner. Never run on a real VPS.
[[ ${GITHUB_ACTIONS:-} == true && $EUID -eq 0 ]]
source_root=$(pwd)
node_binary=$(command -v node)
[[ "$node_binary" != /usr/bin/node ]] && ln -sf -- "$node_binary" /usr/bin/node
useradd --system --home /var/lib/bracket --shell /usr/sbin/nologin bracket
install -d -o bracket -g bracket -m 0700 /var/lib/bracket /var/backups/bracket
install -d -m 0755 /opt/bracket/releases /etc/caddy /mnt/bracket-offsite
install -d -m 0700 /etc/bracket
mount -t tmpfs -o mode=0700 tmpfs /mnt/bracket-offsite
chown bracket:bracket /mnt/bracket-offsite
cleanup() {
  systemctl stop bracket.service caddy.service bracket-backup.service || true
  umount /mnt/bracket-offsite || true
}
trap cleanup EXIT

for release_id in ci-a ci-b; do
  node scripts/package-release.mjs "/opt/bracket/releases/$release_id" "$release_id"
  # Install runtime dependencies on the actual target OS from the shipped lockfile.
  (cd "/opt/bracket/releases/$release_id" && npm ci --omit=dev)
done
ln -s /opt/bracket/releases/ci-a /opt/bracket/current
cat > /etc/bracket/app.env <<'ENV'
NODE_ENV=production
APP_ORIGIN=https://cup.example.test
APP_HOST=cup.example.test
API_PORT=3001
TRUSTED_PROXY=127.0.0.1
DATABASE_PATH=/var/lib/bracket/bracket.sqlite
RELEASE_ROOT=/opt/bracket/current
PROXY_PORT=8080
ENV
cat > /etc/bracket/backup.env <<'ENV'
BACKUP_DIRECTORY=/var/backups/bracket
OFFSITE_DIRECTORY=/mnt/bracket-offsite
BACKUP_KEEP_DAYS=7
ENV
chmod 0600 /etc/bracket/*.env
printf '%s' '{"username":"ci-owner","displayName":"CI Owner","password":"Temporary-CI-Password-42!"}' | node scripts/initialize-admin.mjs /var/lib/bracket/bracket.sqlite
chown bracket:bracket /var/lib/bracket/bracket.sqlite
install -m 0644 deploy/bracket.service deploy/bracket-backup.service /etc/systemd/system/
install -m 0644 deploy/Caddy.common /etc/caddy/Caddy.common
install -m 0644 deploy/Caddyfile.tunnel /etc/caddy/Caddyfile
cat > /etc/systemd/system/caddy.service <<'UNIT'
[Unit]
Description=Disposable CI Caddy
[Service]
EnvironmentFile=/etc/bracket/app.env
ExecStart=/usr/local/bin/caddy run --config /etc/caddy/Caddyfile
ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile
UNIT
systemd-analyze verify /etc/systemd/system/bracket.service /etc/systemd/system/bracket-backup.service /etc/systemd/system/caddy.service
systemctl daemon-reload
systemctl enable --now bracket.service
systemctl start caddy.service
wait_api() {
  for ((attempt=0; attempt<30; attempt++)); do
    if curl --fail --silent --max-time 2 http://127.0.0.1:3001/api/health >/dev/null; then return; fi
    sleep 1
  done
  return 1
}
wait_api
node tests/operations/linux-client.mjs seed
systemctl kill --signal=SIGKILL bracket.service
sleep 4
wait_api
node tests/operations/linux-client.mjs verify
systemctl is-enabled --quiet bracket.service
systemctl start bracket-backup.service
bash deploy/update.sh /opt/bracket/releases/ci-b
[[ $(readlink -f /opt/bracket/current) == /opt/bracket/releases/ci-b ]]
node "$source_root/tests/operations/linux-client.mjs" verify
curl --fail --silent -H 'Host: cup.example.test' -H 'CF-Connecting-IP: 192.0.2.51' http://127.0.0.1:8080/api/health
echo 'Linux service restart, release switch, proxy and backup verified. Offsite mount is simulated in CI; real reboot still needs VPS verification.'
