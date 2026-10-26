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

## 音

- `src/browser/audio.mjs` がWeb AudioのBGM/SFX別gain、3レイヤーBGM、同時発音制限、ダッキング、マスターリミッターを管理する。ゲーム規則は音を直接再生せず、固定tickのカウンタと状態遷移を音側が読む。
- 初期値はBGM 65%、SFX 45%。タイトルのSOUND SETTINGSで5%刻みに個別変更し、ブラウザへ保存する。
- Stage 1の通常BGMはrhythmとmelody、150秒以降とボス戦はdangerを足す。3秒周期を共有し、追加レイヤーは既存レイヤーと同じ再生位置から始める。
- 同じSFXは4音、爆発は6音までとし、超えた場合は古い音を止める。WARNINGとミスはBGMを最大3dB、500msだけ下げる。出力直前に-1dBFSのリミッターを置く。
- `scripts/audit-audio.mjs` が配信WAVのPCMを読み、素材gainと初期設定を含めたRMS・ピークを検査する。不足する短い効果音は`generate-audio.mjs`で決定的に再生成できる。

## 自動検証

`npm run verify` は順に次を実行する。

1. 静的公開物を`dist/`へ生成する。
2. Node単体テストで固定tick、PULSE、地形接触、Stage 1完走を確認する。
3. 音素材のRMS・ピーク、常時射撃とBGMの相対音量を数値検査する。
4. ローカルHTTPサーバーとPC版Google Chromeを起動し、タイトルから結果まで自動操縦で通す。
5. Canvasの論理領域、HUD分離、地形数、PULSE発射、ボス撃破、音素材の読込とレイヤー遷移、実行時例外なしをブラウザ側の状態で確認する。

画面変更時は通しテストが保存するスクリーンショットを画像として確認する。スクリーンショットは再生成物なのでGitには含めない。

## ビルドと公開

ビルドはHTML、CSS、`src/`をそのまま静的配信用に複製する。`main`へのpush時だけGitHub ActionsでNode/npmを固定し、`npm ci`と`npm run verify`が成功した`dist/`をGitHub Pagesへ公開する。手動確認入力と定期本番監視は使わない。
