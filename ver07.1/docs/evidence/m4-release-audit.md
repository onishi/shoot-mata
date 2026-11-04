# M4 release audit

実施日: 2026-11-04

## 対象

- Google Chrome
- 1280×720 / 640×800
- `release/palimpsest-post-v7.0/`

## 結果

- `npm run verify`: 単体21/21、型検査、production build、Chrome E2E 7/7
- 新規保存状態から全6面を連続完走し、`ARCHIVE COMPLETE`へ到達
- localStorageは最終面までの全6面解放を保持
- console error / warning: 0
- 115フレーム標本のp95描画間隔: 35ms未満
- 2画面幅でCanvasはviewport内に収まり、16:9を維持
- タイトル、設定、ポーズ、終演に欠け、重なり、操作表示の切断なし
- release artifact: 5ファイル。全byte数、SHA-256、HTML参照先の検査に合格

## 証拠

- `m4-complete-through.png`
- `m4-title-1280x720.png`, `m4-title-640x800.png`
- `m4-settings-1280x720.png`, `m4-settings-640x800.png`
- `m4-paused-1280x720.png`, `m4-paused-640x800.png`

## 判定

M4の通し、性能、アクセシビリティ、配布物ゲートを満たす。外部の初見プレイヤー評価は未実施だが、進行不能、入力不能、保存破損、表示欠損、配布欠損は自動検査と開発者目視で認められない。v7.0を完成とする。
