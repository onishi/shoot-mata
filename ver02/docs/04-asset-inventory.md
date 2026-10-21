# 04 アセット台帳

状態: Phase 04進行中（2026-10-21）

状態は `planned / draft / final / verified` を使う。`final` はゲーム投入可能な分離・編集済み素材、`verified` はゲーム内表示と権利を確認した素材だけに付ける。

| ID | ファイル | 用途 | 制作方法・出典 | 権利 | 寸法 / SHA-256 | 状態 |
| --- | --- | --- | --- | --- | --- | --- |
| CONCEPT-STG01-01 | `../assets/concept/stage-01-orbital-wreck-benchmark-v1.png` | 軌道残骸帯の色・質感・奥行き基準 | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1672×941 PNG / `854ebbf4169d5f1c696108eb98255196667362810e340539c02b71975490c70d` | draft |
| PLAYER-01 | `../assets/game/player/player-interceptor-v1.png` | 自機本体と3セル表示 | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1672×941 RGBA PNG、alpha 0〜255 / `604672e3b170a9132b0204c14b95f54bf8b1b4960a499d4323345524789b7724` | final |
| ENEMY-STG01-01 | `../assets/game/enemies/stage-01/salvage-collector-v1.png` | 回収ドローン代表敵 | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1536×1024 RGBA PNG、alpha 0〜254 / `299cd7a24e3575940f676e67581e5aa010d1172fcb12695376e6efbf0c5f8ccd` | final |
| BG-STG01-FAR | `../assets/game/backgrounds/stage-01/orbital-wreck-far-v1.png` | 惑星・星・遠方艦隊 | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1672×941 RGB PNG / `7bf826513523de6a20f9d62af79a76cc48c5484eafb376d11cb37ff61f783454` | final |
| BG-STG01-MID | `../assets/game/backgrounds/stage-01/orbital-wreck-mid-v1.png` | 艦骸・トラス | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1672×941 RGBA PNG、alpha 0〜255 / `d3fbc1a3e09fb8ffd657c898823c241f77d2d43990fbdc2ec98a29cddd688f27` | final |
| BG-STG01-FORE | `../assets/game/backgrounds/stage-01/orbital-wreck-fore-v1.png` | 暗い前景梁 | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1672×941 RGBA PNG、alpha 0〜255 / `fdaeed852671e5ef92a3c7ada55fc4ebebf18c0a057714a27c25b82c639b925f` | final |
| CORE-RED | `../assets/game/cores/reactor-core-red-v1.png` | 赤コア、菱形＋`I` | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1333×1180 RGBA PNG、alpha 0〜255 / `d7a470f36a19c03ceda8b796130e7b00063f217517941be74280b8ff9dea6c12` | final |
| CORE-BLUE | `../assets/game/cores/reactor-core-blue-v1.png` | 青コア、円＋`+` | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1287×1222 RGBA PNG、alpha 0〜255 / `85c69396f03e9a0a26e226007682123c95766e94570610dddaf48de46b7f5090` | final |
| CORE-YELLOW | `../assets/game/cores/reactor-core-yellow-v1.png` | 黄コア、三角＋`◎` | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1364×1153 RGBA PNG、alpha 0〜255 / `70be0a105fea9b457093e3dd6ad5302895b4008181e45b297bbc8f6caa3b5b4e` | final |
| HUD-REACTOR-01 | 未作成 | 3枠・先頭・押し出し予告 | HTML/CSSまたはCanvasのコード表現 | 自作 | — | planned |
| VFX-HIT / DAMAGE / COLLECT | 未作成 | 命中・被弾・回収 | スプライトまたは粒子定義 | 未確認 | — | planned |
| AUDIO-WPN / CORE / UI | 未作成 | 代表効果音セット | Phase 04で制作方法を固定 | 未確認 | — | planned |

## CONCEPT-STG01-01 生成プロンプト

組み込み画像生成を使用。用途は16:9横スクロールシューティングの最終品質基準。軌道残骸帯、左側の三角形自機、右側の球形回収ドローン、惑星、遠景艦隊、前中遠景の艦骸、赤ひし形・青円・黄三角の3コアを指定した。深い藍・炭色、琥珀灯、シアンエンジン、橙赤の敵を配色し、中央飛行回廊の可読性を要求した。他作品の識別可能な機体・敵・構図、文字、ロゴ、商標、透かし、UI、写実写真を禁止した。

完全な実行プロンプトは `assets/concept/stage-01-orbital-wreck-benchmark-v1.prompt.md` に保持する。生成画像は構想基準であり、分離、編集、ゲーム内確認をせず `final` へ上げない。

## PLAYER-01 検査記録

- PNGヘッダーは1672×941、8-bit RGBA、非インターレース。
- `ffmpeg` のalpha抽出で最小0、最大255を確認し、透明背景と不透明な機体画素の双方が存在する。
- 160×90へのLanczos縮小表示で、右向きの外形と3つのシアン・リアクターセルを個別に判別できた。
- 一枚の分離素材としてゲーム投入可能なため `final`。代表ゲーム座標での合成、背景上のコントラスト、被弾・武器状態の表示、権利再確認が未完了のため `verified` ではない。

## ENEMY-STG01-01 検査記録

- PNGヘッダーは1536×1024、8-bit RGBA、非インターレース。
- `ffmpeg` のalpha抽出で最小0、最大254を確認し、完全透明画素と実質不透明なドローン画素の双方が存在する。
- 144×96へのLanczos縮小と濃紺背景上の合成表示で、左向きの単眼、円形・放射状の胴体、右向きの橙色噴射を個別に判別できた。自機の右向き三角外形と3つのシアンセルは使っていない。
- 一枚の分離素材としてゲーム投入可能なため `final`。代表ゲーム座標での合成、背景上のコントラスト、攻撃・被弾・撃破状態、権利再確認が未完了のため `verified` ではない。

## CORE-RED / BLUE / YELLOW 検査記録

- PNGヘッダーは赤1333×1180、青1287×1222、黄1364×1153で、すべて8-bit RGBA、非インターレース。
- `ffmpeg` のalpha抽出で3点とも最小0、最大255を確認し、完全透明画素と不透明画素の双方が存在する。
- 48×48へのLanczos縮小、濃灰背景への合成、グレースケール化後も、赤の菱形＋`I`、青の円＋`+`、黄の三角＋`◎`を相互に識別できた。
- 分離素材としてゲーム投入可能なため `final`。代表ゲーム座標での合成、背景上のコントラスト、出現・回収・排出演出、権利再確認が未完了のため `verified` ではない。

## BG-STG01-FAR / MID / FORE 検査記録

- 3点とも1672×941、8-bit PNG、非インターレース。遠景はRGB、中景と前景はRGBA。
- `ffmpeg` のalpha抽出で中景・前景とも最小0、最大255を確認し、完全透明な飛行回廊画素と不透明な構造物画素の双方が存在する。
- 画面高24〜78%の中央帯に対するalpha平均は中景40.2068/255、前景14.9448/255。中央帯を構造物で塗り潰さず、上端・下端・側面へ密度を寄せている。
- `phases/phase-04/reference-scene/` で遠景0.08、中景0.22、前景0.46の独立速度を割り当て、自機、敵、3コアと16:9ゲーム座標へ合成した。
- Chromeで1440×900、390×844、844×390を計測し、8画像の読込成功、横溢れ0px、16:9維持を確認した。844×390は追加調整後に縦溢れも0px。console warning/errorは0件。
- 分離素材としてゲーム投入可能なため `final`。継ぎ目のない長時間ループ、ゲーム本体への統合、権利再確認が未完了のため `verified` ではない。
