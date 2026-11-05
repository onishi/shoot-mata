# Technical design

## 構成

- buildless ES modules + Viteによる配布build
- `src/model.js`: データ駆動の室、純粋な規則状態、入力、固定tick、照明、衝突、勝敗
- `src/main.js`: Canvas描画、キー入力、固定step、Web Audio、ARIA
- `src/preferences.js`: 設定と到達室の検証、localStorage読み書き、安全な復旧
- `tests/model.test.js`: Node標準テストによる規則回帰
- `e2e/candlewick.spec.js`: Google Chromeへの実キー入力と主要画面検証

## 決定性

モデルは整数セル、整数tick、列挙入力だけを受け取る。描画時刻や乱数を規則へ入れない。番人の同距離選択はtickと固定優先順で決める。

## 状態

`title | playing | paused | won | lost`を持つ。プレイ状態は室index、プレイヤー座標、番人座標と巡回方向、灯油、強灯要求、回収済み星種、燐ごとの残光tick、残火、tickから成る。室データは壁、開始位置、番人、星種、出口、鏡、燐を持つ。

## 永続化

version付きJSONへ最大到達室、音量、画面揺れ、明滅軽減を保存する。形状、型、列挙値、室範囲を全件検証し、一つでも不正なら安全な初期値へ戻す。storageの読み書き例外はゲーム進行を止めない。

## 照明

`isPointLit`を描画上の唯一の点灯判定とする。通常灯／強灯のプレイヤー中心半径に加え、強灯半径内の鏡から方向ベクトルへセル単位で反射線を伸ばし、最初の壁で止める。燐は強灯の直接光を受けると20tickを記録し、残光中は半径1.45セルを点灯する。反射線と残光は規則座標と固定tickから決定的に導出し、描画時刻へ依存しない。

## アクセシビリティ

Canvasをフォーカス可能にし、状態に追従する`aria-label`を付ける。回収、被弾、扉解放、勝敗は画面外live regionへ同じモデルイベントから通知する。色だけで状態を伝えない。
