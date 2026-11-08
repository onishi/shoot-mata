# Technical design

- PC Chrome、ES modules、Canvas 2D、Web Audio。640×480の固定論理面をCSSで整数比に近く拡大する。
- `model.js`を描画やDOMから分離し、固定刻み、円周位置、敵進行、響槌の往復、衝突、得点を決定的に更新する。
- M1は外部runtime依存なし。`node:test`で規則、構文検査、クリーンな静的配布対象を検証する。
- M2で`storage.js`に版付きschemaを実装し、設定と到達波を保存する。到達波の上限は`WAVES`定義へ追従する。不正値・破損JSON・保存不能は安全な既定値へ戻し、キー重複は交換する。
- M4でChrome E2E、180フレーム性能、2 viewport、実PCM、クリーンbuild、配布hashを自動化する。

## 状態

`title -> playing -> waveClear | gameOver` をM1で実装。後続で`attract -> creditReady -> playing -> continue -> initials -> ranking -> attract`へ拡張する。
