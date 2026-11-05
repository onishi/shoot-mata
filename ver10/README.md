# SIGNAL GARDEN v10.0

流れる光種より先に枝路を切り替え、三つの花を咲かせて受信樹へ帰す、リアルタイム経路先読みゲーム。

## 現在地

- M0 白紙企画比較・独立性確認: 完了
- M1 コアループ縦切り: 完了。モデル、Google Chrome E2E、主要4画面の目視に合格
- 3個の分岐を左右キーで選び、Spaceで行先を切り替える
- 光種は一定拍で枝路を進み、花を3個通った後だけ受信樹へ届けられる
- 枯枝または早すぎる受信でライフを失い、経路と開花状況がリセットされる

## 起動

```sh
cd ver10/game
npm install
npm run dev
```

Enterで開始する。左右キーまたはA/Dで分岐を選び、Spaceで選択中の分岐を切り替える。Escapeでポーズ、Rで最初からやり直す。`npm run verify`でモデルテスト、構文検査、production build、Google Chrome E2Eを実行する。現在は単体9/9、構文検査、production build、Chrome E2E 3/3に合格している。

## 独立性

v1〜v9のコード、素材、文章、固有名詞、世界観、数値、画面構成、ゲームシステムを使用しない。SIGNAL GARDENは空の`ver10/`から新規制作し、標準的なCanvas、Web Audio、固定tick、テスト手法だけを利用する。
