# M4 release audit

実施日: 2026-11-04

## 通し

- Google Chromeへ実キーボード入力を送り、FIRST RAINの代表敗北、ポーズ、全8面勝利、ECHO TIDE勝利、終演まで完走した。
- console error / warningは0件だった。
- 1280×720と640×800でタイトル、設定、プレイ、ポーズのCanvas・設定カード境界と16:9比率を検査した。

## 性能

- runtime ceilingは同時胞子24、波紋6。
- 全8面の定義が上限内であることを単体テストで検査した。
- 24胞子と6波紋を同時に持つ状態の60Hz更新を3,600回実行し、1秒未満で完了することを検査した。
- production bundleはJavaScript 23.80 kB、CSS 2.84 kB、HTML 2.19 kB。外部runtime requestはない。

## アクセシビリティ

- 開始後はCanvasへフォーカスする。
- プレイ中の読み上げ名に面名、耐久、波紋残量、残り秒数、接近胞子数を含める。
- 終演の読み上げ名に全8面完了とEnterによる再開を含める。
- 設定overlayは`role="dialog"`と`aria-modal="true"`を持ち、音量、高コントラスト、モーション軽減をキーボードだけで変更できる。
- live regionは開始、残量、補充、被弾、勝敗、終演遷移を通知する。

## Release artifact

- `npm run release`で`release/ripplekeep-v6.0/`を生成する。
- artifactは`index.html`、ハッシュ付きJavaScript/CSS、favicon、配布README、各ファイルのサイズとSHA-256を持つ`manifest.json`から成る。
- HTTP serverでartifact directoryを配信すれば起動できる。

## 最終判定

`npm run verify`は単体29/29、型検査、production build、Google Chrome E2E 3/3に合格した。M4の機械的完成条件を満たす。公開前には人間の初見理解、実時間入力、音の聴感だけを別途評価する。
