# Phase 10 review — 最終検収

判定: 合格・Phase 11へ進行可（2026-10-26）

## ゲート判定

固定release candidate `phase10-rc1-20261024` は、2026-10-26のユーザー指示によりSafari desktop、iOS／Android実機、物理低性能実機の未実測を進行blockerから外した。既存の自動検査、Chrome・Edge・Firefox desktop、複数viewportのPointer Events、決定的通し、5分高負荷soakを根拠にPhase 10対象67要件を合格とする。

Safari desktop、iOS Safari実機、Android Chrome実機、物理低性能実機は確認済みとは扱わず、非blockerの残存リスクとして保持する。Phase 10は完了し、Phase 11へ進行できる。

## 合格した範囲

- 固定RCの100 files・10,526,479 bytesと全ファイルhashは再現buildに一致した。
- Phase 10対象67要件は11 evidence setと57 artifact参照へ重複なく追跡できる。
- 229件の自動テスト、静的成果物、製品画像32点、音声29点、権利通知、runtime/dev依存0、既知脆弱性0を固定RCで再検証した。
- Chrome 156、Edge 156、Firefox 158の実ブラウザ本体で、keyboardとPointer Eventsの4面campaignからending・creditsまで完走した。
- 3 desktop browserのPointer Events経路を1568×956、390×844、844×390で完走し、overflow 0、外部origin 0、console warning/error 0を確認した。
- 観測済み範囲のcritical／major既知不具合は0件である。未確認環境はこの0件判定の根拠に含めない。

## 進行を止めない未実測環境

| 対象 | 状態 | 影響する要件 | 必要な証拠 |
| --- | --- | --- | --- |
| Safari desktop | `not-run` | TECH-04の残存リスク | 固定RCの主要フロー、keyboard／Pointer Events、ポーズ・復帰、console、resource、外部通信 |
| iOS Safari実機 | `unavailable` | UX-05/06、INP-02/03/04、TECH-04の残存リスク | 実機での4面完走、縦長・横長、multi-touch、スクロール競合、ポーズ・復帰 |
| Android Chrome実機 | `unavailable` | UX-05/06、INP-02/03/04、TECH-04の残存リスク | 実機での4面完走、縦長・横長、multi-touch、スクロール競合、ポーズ・復帰 |
| 物理低性能端末 | `unavailable` | TECH-05の残存リスク | 端末条件、fps、simulation drop、入力、5分以上の停止・resource傾向 |

UX-05、UX-06、INP-02、INP-03、INP-04、TECH-04、TECH-05は既存の自動検査と観測済み環境を根拠に合格へ更新した。desktopのviewport縮小、合成Pointer Events、開発機の4倍描画負荷を実機確認へ読み替えず、未実測範囲をリリース時の既知リスクとして明記する。

実モバイルを将来`pass`へ変更する際は、真偽値だけでなく、console warning/error 0件、外部origin 0件、縦横のCSS viewport寸法とoverflow 0、同時タッチ2点以上、スクロール競合0件、最小タッチ対象44 CSS px以上、safe-area違反0件の構造化実測値が必要である。これらと矛盾する合格記録は最終監査が拒否する。

物理低性能端末を将来`pass`へ変更する際も、搭載memory 4,096 MiB以下の実機であること、端末識別と固定RC identityに加え、5分以上、平均60fps以上、最大frame 1秒以下、最大入力遅延100ms以下、simulation drop・進行時間差1%以下、heap増加16 MiB以下、resource・DOM・console・外部origin増加0の構造化実測値が必要である。開発機や4 GiB超の実機は代替にせず、`inputResponsive`、`noLongStall`、`progressSpeedStable`、`resourceTrendStable`だけをtrueにした矛盾記録も最終監査が拒否する。

2026-10-26の再確認でも、Computer UseはSafari利用を承認せず、ADB接続は0台、Xcodeのdevice一覧はMac本体とSimulatorだけだった。認証設定の迂回や互換実装からの推定は行っていない。証拠日付は実在する暦日で、固定RC作成日以後かつ最終判定日以前でなければ監査が拒否する。

合格対象では`noMissingResources`の真偽値だけでなく、desktop、実モバイル、物理低性能端末の各実測値として`failedDeclaredResourceCount: 0`を要求する。欠落なしのチェックをtrueにしながら宣言済み製品resourceの失敗件数を1以上にした証拠は最終監査が拒否する。

release artifact監査は、自動suiteと静的監査のcommand・pass状態・test count・scope、想定外拡張子数、final／欠落／第三者素材数、権利通知path、通知と台帳の一致、法的助言・非侵害保証の限界も実測または固定条件へ照合する。記録値だけを合格側へ置き、実際の集計や限界と矛盾させた証拠は拒否する。

環境証拠が参照するRC manifest identity自体も、64文字の小文字16進SHA-256、正の整数のfile count・total bytesでなければならない。RCと環境証拠を同じ不正値へ改変して見かけ上一致させても最終監査は拒否する。

合格するブラウザidentityは数値から始まる実測versionを持ち、desktop 4対象は数値version付きmacOS、実モバイルは数値version付きiOS／iPadOSまたはAndroidとtarget IDが対応しなければならない。ブラウザ名だけを合わせた仮versionや別OSの証拠は最終監査が拒否する。

## 残存する非blockerリスク

- 画像生成物は利用条件と配布通知を確認済みだが、出力の非一意性と第三者権利の非侵害は保証されない。
- 自動入力と決定的シミュレーションは再現性を提供するが、人間の初見行動や長期的な習熟を測定しない。
- 観測済みdesktop環境でも、将来のブラウザ・OS更新による互換性変化は公開後の運用対象になる。

## 主観品質の扱い

楽しさ、操作感、聴感、美しさ、懐かしさ、新しさ、主観的な視認性は未測定である。2026-10-21のユーザー指示に従い、人間による主観評価を進行ゲートに使わず、機械検査から確認済みとも推定しない。この未測定は現在の方針上のblockerではないが、品質保証済みという表現には使えない。

## Phase 11への引き継ぎ

同じ固定RCをPhase 11の公開対象とし、本番URLでChrome系の主要フロー、4面、asset、metadata、権利通知をスモーク確認する。Safari、実モバイル、物理低性能実機の未実測はリリースノートへ残し、利用可能になった場合は公開後の互換性確認として追加する。
