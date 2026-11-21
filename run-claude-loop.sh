#!/bin/sh

set -eu

usage() {
  echo "Usage: $0 [wait-minutes]"
  echo "Default: wait-minutes=60"
  echo "Runs autonomous game-development turns until the current major is Major Closed."
}

case "${1:-}" in
  -h|--help)
    usage
    exit 0
    ;;
esac

if [ "$#" -gt 1 ]; then
  usage >&2
  exit 2
fi

wait_minutes=${1:-60}

case "$wait_minutes" in
  ''|*[!0-9]*)
    echo "wait-minutes must be a non-negative integer: $wait_minutes" >&2
    exit 2
    ;;
esac

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
wait_seconds=$((wait_minutes * 60))
prompt='README.mdおよび各種ドキュメントに沿って、自律的にゲーム開発を進めてください。この実行はrun-claude-loop.shから起動したClaudeです。環境変数SHOOT_MATA_AGENT_*を確認し、対象版のdocs/agent-history.mdとdocs/log.mdへ実行元、作業、検証結果を記録し、作成する全コミットへREADME指定のAgent-LoopとAgent-Script trailerを付けてください。SHOOT_MATA_AGENT_TARGET_MAJORのM6、振り返り、ルートREADME改善まで完了した実行では、対象版のdocs/status.mdの段階行をMajor Closedで終わるよう更新し、その更新を最終コミットに含め、同じ実行で次メジャーを開始しないでください。'
run_no=1
SHOOT_MATA_AGENT_LOOP=claude
SHOOT_MATA_AGENT_SCRIPT=run-claude-loop.sh
target_major_number=-1
target_major_label=

if ! command -v claude >/dev/null 2>&1; then
  echo "claude command was not found in PATH" >&2
  exit 127
fi

if [ ! -f "$repo_dir/README.md" ]; then
  echo "repository README was not found: $repo_dir/README.md" >&2
  exit 1
fi

for status_file in "$repo_dir"/ver*/docs/status.md; do
  [ -f "$status_file" ] || continue
  version_dir=$(basename "$(dirname "$(dirname "$status_file")")")
  version=${version_dir#ver}
  major=${version%%.*}
  case "$major" in
    ''|*[!0-9]*) continue ;;
  esac
  major_number=$(printf '%s' "$major" | sed 's/^0*//')
  major_number=${major_number:-0}
  if [ "$major_number" -gt "$target_major_number" ]; then
    target_major_number=$major_number
    target_major_label=$major
  fi
done

if [ -z "$target_major_label" ]; then
  echo "no version status file was found under $repo_dir/ver*/docs/status.md" >&2
  exit 1
fi

SHOOT_MATA_AGENT_TARGET_MAJOR="v$target_major_number"
export SHOOT_MATA_AGENT_LOOP SHOOT_MATA_AGENT_SCRIPT SHOOT_MATA_AGENT_TARGET_MAJOR

major_is_closed() {
  git -C "$repo_dir" rev-parse --verify HEAD >/dev/null 2>&1 || return 1
  for status_path in $(
    git -C "$repo_dir" ls-tree -r --name-only HEAD |
      grep -E "^ver${target_major_label}(\\.[0-9]+)?/docs/status\\.md$" || :
  ); do
    if git -C "$repo_dir" show "HEAD:$status_path" 2>/dev/null |
      grep -Eq '^- 段階:.*Major Closed[[:space:]]*$'
    then
      return 0
    fi
  done
  return 1
}

trap 'printf "\nClaude loop stopped.\n"; exit 130' INT TERM HUP

if major_is_closed; then
  printf '%s is already Major Closed; no Claude run is needed.\n' "$SHOOT_MATA_AGENT_TARGET_MAJOR"
  exit 0
fi

while :; do
  SHOOT_MATA_AGENT_RUN_NUMBER=$run_no
  SHOOT_MATA_AGENT_RUN_STARTED_AT=$(date '+%Y-%m-%dT%H:%M:%S%z')
  export SHOOT_MATA_AGENT_RUN_NUMBER SHOOT_MATA_AGENT_RUN_STARTED_AT

  printf '\n=== Claude game-development run %d for %s (%s) ===\n' \
    "$run_no" "$SHOOT_MATA_AGENT_TARGET_MAJOR" "$(date '+%Y-%m-%d %H:%M:%S')"

  if (
    cd "$repo_dir"
    claude -p \
      --permission-mode auto \
      --permission-prompts none \
      "$prompt"
  ); then
    :
  else
    status=$?
    printf 'Claude run %d failed with status %d; stopping the loop.\n' \
      "$run_no" "$status" >&2
    exit "$status"
  fi

  if major_is_closed; then
    printf '\n%s reached Major Closed after %d Claude run(s).\n' \
      "$SHOOT_MATA_AGENT_TARGET_MAJOR" "$run_no"
    break
  fi

  printf 'Next run in %d minute(s). Press Ctrl-C to stop.\n' "$wait_minutes"
  sleep "$wait_seconds"
  run_no=$((run_no + 1))
done
