# Asset inventory

外部素材は使用しない。全要素はv12用のCanvas描画、CSS、Web Audio合成として新規制作した。

| 区分 | 用途 | 制作方法・権利 | 完成状態 | ゲーム内確認先 |
| --- | --- | --- | --- | --- |
| 背景 | 炉床、鋳型、火花、鉄塊、軸極、4:3筐体帯 | Canvas 2D手続き描画、自作 | M3完成、M4演出拡張予定 | 全6室、`m3-crown-crucible.png` |
| キャラクター | 鍛冶師、3種の金属種、内向き／外向き極性印 | Canvas 2D手続き描画、自作 | M3完成 | `m1-first-field.png`、`m3-crown-crucible.png` |
| UI | HUD、自動実演アトラクト、コイン、START待ち、得点、FORGE HEAT、ゲームオーバー、コンティニュー、ポーズ、室完成、終演、設定、イニシャル、ランキング | Canvas 2D描画とCSS、自作 | M4筐体フロー完成 | `m4-attract-demo.png`、`m4-gameover.png`、`m4-continue-ready.png`、`m4-initials.png`、`m4-ranking.png` |
| エフェクト | 磁力線、脈動、収容強調 | Canvas 2D手続き描画、自作 | M2完成、動き軽減対応 | `m1-first-field.png` |
| 効果音 | コイン、移動、停止、反転、収容、開始、室完成、最終炉、ゲームオーバー、ランキング | Web Audio oscillator＋FM合成、自作 | M4完成、音量・ミュート対応 | 音響状態E2E、`tests/audio.test.js` |
| 音楽 | 4秒16拍の炉床主題 | Web Audio矩形波・三角波＋FM合成、自作 | M4完成。プレイ中循環、ポーズ・勝利で停止 | 音響状態E2E、`tests/audio.test.js` |
