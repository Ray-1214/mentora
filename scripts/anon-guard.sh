#!/usr/bin/env bash
# anon-guard.sh — competition anonymization guard.
# Usage:  bash anon-guard.sh        (run from repo root)
# Exit 0 = clean, 1 = residue found.
# Scans TRACKED files only (git grep) → reflects exactly what a submitted repo contains.
# Local .env is gitignored/personal and intentionally NOT scanned.
# If you ship a BUILD, also grep the built bundle separately (CRA inlines build-time
# REACT_APP_* into main.*.js; build/ is gitignored so git grep won't see it).
set -uo pipefail

fail=0
EX=(':!package-lock.json' ':!anon-guard.sh' ':!scripts/anon-guard.sh')

scan () {  # $1 label  $2 flags  $3 pattern  [$4... extra pathspecs]
  local label="$1" flags="$2" pat="$3"; shift 3
  local hits
  hits=$(git grep -n $flags -e "$pat" -- "${EX[@]}" "$@" 2>/dev/null)
  if [ -n "$hits" ]; then printf '✗ [%s]\n%s\n\n' "$label" "$hits"; fail=1
  else printf '✓ [%s] clean\n' "$label"; fi
}

scan domain    "-iE" 'ithu\.tw|thu\.edu|service\.thu|llmapi'
scan name      "-iE" 'tunghai|東海' ':!src/data/vocab.json'   # 排除字典:東海岸/東海道 是地理詞,校名不會出現在英文單字釋義
scan THU-token "-E"  '(^|[^A-Za-z])THU([^A-Za-z]|$)'          # case-sensitive → 不誤中 "Thursday"
scan personal  "-E"  'Ray-1214|toeic-quiz-app'                # 個人 handle + 舊 repo 名(裸 "TOEIC" 是考試名、不抓)
scan api-key   "-E"  'sk-[A-Za-z0-9_-]{16,}'                  # 真 key 殘留(placeholder 已改 your-api-key)

echo
[ "$fail" -eq 0 ] && echo "PASS — no institutional/personal residue in tracked files." \
                  || echo "FAIL — remove the residue above before submitting."
exit "$fail"