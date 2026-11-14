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
| ARCADE-02 | アトラクトからランキング復帰 | M4 | 単体51/51、Chromeのアトラクト→自動実演→コイン→START、敗北→10秒コンティニュー→同波復帰、3文字入力→上位5件→アトラクト復帰、`m2-cabinet-audit.json`、`m4-cabinet-flow-audit.json`、`m4-continue-offer-1280x720.png`、`m4-ranking-1280x720.png` | 合格 |
| AUDIO-01 | 6幕BGM変奏、即時効果音、状態ジングル、停止・音量 | M4 | `tests/audio.test.js`、`tests/model.test.js`、`npm run audit:audio`、`m4-audio-pcm-audit.json`で48kHz実PCM全27音・6曲・重畳・停止状態を監査 | 合格 |
| ACCESS-01 | キー再配置、音量、動き軽減、非色依存 | M4 | 単体52/52、`npm run audit:audio`、`npm run audit:quality`で動き軽減ON・`Z`投擲の全編完走、2 viewport全画面比較 | 合格 |
| QUALITY-01 | 60fps、保存破損、全主要画面、勝利後成績導線 | M4 | `m4-quality-audit.json`で60.00fps・破損復旧・14.69分完走・勝利`BBB`首位・console error 0、12状態×2 viewportの24画面 | 合格 |
| CRITIQUE-01 | 第一批評で初回理解、危険視認、失敗復帰、波規則表示を改善し、規模と筐体フローを非退行にする | M5 | `06-v13.1-critique.md`、`tests/model.test.js`、版assert付き`npm run audit:quality`で15.55分・全18波三陣・6守護者・60fps・console error 0、24画面 | 合格 |
| CRITIQUE-02 | 第二批評で得点選択、CHAIN節目、最終試験、成績ランクを改善し、規模と筐体フローを非退行にする | M5 | `07-v13.2-critique.md`、57/57、決定的14.66分／18.28分、版assert付きChrome 15.81分・RANK B・60fps・console error 0、24画面 | 合格 |
| RELEASE-01 | clean build、hash、公開URL、旧版保持 | M5 | `m5-release-manifest.json`でクリーン6ファイル82,998 bytesのSHA-256を固定。ローカルPages候補でトップ、v13.2、v13.1、v13.0、v12.2以下の14経路と12 hash応答を検査し、`m5-production-runtime-audit.json`でアトラクト→START→第1波、BELL 3、console error 0を確認 | ローカルRelease Candidate合格・本番未確認 |
