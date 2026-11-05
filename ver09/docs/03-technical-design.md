# Technical design

## 構成

- buildless ES modules + Viteによる配布build
- `src/model.js`: 純粋な規則状態、入力、固定tick、衝突、勝敗
- `src/main.js`: Canvas描画、キー入力、固定step、Web Audio、ARIA
- `tests/model.test.js`: Node標準テストによる規則回帰
- `e2e/candlewick.spec.js`: Google Chromeへの実キー入力と主要画面検証

## 決定性

モデルは整数セル、整数tick、列挙入力だけを受け取る。描画時刻や乱数を規則へ入れない。番人の同距離選択はtickと固定優先順で決める。

## 状態

`title | playing | paused | won | lost`を持つ。プレイ状態はプレイヤー座標、番人座標と巡回方向、灯油、強灯要求、回収済み星種、残火、tickから成る。

## アクセシビリティ

Canvasをフォーカス可能にし、状態に追従する`aria-label`を付ける。回収、被弾、扉解放、勝敗は画面外live regionへ同じモデルイベントから通知する。色だけで状態を伝えない。
