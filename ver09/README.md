# CANDLEWICK v9.0

光を絞れば追跡者から隠れられ、光を広げれば道と星種が見える、リアルタイム潜光探索ゲーム。

## 現在地

- M0 白紙企画比較・独立性確認: 完了
- M1 コアループ縦切り: 完了。規則、Google Chrome E2E、主要7画面の目視に合格
- 1室で、灯芯の明暗、星種3個の回収、残火、出口、勝敗を接続している

## 起動

```sh
cd ver09/game
npm install
npm run dev
```

矢印またはWASDで移動する。Spaceを押している間は灯りが広がり、星種と遠くの壁が見えるが、灰の番人が現在地へ近づく。Spaceを離すと灯りが小さくなり、灯油が回復する。星種を3個集めて右上の扉へ到達すると勝利。Escapeでポーズ、Rで最初からやり直す。

`npm run verify`でモデルテスト、構文検査、production build、Google Chrome E2Eを実行する。現在は単体9/9、構文検査、production build、Chrome E2E 3/3に合格している。

## 独立性

v1〜v8のコード、素材、文章、固有名詞、世界観、数値、画面構成、ゲームシステムを使用しない。CANDLEWICKは空の`ver09/`から新規制作し、標準的なCanvas、Web Audio、固定tick、テスト手法だけを利用する。
