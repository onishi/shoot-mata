# M3 DEW CROSSING evidence

検証日: 2026-11-04

## 規則

- 移動する月花へ4群9体を配置し、各群に短い波紋を1回ずつ必要とする。
- 2.0秒、7.0秒、11.0秒まで初期3波紋を使い、補充せず16.0秒の第4波紋を試みる経路は、最終3体が月花へ到達して敗北する。
- 第2群の後、7.1〜8.7秒に左下の岸へ離れて露を1回集め、航路へ戻って11.0秒と16.0秒に放つ経路は、耐久3、9排除、残量0で勝利する。

## Chrome実入力

- Google Chromeへ矢印とSpaceを送り、タイトルからDEW CROSSINGまで7面を連続クリアした。
- `m3-dew-crossing-playing.png`で、点線航路、月花、アメンボ、最終群、岸の輪、残量0のHUDを目視した。
- 初回画像で長い目的文が残り時間へ重なる問題を発見し、文言を短縮してDEW CROSSINGだけ15pxへ調整した。
- `m3-dew-crossing-complete.png`で、耐久3、9排除、結果overlayを確認した。console error / warningは0件だった。

## 自動検証

- 単体25/25、型検査、production build、Google Chrome E2E 3/3。
- E2Eは製品入力だけを使い、DEW CROSSING終了時の耐久3、9排除、波紋残量0を検査する。
