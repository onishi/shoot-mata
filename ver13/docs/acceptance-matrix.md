# Acceptance matrix

| ID | 要件 | 段階 | 証拠 | 状態 |
| --- | --- | --- | --- | --- |
| CORE-01 | 円周移動と一つの響槌の往復 | M1 | `tests/model.test.js`, Chrome実操作 | 合格 |
| CORE-02 | 往路と復路で異なる結果 | M1 | `tests/model.test.js` | 合格 |
| CORE-03 | 回収成功／失敗と連撃 | M1 | `tests/model.test.js` | 合格 |
| CORE-04 | 敵到達、耐久、勝敗 | M1 | `tests/model.test.js` | 合格 |
| CORE-05 | 波進行と往路を防ぐ装甲敵 | M2 | 単体8/8、実キー2波進入、`m2-wave-brief-1280x720.png`、`m2-guard-block-1280x720.png` | 合格 |
| CORE-06 | 約2倍速・一撃停止の高速敵と第3波 | M2 | `tests/model.test.js`、Chrome実キー3波通し28,400点・BELL 3、`m2-wave3-brief-1280x720.png`、`m2-rusher-1280x720.png` | 合格 |
| CORE-07 | 横移動を予告するORBITERの単独導入、固定敵との混成、3種同時の第2幕山場 | M3 | `tests/model.test.js`、単体28/28、`m3-act2-audit.json`、`m3-act2-orbiter-1280x720.png`、`m3-act2-climax-640x480.png` | 合格 |
| CORE-08 | 第1・2幕守護者の3段階復路封印、方位・速度・横移動変化、鐘打撃後の撤退、幕終演 | M3 | `tests/model.test.js`、単体32/32、`m3-guardian-audit.json`、`m3-guardian-brief-1280x720.png`、`m3-guardian-phase3-640x480.png` | 合格 |
| CORE-09 | DANCERの往路命中反応移動、追従回収、第7波単独導入、第8波混成、第9波4種山場、第3守護者 | M3 | `tests/model.test.js`、単体36/36、`m3-act3-audit.json`、`m3-act3-dancer-1280x720.png`、`m3-act3-dancer-640x480.png` | 合格 |
| CORE-10 | REFRACTORの折返し反応移動、復路先読み、第10波単独導入、第11波混成、第12波5種山場、第4守護者 | M3 | `tests/model.test.js`、単体39/39、`m3-act4-audit.json`、`m3-act4-guardian-audit.json`、4画面 | 合格 |
| CORE-11 | MIRRORのレバー逆歩、交差線攻略、第13波単独導入、第14波反応敵混成、第15波6種山場、第5守護者 | M3 | `tests/model.test.js`、単体42/42、`m3-act5-audit.json`、`m3-act5-guardian-audit.json`、4画面 | 合格 |
| CORE-12 | CHORISTERの投擲反応移動、予告先投擲、第16波単独導入、第17波反応敵混成、第18波全8種最終試験、第6守護者 | M3 | `tests/model.test.js`、単体45/45、`m3-act6-audit.json`、`m3-final-audit.json`、3画面 | 合格 |
| SAVE-01 | 版付き設定・到達波保存と安全な復旧 | M2 | `tests/storage.test.js`、Chrome第3波保存値2・再読込・ゲームオーバー後復帰監査 | 合格 |
| SCALE-01 | 6幕18波6守護者 | M3 | `tests/model.test.js`、単体45/45、第18波Chrome保存再開、全幕実時間通しはSCALE-02で実施 | 合格 |
| SCALE-02 | 初見18〜28分／習熟14〜20分 | M3 | `npm run audit:campaign`で習熟14.67分・初見代理18.29分、`npm run audit:browser-campaign`と`m3-browser-campaign-audit.json`で新規Chromeの全18波×三陣・6守護者を14.19分・BELL 1・console error 0で完走 | 合格 |
| ARCADE-01 | 4:3、レバー＋1ボタン、遠目の状態 | M1 | 640×480／1280×720画面 | 合格 |
| ART-01 | 第1幕代表区間の背景、鐘、守り手、敵、響槌、即時演出が完成表現 | M2 | 単体24/24、`m2-art-audit.json`、`m2-art-action-1280x720.png`、`m2-art-catch-640x480.png` | 合格 |
| ARCADE-02 | アトラクトからランキング復帰 | M4 | 単体23/23、Chromeのアトラクト→自動実演→コイン割込み→START、`m2-cabinet-audit.json`、3画面；コンティニュー・成績・ランキング復帰は未実装 | 部分合格 |
| AUDIO-01 | BGM、即時効果音、状態ジングル | M4 | `tests/audio.test.js`、`tests/model.test.js`、`m2-audio-audit.json`；実PCM・聴感の最終監査はM4 | 部分合格 |
| ACCESS-01 | キー再配置、音量、動き軽減、非色依存 | M4 | 単体13/13、Chrome設定・`Z`投擲、`m2-settings-1280x720.png`・`m2-settings-640x480.png`；実音量と全画面監査はM4 | 部分合格 |
| RELEASE-01 | clean build、hash、公開URL、旧版保持 | M5 | manifest・本番監査 | 未着手 |
