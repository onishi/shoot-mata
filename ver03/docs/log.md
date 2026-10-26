# 作業記録

新しい記録を上に追加する。

## 2026-10-26 — v03の準備

- やったこと: v02のルートREADMEを `ver02/README.md` へ移し、v03のREADMEを新しく書いた。`ver03/docs/00-v02-review.md` にユーザーの評価と、v02のコードで確かめた原因をまとめた。自律実行用のスクリプトを `ver03/scripts/` に置いた。
- 決めたこと: 必須はPCのChromeだけ。人間の確認はしない。公開はCI合格時の自動公開にする。6ステージ以上、地形の当たり判定、常に撃てる基本ショット、プレイフィールド外のUIを必須にした。
- 未着手: ゲーム本体、`01-game-design.md`、`02-tech.md`。GitHub Actionsはv02のまま（手動公開の `pages.yml` と日次監視の `production-monitor.yml`）。
- 次: M0として `01-game-design.md` を書く。M1で `pages.yml` を自動公開に置き換え、`production-monitor.yml` を削除する。
