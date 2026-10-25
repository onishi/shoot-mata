# Phase 10 review — 最終検収

判定: 不合格・継続（2026-10-26）

## ゲート判定

固定release candidate `phase10-rc1-20261024` は、Phase 10対象67要件のうち60件が合格、7件がブロックである。必須ブラウザ・端末6対象のうちChrome、Edge、Firefox desktopの3対象が合格し、Safari desktop、iOS Safari実機、Android Chrome実機の3対象は未合格である。物理低性能端末も未接続のため、READMEとPhase 10の完了条件を満たさない。

したがってPhase 10は完了せず、Phase 11の公開へ進まない。`release-candidate.json`、`acceptance-evidence.json`、`release-artifact-audit.json`、`final-acceptance.json`の`accepted`はすべて`false`を維持する。

## 合格した範囲

- 固定RCの100 files・10,526,479 bytesと全ファイルhashは再現buildに一致した。
- Phase 10対象67要件は11 evidence setと57 artifact参照へ重複なく追跡できる。
- 208件の自動テスト、静的成果物、製品画像32点、音声29点、権利通知、runtime/dev依存0、既知脆弱性0を固定RCで再検証した。
- Chrome 156、Edge 156、Firefox 158の実ブラウザ本体で、keyboardとPointer Eventsの4面campaignからending・creditsまで完走した。
- 3 desktop browserのPointer Events経路を1568×956、390×844、844×390で完走し、overflow 0、外部origin 0、console warning/error 0を確認した。
- 観測済み範囲のcritical／major既知不具合は0件である。未確認環境はこの0件判定の根拠に含めない。

## 検収を止めるblocker

| 対象 | 状態 | 影響する要件 | 必要な証拠 |
| --- | --- | --- | --- |
| Safari desktop | `not-run` | TECH-04 | 固定RCの主要フロー、keyboard／Pointer Events、ポーズ・復帰、console、resource、外部通信 |
| iOS Safari実機 | `unavailable` | UX-05/06、INP-02/03/04、TECH-04 | 実機での4面完走、縦長・横長、multi-touch、スクロール競合、ポーズ・復帰 |
| Android Chrome実機 | `unavailable` | UX-05/06、INP-02/03/04、TECH-04 | 実機での4面完走、縦長・横長、multi-touch、スクロール競合、ポーズ・復帰 |
| 物理低性能端末 | `unavailable` | TECH-05 | 端末条件、fps、simulation drop、入力、5分以上の停止・resource傾向 |

これらにより、UX-05、UX-06、INP-02、INP-03、INP-04、TECH-04、TECH-05の7要件を`ブロック`として維持する。desktopのviewport縮小、合成Pointer Events、Simulator、開発機の4倍描画負荷は補助証拠であり、実機または物理端末の合格へ読み替えない。

実モバイルを将来`pass`へ変更する際は、真偽値だけでなく、console warning/error 0件、外部origin 0件、縦横のCSS viewport寸法とoverflow 0、同時タッチ2点以上、スクロール競合0件、最小タッチ対象44 CSS px以上、safe-area違反0件の構造化実測値が必要である。これらと矛盾する合格記録は最終監査が拒否する。

物理低性能端末を将来`pass`へ変更する際も、端末識別と固定RC identityに加え、5分以上、平均60fps以上、最大frame 1秒以下、最大入力遅延100ms以下、simulation drop・進行時間差1%以下、heap増加16 MiB以下、resource・DOM・console・外部origin増加0の構造化実測値が必要である。`inputResponsive`、`noLongStall`、`progressSpeedStable`、`resourceTrendStable`だけをtrueにした矛盾記録は最終監査が拒否する。

2026-10-26の再確認でも、Computer UseはSafari利用を承認せず、ADB接続は0台、Xcodeのdevice一覧はMac本体とSimulatorだけだった。認証設定の迂回や互換実装からの推定は行っていない。証拠日付は実在する暦日で、固定RC作成日以後かつ最終判定日以前でなければ監査が拒否する。

合格対象では`noMissingResources`の真偽値だけでなく、desktop、実モバイル、物理低性能端末の各実測値として`failedDeclaredResourceCount: 0`を要求する。欠落なしのチェックをtrueにしながら宣言済み製品resourceの失敗件数を1以上にした証拠は最終監査が拒否する。

## 残存する非blockerリスク

- 画像生成物は利用条件と配布通知を確認済みだが、出力の非一意性と第三者権利の非侵害は保証されない。
- 自動入力と決定的シミュレーションは再現性を提供するが、人間の初見行動や長期的な習熟を測定しない。
- 観測済みdesktop環境でも、将来のブラウザ・OS更新による互換性変化は公開後の運用対象になる。

## 主観品質の扱い

楽しさ、操作感、聴感、美しさ、懐かしさ、新しさ、主観的な視認性は未測定である。2026-10-21のユーザー指示に従い、人間による主観評価を進行ゲートに使わず、機械検査から確認済みとも推定しない。この未測定は現在の方針上のblockerではないが、品質保証済みという表現には使えない。

## 再開条件

同じ固定RCに対して未合格の3ブラウザ・実端末対象と物理低性能端末を検証し、該当7要件を合格へ更新する。その後`npm run verify`を再実行し、`audit:final-acceptance`が非合格要件0、非合格ブラウザ対象0、実モバイル2対象合格、物理低性能端末合格、critical／major 0件を導出した場合だけPhase 10を完了する。
