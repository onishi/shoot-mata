# Technical design

## 構成

- Vite + vanilla JavaScript。描画は単一Canvas、補助UIはセマンティックなHTML。
- `src/model.js`はグラフ、分岐、固定拍、開花、ライフ、勝敗だけを扱い、DOMと時刻APIを参照しない。
- `src/main.js`は入力、requestAnimationFrame、Canvas描画、Web Audio、ARIA更新を担当する。
- 規則更新は1拍を整数stepとして進める。描画補間は規則結果へ影響しない。

## 状態

- phase: `title | playing | paused | gardenWon | won | lost`
- garden: 現在の庭園index。庭園間ではライフ、開花、経路を初期化する
- node: 現在ノードID
- switches: 3分岐それぞれの0/1予約
- pendingSwitches: 遅延分岐の確定先と残り拍。規則tickごとに減り、0で`switches`へ反映する
- blooms: 3花の真偽値
- lives, steps, selectedSwitch

## 検証面

- 単体: 初期化、分岐切替、各花、周回、早すぎる受信、枯枝、ライフ、庭園遷移、遅延確定、予約取消、勝利、ポーズ、再挑戦。
- E2E: 実キー入力によるタイトル開始、2庭園の切替、遅延予約、開花、周回、勝利、失敗、再挑戦、console監査。
- 目視: タイトル、通常プレイ、全開花、勝利、敗北を1280×720で確認する。

## 性能予算

- 1280×720の代表プレイで描画p95 20ms未満。
- production JS/CSS合計500kB未満。
