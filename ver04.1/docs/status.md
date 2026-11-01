# v4.1 Status

最終更新: 2026-11-02

## 現在状態

- 現在版: v4.1 (`ver04.1/`)
- 公開版: v4.0
- 段階: 完成監査合格（公開待ち）
- v4.0変更: なし

## 達成内容

- v4.0の正式90周証跡、全Stage・全ボス計測、強化比較、性能、全画面画像を再評価した。
- 新しいseed 4600〜4602を3難易度で測定し、9/9周の完走を確認した。
- production buildのChrome E2E 22/22件、simulation性能、通常区間・全ボス・強化計測に合格した。
- 影響度、頻度、改善効果、回帰リスクで4課題を採点し、`00-v4.1-direction.md`へ固定した。
- v4.0から`ver04.1/game`を複製し、版表示、保存・設定キー、開発ポート、公開経路、証跡出力をv4.1専用へ分離した。
- 前景装飾を戦闘物の背面へ移し、自機、24通常敵、危険弾、ボスへ局所コントラストと形状外周を追加した。背景、当たり判定、ゲーム規則は変更していない。
- 同一QAシナリオでStage 1 / 4 / 6通常戦と全6ボスを変更前後比較し、reduced flash専用のStage 6画像も目視確認した。
- 単体78/78、自動プレイ13/13、Chrome E2E既存全体22/22と追加visual-audit 2/2、production build、素材・独自性・音量監査に合格した。現行23件はすべて個別に合格済みだが、追加後の一括再実行はしていない。
- Chrome性能は平均0.056ms / p95 0.100ms / 最大0.500ms、long task 0、heap増加1.67%。simulation性能は平均0.029ms / p95 0.053ms / 最大0.396msだった。
- balanceへ1走行ごとの即時進捗と`EVIDENCE_DIR`指定を追加し、1-run smoke testで動作を確認した。
- ECHO / NORMAL / PROOFの初弾、継続射撃、扇予告、射線、被弾後の立て直しを難易度プロファイルへ集約した。HP、弾速、ボス周期、攻略手順は共通のままにした。
- seed 4500〜4529の3難易度×30周が90/90完走。時間中央値は24.71 / 24.40 / 24.48分、被弾中央値は1 / 1 / 2、コンティニュー率は全難易度0%で、`ECHO <= NORMAL <= PROOF`とPROOF−ECHO 1を満たした。
- balance証跡へ最大危険数、扇予告tick、攻略ギミック成功数、コンティニュー率を追加し、30seed正式実行では難易度順を自動検査するようにした。
- 単体78/78、自動プレイ13/13、Chrome E2E 23/23、simulation性能、production build、素材・独自性・音量監査に合格した。
- 全12 MARGINALIAを単独装備し、通常戦・BLANK BAILIFF・同一post-hit frameの3条件、計36 counterfactualをno-note baselineと比較する自動証跡を追加した。数値差10%以上とzero baselineからの新規発生を自動抽出する。
- seed 4410の60秒通常戦・被弾復帰ではRECOVERY 4種が全指標でbaselineと一致し、BLANK BAILIFFではCITATIONだけがreturned hitsを15から17（+13.3%）へ変えた。REDACTION / PALINODE / AFTERWORDは3条件すべて無反応だった。
- 新規counterfactual 1/1、単体78/78、counterfactualを含む全自動プレイ14/14、TypeScript型検査に合格した。全自動プレイの決定性hashも現行難易度プロファイルに対して再生成した。
- RECOVERY 4候補へ成功中の進捗・準備状態・専用イベントを追加した。REDACTIONは6捕捉で近傍弾消去と1回guard、CITATIONは通常戦で累積4捕捉の重弾、PALINODEは2 COLLATEでRETRACE再閉鎖を準備、AFTERWORDは3 COLLATEで得点とpost-hit long wakeを準備する。
- counterfactual 36条件を再実行し、RECOVERY 4候補が通常戦・BLANK BAILIFF・被弾復帰の全条件で固有成功イベントを1回以上発生した。CITATIONは通常戦でもlance 1回、AFTERWORDは通常戦でprime 2回と+1,200 scoreを記録した。
- RECOVERY準備進捗を上部HUD、発動を自機周囲の金色破線と専用音へ表示した。1280×720 Chrome画像を目視し、体力・時間・スコアと干渉しないことを確認した。
- 無期限AFTERWORDがキャンペーンを25.88分、CITATIONの通常戦進捗持越しがStage 6ボスを10,149から21,183 tickへ延ばしたため棄却した。AFTERWORDは3秒準備窓とpost-hit効果へ、CITATIONはボスで1 COLLATE内判定へ境界を修正した。
- 調整後の3難易度×30seedは90/90完走。時間の中央値は24.74 / 24.55 / 24.51分、最大25.25 / 25.55 / 25.58分、被弾中央値1 / 1 / 2、コンティニュー0。全12候補は81〜99回選択された。
- 単体79/79、自動プレイ14/14、simulation性能、production build、素材・独自性・音量監査、Chrome E2E 24/24に合格した。
- Stage 6の継承4 folioを各54秒から36秒へ圧縮し、54秒のsynthesis folioは維持した。通常区間は270秒から198秒となり、無戦闘最大1 tick、4敵種・全継承規則・統合COLLATEを維持した。
- CINDER ADVOCATEのHPを増やさず火種周期を広げ、攻略時間44.18秒、形態別冷却命中3 / 4 / 2を確認した。全3形態で壁越しの冷却火種判断が必要になった。
- THE LAST EDITORは全5規則の書換後に弱点を恒久化し、100秒以降の長期化を収束させ、最終署名形態を最低25秒維持した。専用攻略は97.68秒、通常射撃より22%短かった。
- 最終90周は90/90完走。時間中央値ECHO 23.37 / NORMAL 23.47 / PROOF 23.57分、最大24.59 / 24.73 / 24.37分、被弾中央値1 / 1 / 3、コンティニュー0。Stage 6中央値4.75 / 4.62 / 4.62分、最大5.38分だった。
- PROOFのCOLLATE後無敵を15秒から10秒へ調整し、弾消去ルールを変えず難易度差を回復した。10seedの7.5秒案はコンティニューと25分超過を生んだため棄却した。
- 単体79/79、自動プレイ14/14、simulation性能、production build、素材・独自性・音量監査、Chrome E2E 24/24に合格した。Chromeは平均0.065ms / p95 0.200ms / 最大2.200ms、long task 0、heap増加2.51%。
- CINDER ADVOCATE phase 3、Stage 6 synthesis、THE LAST EDITOR phase 3の1280×720画像を目視し、自機、危険弾、壁、敵、弱点、HUDの識別とレイアウトに回帰がないことを確認した。
- v4.1-05横断監査で4改善と継承製品ゲートを証跡へ対応付けた。全6通常戦・全6ボス画像を再目視し、単体79/79、自動プレイ14/14、正式90周、各監査、production build、Chrome E2E 24/24に一括で合格した。
- Pages workflowをv4.1へ切り替え、クリーン環境でv3系とv4.0を再構成・検査してからトップ、`/v4.1/`、`/v4.0/`、v3系を収容するようにした。公開後検査はv4.1のcommit・MIMEに加えてv4.0の版とrelease metadataも確認する。

## 未解決課題

1. 固定した4改善とローカル完成監査は完了。Pages公開と実URL確認だけが未完了。

## 次の最優先作業

**v4.1-05: 検証済みrelease candidateを公開し、実URLを確認する。**

release candidateをmainへpushし、Pages CIとトップ / `/v4.1/` / `/v4.0/` / v3系固定URL、版、commit、MIMEを確認する。成功後にv4.1を完了とし、v4.2の再評価へ進む。
