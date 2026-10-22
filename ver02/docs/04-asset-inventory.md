# 04 アセット台帳

状態: Phase 04代表素材完了・製品全量はPhase 06〜07で継続（2026-10-23）

状態は `planned / draft / final / verified` を使う。`final` はゲーム投入可能な分離・編集済み素材、`verified` はゲーム内表示と権利を確認した素材だけに付ける。

| ID | ファイル | 用途 | 制作方法・出典 | 権利 | 寸法 / SHA-256 | 状態 |
| --- | --- | --- | --- | --- | --- | --- |
| CONCEPT-STG01-01 | `../assets/concept/stage-01-orbital-wreck-benchmark-v1.png` | 軌道残骸帯の色・質感・奥行き基準 | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1672×941 PNG / `854ebbf4169d5f1c696108eb98255196667362810e340539c02b71975490c70d` | draft |
| PLAYER-01 | `../assets/game/player/player-interceptor-v1.png` | 自機本体と3セル表示 | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1672×941 RGBA PNG、alpha 0〜255 / `604672e3b170a9132b0204c14b95f54bf8b1b4960a499d4323345524789b7724` | final |
| ENEMY-STG01-01 | `../assets/game/enemies/stage-01/salvage-collector-v1.png` | 回収ドローン代表敵 | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1536×1024 RGBA PNG、alpha 0〜254 / `299cd7a24e3575940f676e67581e5aa010d1172fcb12695376e6efbf0c5f8ccd` | final |
| ENEMY-STG01-02 | `../assets/game/enemies/stage-01/salvage-weaver-v1.png` | 蛇行する回収ドローン | OpenAI組み込み画像生成、2026-10-22。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 768×512 RGBA PNG、alpha 0〜255 / `2e6fd3d1ee2abbe1869ab71e3aaee16eb54efd983b6024a76760799ac094753e` | final |
| ENEMY-STG01-03 | `../assets/game/enemies/stage-01/wreck-bulwark-v1.png` | 低速重装の解体艇 | OpenAI組み込み画像生成、2026-10-22。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 768×512 RGBA PNG、alpha 0〜255 / `12a83e326b3c5b0a27c33a27e04ea8c77bbbdca7ecbcbe9031b3b627c41eccf2` | final |
| BOSS-STG01-01 | `../assets/game/bosses/stage-01/wreck-warden-v1.png` | 第1面ボス・残骸監督機 | OpenAI組み込み画像生成、2026-10-22。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 768×640 RGBA PNG、alpha 0〜255 / `862c505f84fc31407f9eecd6e2cf261af9b094728fc9db34003172422adf2424` | final |
| ENEMY-STG02-01 | `../assets/game/enemies/stage-02/cloud-skimmer-v1.png` | 気流蛇行機 | OpenAI組み込み画像生成、2026-10-22。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1536×1024 RGBA PNG、alpha 0〜254 / `6a7179de6d5f475540d5f112cb3659ace7230f634cefa945e010038815cde1ad` | final |
| ENEMY-STG02-02 | `../assets/game/enemies/stage-02/shutter-turret-v1.png` | 低速遮蔽砲台 | OpenAI組み込み画像生成、2026-10-22。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1536×1024 RGBA PNG、alpha 0〜254 / `a283491994d607db83bfc3f4f67321b9d2737a0b1b0be7c1e449d631f07ad3c8` | final |
| ENEMY-STG02-03 | `../assets/game/enemies/stage-02/storm-diver-v1.png` | 追尾急降下機 | OpenAI組み込み画像生成、2026-10-22。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1536×1024 RGBA PNG、alpha 0〜254 / `f17f2f929b25ffeb77cc4f05841087a5fe622e72dba0e6504ff42e2119b06330` | final |
| BOSS-STG02-01 | `../assets/game/bosses/stage-02/refinery-guardian-v1.png` | 第2面ボス・精製守護機 | OpenAI組み込み画像生成、2026-10-22。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1536×1024 RGBA PNG、alpha 0〜254 / `6176247c64f75723508bb1a4358014fa98518326062e2cc4751782018294bbca` | final |
| BG-STG01-FAR | `../assets/game/backgrounds/stage-01/orbital-wreck-far-v1.png` | 惑星・星・遠方艦隊 | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1672×941 RGB PNG / `7bf826513523de6a20f9d62af79a76cc48c5484eafb376d11cb37ff61f783454` | final |
| BG-STG01-MID | `../assets/game/backgrounds/stage-01/orbital-wreck-mid-v1.png` | 艦骸・トラス | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1672×941 RGBA PNG、alpha 0〜255 / `d3fbc1a3e09fb8ffd657c898823c241f77d2d43990fbdc2ec98a29cddd688f27` | final |
| BG-STG01-FORE | `../assets/game/backgrounds/stage-01/orbital-wreck-fore-v1.png` | 暗い前景梁 | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1672×941 RGBA PNG、alpha 0〜255 / `fdaeed852671e5ef92a3c7ada55fc4ebebf18c0a057714a27c25b82c639b925f` | final |
| BG-STG02-FAR | `../assets/game/backgrounds/stage-02/cloud-refinery-far-v1.png` | ガス惑星、雲海、遠方精製塔、稲光 | OpenAI組み込み画像生成、2026-10-22。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1672×941 RGB PNG / `69a4ddab843000c5d86ba11a2f39dd90bfc56786d836270737f51b9b1749ce2a` | final |
| BG-STG02-MID | `../assets/game/backgrounds/stage-02/cloud-refinery-mid-v1.png` | 浮遊塔、配管橋、吸気タービン | OpenAI組み込み画像生成、2026-10-22。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1672×941 RGBA PNG、alpha 0〜255 / `f3fb54f83479a046be0f5981db0982147da7bb31371f1405b781e4de087d7458` | final |
| BG-STG02-FORE | `../assets/game/backgrounds/stage-02/cloud-refinery-fore-v1.png` | 近接配管、遮蔽レール、碍子 | OpenAI組み込み画像生成、2026-10-22。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1672×941 RGBA PNG、alpha 0〜255 / `73713739d7c82ceb90177e6228488e1f39af81323cb76dce4a91f2f7e7b58bee` | final |
| BG-STG03-FAR | `../assets/game/backgrounds/stage-03/living-ark-far-v1.png` | 外殻越しの星空、遠方膜、発光器官 | OpenAI組み込み画像生成、2026-10-23。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1672×941 RGB PNG / `89e09630fd4a53f9f55ef14c926d9f762a9435d648d7dbd55561a219bd4bed22` | final |
| BG-STG03-MID | `../assets/game/backgrounds/stage-03/living-ark-mid-v1.png` | 半透明組織、軟骨肋、増殖節 | OpenAI組み込み画像生成、2026-10-23。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1672×941 RGBA PNG、alpha 0〜255 / `2b243dd455953081d4775845e8b5fc3673d7817a3a22f8ea7e0bc706afeb44f7` | final |
| BG-STG03-FORE | `../assets/game/backgrounds/stage-03/living-ark-fore-v1.png` | 近接外殻、繊維膜、休眠増殖節 | OpenAI組み込み画像生成、2026-10-23。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1672×941 RGBA PNG、alpha 0〜255 / `eb35820364bfac26da987cf37d5bcd873c47bfdbacafc36860d35bf2c980771b` | final |
| CORE-RED | `../assets/game/cores/reactor-core-red-v1.png` | 赤コア、菱形＋`I` | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1333×1180 RGBA PNG、alpha 0〜255 / `d7a470f36a19c03ceda8b796130e7b00063f217517941be74280b8ff9dea6c12` | final |
| CORE-BLUE | `../assets/game/cores/reactor-core-blue-v1.png` | 青コア、円＋`+` | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1287×1222 RGBA PNG、alpha 0〜255 / `85c69396f03e9a0a26e226007682123c95766e94570610dddaf48de46b7f5090` | final |
| CORE-YELLOW | `../assets/game/cores/reactor-core-yellow-v1.png` | 黄コア、三角＋`◎` | OpenAI組み込み画像生成、2026-10-21。完全なプロンプトは同名 `.prompt.md` | リリース前にOpenAI生成物の利用条件と独自性を再確認 | 1364×1153 RGBA PNG、alpha 0〜255 / `70be0a105fea9b457093e3dd6ad5302895b4008181e45b297bbc8f6caa3b5b4e` | final |
| HUD-REACTOR-01 | `../phases/phase-04/reference-scene/` | 3枠・先頭・押し出し予告 | HTML/CSS/JSのコード表現、2026-10-21 | 自作 | 正規化面積11.69%、本文12px以上、操作対象44px以上 | final |
| VFX-HIT / DAMAGE / COLLECT | `../phases/phase-04/reference-scene/` | 命中・被弾・回収 | HTML/CSSのコード表現、2026-10-21 | 自作 | 十字閃光 / 破線二重環 / 内向き山形 | final |
| AUDIO-REF-01 | `../assets/audio/reference/` | 3武器発射、コア回収・装填、UI決定、第1面リズム層 | 自作の決定的合成コード、2026-10-21。`manifest.json`と`generate-reference-audio.mjs` | 自作、外部サンプル0 | 48kHz mono PCM16 WAV×7、527,348 bytes。個別SHA-256はmanifest | final |
| AUDIO-STG02-01 | `../assets/audio/stage-02/` | 第2面リズム・旋律・危機/Bossの3層、導入・クリア通知 | 自作の決定的合成コード、2026-10-22。`manifest.json`と`generate-stage-02-audio.mjs` | 自作、外部サンプル0 | 48kHz mono PCM16 WAV×5、1,286,620 bytes。個別SHA-256はmanifest | final |

制作原本は上表のPNGを保持し、製品buildは `../assets/delivery/` のWebPを参照する。配信派生物21点の寸法、圧縮方式、byte数、SHA-256、復号画素差は `../assets/delivery/asset-optimization-audit.json` を正本とする。背景9点はlossy RGB・lossless alpha、actor・boss・コア12点は縮小後losslessで、原本の権利・出典・promptは上表から継承する。

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

## ENEMY-STG01-02 / 03・BOSS-STG01-01 検査記録

- 組み込み画像生成で制作し、生成原寸からLanczosで敵2点を768×512、ボスを768×640へ縮小した。全点8-bit RGBA、非インターレースで、alpha最小0・最大255を確認した。
- ウィーバーは三日月状、ブルワークは幅広い矩形シールド状、残骸監督機は上下の破砕腕を持つ要塞状とし、円形Collectorと外形を重複させていない。
- `stage-01-orbital-wreck.mjs`、Canvas asset manifest、静的buildへ接続し、通常敵3 IDとboss IDが表示snapshotへ到達する自動検査に合格した。Chromeの通常戦でCollectorの合成表示と画像欠落0を確認した。
- 分離素材としてゲーム投入可能なため `final`。ウィーバー、ブルワーク、ボス各々の実ブラウザ画面、攻撃・被弾・撃破アニメーション、権利再確認が未完了のため `verified` にはしていない。

## ENEMY-STG02-01〜03・BOSS-STG02-01 検査記録

- 4点とも1536×1024、8-bit RGBA PNG、非インターレースで、alpha最小0・最大254を確認した。組み込み画像生成の完全なpromptを各同名`.prompt.md`へ保存した。
- 気流蛇行機は横広の三日月、遮蔽砲台は幅広の矩形装甲、急降下機は斜めの槍／鉤、精製守護機は縦長の塔／砂時計状とし、役割ごとの外形を重複させていない。全敵は左向き橙赤発光で、右向き三角形とシアン3セルを持つ自機から分離した。
- 配信版は敵3点を384×256、bossを512×427のlossless WebPへ縮小し、RGB・alpha差0。4点合計409,614 bytes、背景込み第2面996,632 bytesで面別2.25 MiB予算内。
- stage data、asset manifest、表示snapshotへ4 IDを接続し、通常敵3種とbossのID到達を自動検査した。製品画面の第2面選択とブラウザ通し、攻撃・被弾・撃破アニメーション、権利再確認が未完了のため`verified`ではない。

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

## BG-STG02-FAR / MID / FORE 検査記録

- 3点とも1672×941、8-bit PNG、非インターレース。遠景はRGB、中景と前景はRGBAで、両alphaの最小0・最大255を確認した。
- 遠景はガス惑星の雲海と遠方精製塔、中景は浮遊塔・配管橋・吸気タービン、前景は暗い配管・遮蔽レール・碍子へ役割を分離した。中景と前景は中央飛行回廊を透明に保つ。
- 配信版は3点とも1280×720 lossy WebP、alpha最大差0。遠景・中景・前景の平均RGB誤差は2.496・3.614・3.617/255、PSNRは36.651・33.951・33.574dB、合計587,018 bytesで第2面2.25 MiB予算内。
- asset manifestと静的buildへ背景3 IDを接続した。敵3種とbossが未制作のため製品画面とブラウザ通しはまだ行わず、状態は`final`に留める。主観的な見た目、長時間ループの継ぎ目、権利再確認も未確認。

## BG-STG03-FAR / MID / FORE 検査記録

- 3点とも1672×941、8-bit PNG、非インターレース。遠景はRGB、中景と前景はRGBAで、両alphaの最小0・最大255を確認した。
- 遠景は外殻越しの星空と遠方の膜・発光器官、中景は半透明組織・軟骨肋・増殖節、前景は暗い近接外殻・繊維膜・休眠節へ役割を分離した。画面高24〜78%の中央帯に対するalpha平均は中景68.9524/255、前景43.8956/255で、中央飛行回廊に透明領域を保持する。
- 配信版は3点とも1280×720 lossy WebP、alpha最大差0。遠景・中景・前景の平均RGB誤差は2.659・3.706・3.673/255、PSNRは36.931・34.416・34.360dB、合計697,514 bytesで第3面2.25 MiB予算内。
- asset manifestと静的buildへ背景3 IDを接続した。敵3種、boss、音は未制作のため製品画面とブラウザ通しはまだ行わず、状態は`final`に留める。主観的な見た目、長時間ループの継ぎ目、権利再確認も未確認。

## HUD-REACTOR-01 / VFX検査記録

- HUDは古い順に赤`I`、青`+`、黄`◎`を並べ、先頭を寸法と二重輪郭で強調し、黄枠へ`OUT`を付けた。赤取得後の`LANCE Lv2 / AUX SEEK−1`を取得前に表示する。
- 命中は十字閃光、被弾は破線二重環、回収は内向き山形とし、色を除いても外形が重複しない。味方弾は鏃、敵弾は閉じた円で区別する。
- 正規化座標上の常設HUD面積は11.69%で上限12%以内。Chromeの1440×900、390×844、844×390で実測11.58〜11.65%、横溢れ0px、HUD同士の重複0、画像欠落0を確認した。
- HUD本文は12px以上、表示設定3操作は50×44px以上。縦長ではゲーム比率を保ち、操作をゲーム画面下へ分離した。横長では操作を隠してゲーム画面の縦溢れを0pxにした。
- 動き軽減ではパララックスとVFXアニメーションを停止するが3種の静止形状を残す。高コントラストでは背景の彩度・輝度を下げ、HUDを黒地・白輪郭にする。console warning/errorは0件。
- 実PNGを64×64へ正規化した画像検査では、グレースケール・1型・2型・3型色覚シミュレーションすべてで、3コア間の最小平均画素差が37.02/255以上、自機と敵が25.24/255以上となり、下限18/255を満たした。背景の水平輪郭密度3.82は自機6.04・敵7.76より低い。
- 味方弾・敵弾を含む7分類の外形／内部／移動シグネチャは重複0。VFXの輝度パルスは命中1.11回/秒、被弾0回/秒、回収0.91回/秒で上限3回/秒以内。カメラ揺れ上限は横1.5%、縦1.0%、350msとし、動き軽減時は0に固定した。
- Chromeの1440×900、390×844、320×844、844×390で横溢れ0、画像欠落0、console warning/error 0件を再確認した。横長は縦溢れ0で、実計算されたVFX周期0.9秒・1.6秒・1.1秒がモデルと一致した。
- P06で命中・被弾・回収を製品event由来の寿命付きCanvas描画へ接続し、撃破の放射線VFXも追加した。コード表現としてゲーム投入可能なため`final`。残り3面を含む製品全体での再検証が未完了なので`verified`ではない。

## AUDIO-REF-01 検査記録

- 赤ランス180ms/−6dBFS、青スプレッド240ms/−8dBFS、黄シーカー320ms/−8dBFS、コア回収380ms/−7.001dBFS、装填250ms/−9dBFS、UI決定120ms/−12dBFS、第1面リズム層4000ms/−12dBFSを作成した。
- 7点とも48kHz、mono、PCM16 WAV。クリップは全点0、−60dBFS基準の先頭無音は最大0.125ms、末尾無音は最大0.5ms。リズム層のループ端正規化振幅差は0.004395で上限0.01以内。
- `manifest.json`に用途、長さ、目標ピーク、バイト数、SHA-256、制作方法、権利を記録し、テストで実ファイルと照合する。外部音源・外部サンプルは使用していない。
- Chromeで7点すべて`readyState=4`、表示長0.12〜4秒、ループ指定、横溢れ0、console warning/error 0件を確認した。320×844でも横溢れ0、音声操作高54px。
- P06で3武器、コア回収、FIFO装填を製品eventへ接続し、Chromeで7点すべての取得、警告0、音量設定・ミュート・失敗時継続を確認した。分離音声としてゲーム投入可能なため`final`。聴感の主観評価、製品全体の同時発音、配信用圧縮形式は未確認なので`verified`ではない。

## AUDIO-STG02-01 検査記録

- 4秒の同期ループとしてリズム−18dBFS、旋律−20dBFS、危機/Boss−22dBFSを分離し、導入500ms/−10dBFS、クリア900ms/−8dBFSを作成した。5点合計1,286,620 bytesで、画像込み第2面2,283,252 bytesとなり2.25 MiB予算内。
- 5点とも48kHz、mono、PCM16 WAV、クリップ0。3ループの端差は0.000244以下、等倍3層合成ピークは−11.623dBFSで、−6dBFS上限まで余裕を持つ。
- 通常戦はリズム＋旋律、`boss-entered`で危機層を加えた3層へ同時刻切替し、ステージ開始と`stage-cleared`で通知音を再生する。音声schemaは空層・重複層を拒否し、全IDを製品loaderと静的buildで照合する。
- 生成式、用途、byte数、SHA-256、外部サンプル0をmanifestと自動テストで照合済みのため`final`。実ブラウザでの取得・再生、聴感、長時間同期は未確認なので`verified`ではない。
