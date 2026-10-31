#!/bin/sh

set -eu

usage() {
  echo "Usage: $0 [run-count] [wait-minutes]"
  echo "Defaults: run-count=12, wait-minutes=30"
  echo "Each run asks Codex to continue from README.md and the current v4 documents."
}

case "${1:-}" in
  -h|--help)
    usage
    exit 0
    ;;
esac

run_limit=${1:-12}
wait_minutes=${2:-30}

case "$run_limit" in
  ''|*[!0-9]*)
    echo "run-count must be a positive integer: $run_limit" >&2
    exit 2
    ;;
esac

case "$wait_minutes" in
  ''|*[!0-9]*)
    echo "wait-minutes must be a non-negative integer: $wait_minutes" >&2
    exit 2
    ;;
esac

if [ "$run_limit" -eq 0 ]; then
  echo "run-count must be greater than zero" >&2
  exit 2
fi

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_dir=$(CDPATH= cd -- "$script_dir/../.." && pwd)
wait_seconds=$((wait_minutes * 60))
prompt='README.md および各種ドキュメントに沿って開発を進めて'
run_no=1

if ! command -v codex >/dev/null 2>&1; then
  echo "codex command was not found in PATH" >&2
  exit 127
fi

if [ ! -f "$repo_dir/README.md" ]; then
  echo "repository README was not found: $repo_dir/README.md" >&2
  exit 1
fi

trap 'printf "\nCodex loop stopped.\n"; exit 130' INT TERM HUP

while [ "$run_no" -le "$run_limit" ]; do
  printf '\n=== v4 Codex run %d/%d (%s) ===\n' \
    "$run_no" "$run_limit" "$(date '+%Y-%m-%d %H:%M:%S')"

  if codex exec \
    -C "$repo_dir" \
    --approve-for-me \
    "$prompt"
  then
    :
  else
    status=$?
    printf 'Codex run %d failed with status %d; stopping the loop.\n' "$run_no" "$status" >&2
    exit "$status"
  fi

  if [ "$run_no" -lt "$run_limit" ]; then
    printf 'Next run in %d minute(s). Press Ctrl-C to stop.\n' "$wait_minutes"
    sleep "$wait_seconds"
  fi

  run_no=$((run_no + 1))
done

printf '\nCompleted %d Codex run(s).\n' "$run_limit"
