# M4 final audit

実施日: 2026-11-06

## 結果

- 単体テスト: 29/29
- 構文検査: 合格
- production build: 合格
- Chrome E2E: 12/12
- 全6空域通し: 新規保存から実キー入力で18片回収と終演へ到達
- console error / warning: 0件（通しプレイ中）
- viewport: 1280×720、640×800でCanvas包含と16:9を確認
- キーボード・ARIA: Tab、Enter、S、矢印、Escapeでフォーカス、開始、設定、ポーズを確認
- フレーム間隔: 180標本、p95 16.70ms、最大16.80ms
- 配布物: 5ファイル、21,542 bytes、外部runtimeなし、全SHA-256一致

## 目視証拠

- `m4-title-1280x720.png` / `m4-title-640x800.png`
- `m4-settings-1280x720.png` / `m4-settings-640x800.png`
- `m4-paused-1280x720.png` / `m4-paused-640x800.png`
- `m4-last-horizon-640x800.png`
- `m4-finale-640x800.png`

両viewportでタイトル、設定、ポーズ、最終航路、終演に文字切れや意図しない重なりはない。小画面でも雲、下降気流、音門、片、凧、糸、張力、結果文を判別できる。

## 監査中に修正した欠陥

初回の1280×720監査で、Canvasへ`max-height`だけが適用され、幅が追従せず約1.83:1に横伸びすることを検出した。親要素の幅をviewport幅、利用可能高さから算出した16:9幅、上限幅の最小値に変更した。再監査では両viewportで16:9と画面内包含に合格した。
