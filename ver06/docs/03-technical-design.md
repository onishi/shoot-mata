# Technical design

## 構成

- TypeScript + Canvas 2D + Web Audio
- Viteによる開発・production build
- 規則モデルはDOMと描画から分離し、60Hz固定刻みで決定的に更新する
- Vitestでスポーン、波紋、被弾、補充、勝敗、固定入力の到達性を検証する

## 状態

`title / playing / paused / won / lost`を明示し、ゲーム状態は面ID、プレイヤー、月花耐久、波紋残量、経過時間、胞子、波紋、スコアから成る。面定義は名前、目的文、制限時間、スポーン列を持ち、同じ決定的モデルで実行する。

## 性能予算

- 1280×720で60fpsを目標
- 同時胞子24、波紋6を上限とする
- 外部runtime requestを不要にする

## 製品設定

音量、高コントラスト、モーション軽減を`ripplekeep:v6:settings`へ保存する。読込時はJSONの構造、型、音量範囲を検証し、不正値は削除して既定値へ戻す。保存APIが利用不能でもゲームを止めない。

## 今後

M2でPlaywrightの実Chrome入力、viewport境界、入力ラッチを追加する。
