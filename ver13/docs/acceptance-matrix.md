# Acceptance matrix

| ID | 要件 | 段階 | 証拠 | 状態 |
| --- | --- | --- | --- | --- |
| CORE-01 | 円周移動と一つの響槌の往復 | M1 | `tests/model.test.js`, Chrome実操作 | 合格 |
| CORE-02 | 往路と復路で異なる結果 | M1 | `tests/model.test.js` | 合格 |
| CORE-03 | 回収成功／失敗と連撃 | M1 | `tests/model.test.js` | 合格 |
| CORE-04 | 敵到達、耐久、勝敗 | M1 | `tests/model.test.js` | 合格 |
| CORE-05 | 波進行と往路を防ぐ装甲敵 | M2 | 単体8/8、実キー2波進入、`m2-wave-brief-1280x720.png`、`m2-guard-block-1280x720.png` | 合格 |
| SCALE-01 | 6幕18波6守護者 | M3 | 全幕通し | 未着手 |
| SCALE-02 | 初見18〜28分／習熟14〜20分 | M3 | 分離した実ブラウザ監査 | 未着手 |
| ARCADE-01 | 4:3、レバー＋1ボタン、遠目の状態 | M1 | 640×480／1280×720画面 | 合格 |
| ARCADE-02 | アトラクトからランキング復帰 | M4 | Chrome筐体フロー | 未着手 |
| AUDIO-01 | BGM、即時効果音、状態ジングル | M4 | 実PCM・聴感監査 | 未着手 |
| ACCESS-01 | キー再配置、音量、動き軽減、非色依存 | M4 | 設定E2E・画面 | 未着手 |
| RELEASE-01 | clean build、hash、公開URL、旧版保持 | M5 | manifest・本番監査 | 未着手 |
