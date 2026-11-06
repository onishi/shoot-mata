# Technical design

- Vite + vanilla ES modules + Canvas 2D。外部runtime依存を持たない。
- `src/model.js`はDOMから独立した純粋な状態遷移とする。
- 盤面更新は入力単位で決定的。描画補間だけrequestAnimationFrameを使う。
- 金属種の移動候補を先に全件計算し、重複先、壁、静止種との競合を除いて同時適用する。
- Node testで規則、衝突、収容、既知解を固定する。
- Playwrightは実キー入力、タイトル、反転、再挑戦、既知解、勝利、ポーズをChromeで検証する。
- Canvasへ動的なaccessible nameを設定し、状態、極性、収容数、操作を伝える。
