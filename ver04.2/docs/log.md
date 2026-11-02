# v4.2 Log

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
