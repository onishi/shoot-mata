# Technical design

> v10.1追補: 初回の1.8秒lead-inは描画ループの負のaccumulatorで表現し、決定的ルールモデルと固定解法を変更しない。第2庭園は独立したノード表を持つ。v10.0と同じ保存キーを維持し、マイナー更新で設定と到達庭園を引き継ぐ。

## 構成

- Vite + vanilla JavaScript。描画は単一Canvas、補助UIはセマンティックなHTML。
- `src/model.js`はグラフ、分岐、固定拍、開花、ライフ、勝敗だけを扱い、DOMと時刻APIを参照しない。
- `src/main.js`は入力、requestAnimationFrame、Canvas描画、Web Audio、ARIA更新を担当する。
- `src/preferences.js`は音量・動き軽減設定の検証、localStorage入出力、破損値からの復旧を担当し、ゲーム進行モデルと分離する。保存キーは版固有の`signal-garden:v10:settings`とする。
- `src/progress.js`は到達済みの最新庭園だけをversion付きで保存する。保存キーは`signal-garden:v10:progress`とし、拍、経路、開花、ライフは保存しない。不正JSON、範囲外値、将来version、storage拒否は第1庭園へ復旧する。
- 規則更新は1拍を整数stepとして進める。庭園ごとの初期`flowMs`とテンポノードの`flowMs`で拍長だけを変更し、描画補間は規則結果へ影響しない。
- 庭園ごとのノード表を`getGardenNodes`で選び、共通の分岐ID、開花、危険、受信規則へ異なる有向グラフを与える。庭園設定の`syncedSwitches`は一度の入力で反転する分岐index、`heldSwitch`はkeydownからkeyupまでだけ1になる分岐indexを宣言する。

## 状態

- phase: `title | playing | paused | gardenWon | won | lost`
- garden: 現在の庭園index。庭園間ではライフ、開花、経路を初期化する
- node: 現在ノードID
- switches: 3分岐それぞれの0/1予約
- pendingSwitches: 遅延分岐の確定先と残り拍。規則tickごとに減り、0で`switches`へ反映する
- blooms: 3花の真偽値
- lives, steps, selectedSwitch
- heldActive: 第6庭園のCROWNを保持中か。損傷、再挑戦、庭園開始で必ずfalseへ戻す
- settings: `version`, `volume (1 | 0.5 | 0)`, `reducedMotion`。ゲーム進行stateへは含めない
- flowMs: 現在の拍長。第5庭園は1100msで開始し、QUICKENで520ms、CALMで1100msへ決定的に変更する
- progress: `version`, `latestGarden (0..5)`。ゲーム進行stateへ含めず、タイトル開始時の庭園だけを決める

## 検証面

- 単体: 初期化、分岐切替、各花、周回、早すぎる受信、枯枝、ライフ、庭園遷移、遅延確定、予約取消、同期切替、テンポ変更、保持と解放、勝利、ポーズ、再挑戦、設定・進行保存、破損保存復旧。
- E2E: 実キー入力によるタイトル開始、6庭園の切替、遅延予約、同期切替、速度変化、Space保持と解放、開花、周回、終演、失敗、再挑戦、設定と最新庭園の再読み込み保持、console監査。
- 目視: タイトル、通常プレイ、全開花、勝利、敗北を1280×720で確認する。

## 性能予算

- 1280×720の代表プレイで描画p95 20ms未満。
- production JS/CSS合計500kB未満。
