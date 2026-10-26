#!/usr/bin/env bash
# Copy a verified phase from the isolated copy into web/.
# Usage: sync.sh <scratch-dir>   (the copy is <scratch-dir>/web-copy, the snapshot <scratch-dir>/synced)
# - Refuses to run if web/ changed since the last sync, so nobody's edits get overwritten.
# - Copies only new and changed files.
# - Never deletes: files the phase removed are moved to <scratch-dir>/trash (they're also in git).
set -euo pipefail
S="$1"
W="$(cd "$(dirname "$0")/../.." && pwd)"
C="$S/web-copy"
TRASH="$S/trash/$(date +%Y%m%d-%H%M%S)"

if ! diff -rq "$W/src" "$S/synced/src" >/dev/null || ! diff -rq "$W/public" "$S/synced/public" >/dev/null || ! cmp -s "$W/package.json" "$S/synced/package.json"; then
  echo "web/ changed since the last sync. Stopping; nothing was copied." >&2
  exit 1
fi
if ls -a "$C" | grep -q '^\.env'; then echo "The copy has an .env file. Stopping." >&2; exit 1; fi

copied=0; moved=0
for dir in src public; do
  while IFS= read -r f; do
    rel="${f#$C/}"
    if ! cmp -s "$f" "$W/$rel"; then mkdir -p "$(dirname "$W/$rel")"; cp "$f" "$W/$rel"; copied=$((copied+1)); echo "copied  $rel"; fi
  done < <(find "$C/$dir" -type f)
  while IFS= read -r f; do
    rel="${f#$W/}"
    if [ ! -e "$C/$rel" ]; then mkdir -p "$(dirname "$TRASH/$rel")"; mv "$f" "$TRASH/$rel"; moved=$((moved+1)); echo "removed $rel (moved to trash)"; fi
  done < <(find "$W/$dir" -type f)
done
if ! cmp -s "$C/package.json" "$W/package.json"; then cp "$C/package.json" "$W/package.json"; copied=$((copied+1)); echo "copied  package.json"; fi

# New snapshot of what web/ now holds.
mkdir -p "$TRASH"
mv "$S/synced" "$TRASH/old-snapshot"
mkdir -p "$S/synced"
cp -a "$W/src" "$S/synced/src" && cp -a "$W/public" "$S/synced/public" && cp "$W/package.json" "$S/synced/package.json"
echo "--- $copied copied, $moved removed"
cd "$W" && git diff --stat -- . | tail -1
