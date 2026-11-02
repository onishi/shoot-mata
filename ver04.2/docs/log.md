# v4.2 Log

## 2026-11-02 — v4.2-04 短い3ボスの形態ペーシング

- BLANK BAILIFF / CROSSWIND COMPILER / APOCRYPHA TWINSへ形態別成功上限を追加し、HP総量を増やさず全9形態を8秒以上、戦闘を30〜60秒へ収めた。専用攻略は31.63 / 30.15 / 39.98秒で、通常射撃より60.5% / 68.2% / 73.3%高速だった。
- 成功上限中の反復攻撃を抑え、超過成功を次の境界へ保留した。移行時の残存弾消去、BLANK最終装甲文から露出コアへの成功還元、TWINS phase 3の上限付き学習窓で、延長が追加被弾だけにならないようにした。
- 追加時間はStage 2末尾36秒とStage 5末尾30秒の学習済み反復を削って相殺した。Stage 1の180秒とFIRST WAKEは維持した。
- 初回正式計測ではPROOFがBLANK phase 3で停止し、次の計測ではseed 4516がTWINS phase 3の同期崩し前に停止した。成功保留と学習窓で修復し、最終90周は90/90完走、コンティニュー0となった。
- 最終時間中央値は23.11 / 23.12 / 23.14分、最大24.38 / 24.61 / 24.62分、被弾中央値1 / 1 / 3。Stage 6中央値4.884分以下、最大5.385分だった。
- 単体83/83、自動証跡15/15、simulation・Chrome性能、独自性・素材・音量監査、production buildに合格。QAの旧boss境界とStage 5固定tickを修復後、Chrome E2E 26/26に合格した。
- 3ボス代表形態画像を再目視し、phase、弱点、予告、危険弾、自機、HUDが背景上で判別できることを確認した。詳細は`evidence/v4.2-04-boss-pacing.md`へ記録した。

## 2026-11-02 — v4.2-03 最初の30秒の体験学習

- 新規保存のStage 1冒頭へ非停止型FIRST WAKEを追加し、移動、射撃、COLLATE、捕捉弾反射を順に案内した。成功時だけ短い文言、色変化、UI音を返す。
- 冒頭のeraser-miteが発砲しない既存構成を活かし、最初のCOLLATE後だけ3レーンの低速捕捉弾と30秒までの安全猶予を追加した。通常操作のまま待ち時間なく通過できる。
- 完了を専用localStorageキーへ記録し、2周目では再表示しない。CONTINUE SAVE、通常CONTINUE、Stage 2以降でも無効になる回帰テストを追加した。
- seed 4203で移動1、射撃11、COLLATE 491、反射1251 tickを記録し、約10.43秒で完了した。Stage 1の180秒、敵4種、4秒未満の戦闘間隔を維持した。
- Chromeの開始・完了画像を目視し、HUDや戦闘対象との重なりがないことを確認した。初回、2周目、CONTINUE SAVEを実ブラウザで検査した。
- `npm run verify`に合格。単体83/83、自動証跡15/15、正式90/90周、監査、production build、Chrome E2E 26/26を確認した。
- 正式90周は中央値23.37 / 23.47 / 23.57分、最大24.59 / 24.73 / 24.37分、被弾中央値1 / 1 / 3、全難易度コンティニュー0。simulation平均0.034ms、Chrome平均0.073ms、long task 0、heap増加2.53%だった。

## 2026-11-02 — v4.2-02 攻撃を予測できる危険表現

- 通常敵24種を狙い撃ち・拡散・面制圧・狙撃の4分類へ割り当て、全ボスの20 named attack sourceも同じ視覚文法へ接続した。
- 従来の赤い二重円を、進行方向へ回転する矢尻、菱形＋二股尾、角形＋横栓、細長い針＋長い尾へ置換した。捕捉不能の幻影弾は破線を維持し、reduced flashでも点滅へ依存しない。
- source名の細分化でECHO / NORMALの弱危険回復が外れないよう、全`enemy-*`を従来の通常敵弾として扱う分類関数へ統一した。
- v4.1変更前とv4.2変更後の全Stage、全ボス3形態、reduced-flash画像を比較・目視し、明暗の異なる背景でも4形状が読め、敵・自機・COLLATE輪郭を圧迫しないことを確認した。
- `npm run verify`に合格。単体82/82、自動プレイ14/14、正式90/90周、独自性・素材・音量監査、production build、Chrome E2E 25/25を確認した。
- 正式90周は中央値23.37 / 23.47 / 23.57分、被弾中央値1 / 1 / 3、コンティニュー0でv4.2-01から不変。simulation平均0.032ms、Chrome平均0.064ms、long task 0、heap増加2.43%だった。

## 2026-11-02 — v4.2-01 独立土台とMARGINALIA比較

- v4.1を変更せず`ver04.2/game`へ独立複製し、v4.2版表示、保存・設定キー、port 4185、release metadata、トップ・`/v4.2/`と旧版保持経路を分離した。
- MARGINALIAカードへbenefit、cost、repeat rule、owned countを明記し、画面上部へ現在所持中の全構成を追加した。AFTERWORDを含む長文は幅実測で2行まで折り返す。
- 12候補×3位置×midpoint/result×3解像度の216組合せをChrome Canvasの実描画幅で検査し、欠け・カード外描画0件。3解像度の画像を目視した。
- `stage-06-boss`がphase 3まで進めていたQA不備を修復し、phase 1の実状態を返すようにした。phase 1 / 2 / 3は撮影直前にphase番号、固有弱点・攻撃状態をassertする。
- 初回Chrome検証では修復後のQAシナリオが旧audio auditのinteraction cueを発火せず、phase 2のrule assertも周期計算と1つずれた。phase状態を変えずinteraction cueを監査し、phase 2周期を実挙動へ合わせて再検証した。
- `npm run verify`に合格。単体80/80、自動プレイ14/14、正式90/90周、simulation平均0.032ms、Chrome平均0.069ms・long task 0・heap増加4.12%、素材・独自性・音量監査、production build、Chrome E2E 25/25を確認した。
- 正式90周は時間中央値23.37 / 23.47 / 23.57分、最大24.59 / 24.73 / 24.37分、被弾中央値1 / 1 / 3、全難易度コンティニュー0。release artifactの9経路検査にも合格した。

## 2026-11-02 — baseline再評価と改善方針固定

- v4.1を変更しない一時コピーでautoplay 14/14、simulation性能、seed 4700〜4702の3難易度9周、production build、Chrome E2E 24/24を再実行した。
- 9/9周は22.95〜24.31分で完走しコンティニュー0。被弾中央値はECHO 2 / NORMAL 2 / PROOF 3で、PROOF差はあるがECHO / NORMAL差は実測へ現れなかった。
- simulationは平均0.033ms / p95 0.054ms / 最大2.469ms。Chromeは平均0.067ms / p95 0.100ms / 最大3.000ms、long task 0、heap増加4.11%だった。
- 全画面再採取と目視で、通常弾が攻撃種によらず同じ赤い二重円へ収束すること、AFTERWORD説明が右端カードから切れること、Stage 1 / 2 / 5ボスが短いことを確認した。
- `m3-22-last-editor-phase-1.png`が実際にはphase 3を表示するQAシナリオ不備を発見した。v4.1は固定し、v4.2独立土台の最初に回帰テストごと修復する。
- 攻撃表現、MARGINALIA比較、初回30秒、短い3ボス、ECHO / NORMAL差の5件を`00-v4.2-direction.md`へ固定した。
- 最初のChrome実行はsandboxのpreview port権限で失敗した。許可済みローカルpreviewから同じproduction buildを再実行して24/24に合格した。
