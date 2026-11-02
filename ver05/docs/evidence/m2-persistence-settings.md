# M2 進行保存・設定 evidence

実施日: 2026-11-03

## 対象

- version付きlocalStorage
- 解除済み部屋の選択と安全な再訪
- 音量、動きの軽減
- 破損・旧versionデータからの復帰

## 自動検証

`ver05/game`で`npm run verify`を実行し、単体18/18、TypeScript型検査、Vite production buildが合格した。

追加した保存テストは、次室解除、最終室の上限、途中譜面を保存しないschema、設定の保存往復、破損JSON、未知version、範囲外部屋、localStorage例外を対象とする。

## Chrome実画面

1. 初回タイトルで`1 / 4 FIRST CHORD`だけが選択対象であることを確認した。
2. `S`から設定を開き、音量を50%から75%、動きの軽減をOFFからONへ変更した。
3. 再読み込み後に設定画面を開き、75%とONが復元されたことを目視した。
4. FIRST CHORDを固定解法でクリアし、再読み込み後のタイトルが`2 / 4 HELD NOTE`を選択していることを確認した。
5. 左入力でFIRST CHORDへ戻って開始し、PHRASE 1、0/8 BEATS、2つのVOICEがemptyであることを確認した。
6. タイトル、設定、勝利、再訪盤面に文字欠けや重なりはなく、Chrome consoleのwarning/errorは0件だった。

## 結論

進行と設定は再読み込みを越えて復元され、試行途中の状態は持ち越さない。保存データが利用不能でも初期状態からプレイ可能なため、M2の保存・設定条件を満たす。
