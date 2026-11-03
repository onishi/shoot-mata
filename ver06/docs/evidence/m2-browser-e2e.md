# M2 Browser E2E evidence

実施日: 2026-11-03

## 自動検証

- `npm run verify`: 合格
- Vitest: 16/16
- TypeScript: 合格
- production build: 合格
- Playwright / Google Chrome: 3/3
- console error / warning: 0件

E2Eは製品のキーボード入力だけを使い、ポーズ、FIRST RAINの無操作敗北、FIRST RAIN・SHORE CALL・SPLIT CURRENTの連続勝利、設定保存復元を通した。Playwrightの仮想時計はrequestAnimationFrameを進めるためにだけ使い、ゲーム状態は直接変更していない。

## Viewportと目視

- 1280×720: タイトル、設定、プレイ、ポーズがviewport内に収まり、Canvasは16:9を維持した。
- 640×800: Canvas下の状態表示と設定カードがviewport内に収まり、文字の欠けと重なりはなかった。
- `m2-e2e-campaign-complete.png`: SPLIT CURRENTを耐久3、6排除、波紋残量1で完了した最終画面。
- `m2-e2e-title-1280x720.png` / `m2-e2e-title-640x800.png`: 両viewportのタイトル。
- `m2-e2e-settings-1280x720.png` / `m2-e2e-settings-640x800.png`: 両viewportの設定。
- `m2-e2e-paused-1280x720.png` / `m2-e2e-paused-640x800.png`: 両viewportのポーズ。

## 発見と修正

初回実行でfaviconの404をconsole errorとして検出し、池と波紋を表す固有SVGを追加した。画像目視では狭幅ポーズ画面の補助文言が`Enter: retry · R: restart`となり実操作と一致しない問題を発見した。`Escape: resume · S: settings · R: restart`へ修正し、E2Eで文言を固定した。
