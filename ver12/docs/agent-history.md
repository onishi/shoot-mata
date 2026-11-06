# Agent history

このファイルは、どの自律実行スクリプトとエージェントが各作業を行ったかを記録する。追跡機能導入前のv12 M0・M1は、確実な実行元を示す証拠がないため`unknown`とする。

| 開始時刻 | Agent | Script | Run | 作業・結果 | 検証 | Commit subject |
| --- | --- | --- | ---: | --- | --- | --- |
| unknown | unknown | unknown | - | v12 M0・M1（追跡導入前） | 既存文書を参照 | `feat(ver12): forge magnetic puzzle vertical slice` |
| 2026-11-06 | Codex | none (interactive) | - | 実行エージェント追跡機能を導入 | `sh -n`、help、引数検証 | `docs: record autonomous agent provenance` |
