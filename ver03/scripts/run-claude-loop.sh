#!/bin/sh

set -eu

usage() {
  echo "Usage: $0 [run-count] [wait-minutes]"
  echo "Defaults: run-count=12, wait-minutes=30"
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
run_no=1

while [ "$run_no" -le "$run_limit" ]; do
  printf '\n=== Claude run %d/%d (%s) ===\n' \
    "$run_no" "$run_limit" "$(date '+%Y-%m-%d %H:%M:%S')"

  (
    cd "$repo_dir"
    claude -p \
      --permission-mode auto \
      --permission-prompts none \
      'README.md および各種ドキュメントに沿って開発を進めて'
  ) || exit $?

  if [ "$run_no" -lt "$run_limit" ]; then
    printf 'Next run in %d minute(s). Press Ctrl-C to stop.\n' "$wait_minutes"
    sleep "$wait_seconds"
  fi

  run_no=$((run_no + 1))
done
