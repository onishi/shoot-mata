# 02 技術設計

状態: M1完了（2026-10-26）

## 構成

- `ver03/game/src/core/`: 60 tick/秒で動くブラウザ非依存のゲーム規則。
- `ver03/game/src/content/`: ステージ、地形、敵編成のデータ。
- `ver03/game/src/browser/`: Canvas描画、キーボード入力、`requestAnimationFrame` の薄い接続層。
- `ver03/game/tests/`: Nodeの単体テストと、PC版Chromeを実際に起動する通しテスト。
- `ver03/game/dist/`: `npm run build` が生成するGitHub Pages公開物。Gitには含めない。

外部フレームワークは使わず、ES ModulesとCanvas 2Dで作る。ブラウザ検証だけに`playwright-core`を使い、実行環境に入っているGoogle Chromeを起動する。

## シミュレーション

- 論理解像度は1280×800。`y < 720`がプレイフィールド、`y >= 720`がHUD専用帯。
- ゲーム規則は1/60秒の固定tickで進め、描画フレームと切り離す。
- ステージ内の時刻、敵出現、地形移動、ボス形態はtickで定義する。
- 通常実行は経過時間を蓄積して最大5 tick/フレームまで追いつく。タブ復帰時の巨大な遅れは捨てる。
- テスト用の`?autoplay=1`は同じtick関数へ決定的な自動入力を渡す。`?speed=N`はtick消化数だけを増やし、規則は変えない。

## 地形

地形はステージのワールド座標にある矩形配列として定義する。描画、接触判定、自動操縦の安全路計算は同じ配列と`visibleTerrain()`を使う。背景画像とは別レイヤーで、危険な輪郭を明るく描く。M1は固定梁と残骸壁、M2以降で同じインターフェースに移動・破壊可能地形を足す。

## 自動検証

`npm run verify` は順に次を実行する。

1. 静的公開物を`dist/`へ生成する。
2. Node単体テストで固定tick、PULSE、地形接触、Stage 1完走を確認する。
3. ローカルHTTPサーバーとPC版Google Chromeを起動し、タイトルから結果まで自動操縦で通す。
4. Canvasの論理領域、HUD分離、地形数、PULSE発射、ボス撃破、実行時例外なしをブラウザ側の状態で確認する。

画面変更時は通しテストが保存するスクリーンショットを画像として確認する。スクリーンショットは再生成物なのでGitには含めない。

## ビルドと公開

ビルドはHTML、CSS、`src/`をそのまま静的配信用に複製する。`main`へのpush時だけGitHub ActionsでNode/npmを固定し、`npm ci`と`npm run verify`が成功した`dist/`をGitHub Pagesへ公開する。手動確認入力と定期本番監視は使わない。
