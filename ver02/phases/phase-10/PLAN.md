# Phase 10 plan — 最終検収

状態: 進行中（2026-10-24開始）

## 目的

READMEと`02-product-requirements.md`の必須要件を、MVPではなく製品全体について一項目ずつ再照合する。単一のrelease candidateを固定し、自動検査、実ブラウザ・端末、成果物、権利・通知の証拠を同じbuild IDへ結び付ける。未確認を合格にせず、中核要件またはPhase 09 blockerが残る限りPhase 10を完了しない。

## 対象

- release candidateのbuild ID、全ファイルhash、容量、再現性
- 受け入れマトリクス全必須IDの実装・証拠・状態
- 全4面、3武器×3段階、主要フロー、保存、異常系
- キーボード、Pointer Events、PC、縦長、横長
- Chrome、Edge、Firefox、Safari、iOS Safari実機、Android Chrome実機
- 物理低性能端末、5分以上の連続実行、console、resource、外部通信
- 全素材、生成証拠、利用条件、配布通知、依存脆弱性

## 対象外

- 本番URLへの公開、公開後スモーク、ロールバック実行（Phase 11）
- 未測定の楽しさ、操作感、聴感、美しさを機械検査から推定すること
- 必須環境を互換実装やエミュレータだけで合格扱いすること

## 実装順

1. [完了] release candidate build IDと再現manifestを固定する
2. [完了] 受け入れマトリクスの全ID、証拠説明、状態を機械監査し、P10対象67件を実在する証拠へ追跡する
3. [完了] 全自動検査、静的成果物、権利・通知、依存関係をrelease candidateで再検証する
4. [進行中] 全必須ブラウザ・実端末・物理低性能端末を同一buildで検証する（Chrome・Edge・Firefox desktop 3/6合格、実モバイル0/2、物理低性能端末未接続）
5. [進行中] 全受け入れ行を更新し、中核未達0件と重大既知不具合0件を判定する（固定RCの既存証拠で60/67件を合格、実環境依存の7件をブロック）
6. [未着手] `REVIEW.md`へ合否、残存する低リスク、未測定の主観品質を記録する

## 完了条件

- [x] release candidateが単一build IDと全ファイルhashで固定され、再現buildと一致する
- [x] P10対象の全必須IDが実在する証拠へ追跡できる（67 IDを11 evidence set・57 artifact参照へ対応。P11以降のREL-04〜06は将来証拠のため別管理）
- [ ] READMEの必須要件に未達・不合格・blockが0件である
- [ ] 必須ブラウザ4種、iOS Safari実機、Android Chrome実機が同一buildで合格する
- [ ] 物理低性能端末で進行速度、入力、5分以上の停止・資源傾向を確認する
- [x] 全素材・通知・依存関係をrelease candidateで再確認する
- [ ] critical／majorの既知不具合が0件で、残存リスクと主観未測定を分離して記録する

## 最初の作業単位

build IDを`phase10-rc1-20261024`へ固定し、静的buildの全ファイルhashを含むmanifest自体のSHA-256、ファイル数、総容量を`release-candidate.json`へ記録する。再buildが同じmanifestへ一致しなければ検収を開始しない。

build manifestは100 files・10,526,479 bytes、SHA-256 `3c25733152691eadf21eaa5919a538c29919b5451a6d7045cf8420dde012e7ab`で固定した。専用テストはfresh buildを作り、build ID、全ファイル一覧を含むmanifest hash、件数、容量が記録と一致することを検査する。`accepted`はfalseのまま保持し、残りの検収前に公開可能と扱わない。

## 完了した第2作業単位

製品要件と受け入れマトリクスの70 IDが一対一で対応することを監査する`audit:acceptance`を追加した。欠落、重複、未知ID、空の実装phase・最終検証phase・証拠説明、許可外状態をfail closedで拒否する。Phase 10入口は`実装中`19、`実装済み未検証`47、`未着手`4、`合格`0であり、行が存在するだけでは合格にしない。

最終検証にP10を含む行は67、P11以降で検証する行は3だった。2026-10-25に、ID parserが接頭辞を英字だけへ制限し`A11Y-01`〜`A11Y-04`を両文書から黙って除外していたことを発見した。接頭辞内の数字を許可する修正と回帰テストを追加し、誤った66件基準を70件へ訂正した。

続いて`acceptance-evidence.json`と`audit:acceptance-evidence`を追加し、P10対象67件を重複なく11 evidence setへ割り当て、57件の自動テスト・生成レポート・ブラウザ記録・実装／設計記録が`ver02/`内の実ファイルであることを検査する。パス逸脱、要件文書自身への循環参照、欠落、重複、P10対象外IDの混入、検証artifactを持たないsetをfail closedで拒否する。REL-04〜06はP11以降の将来証拠として明示的に分離した。これは証拠の追跡可能性を確認するものであり、各要件の状態を自動的に`合格`へ変更しない。

## 完了した第3作業単位

固定release candidateに対して`npm run verify`を再実行し、200テスト、100 files・10,526,479 bytesの再現build、静的監査、受け入れID監査、受け入れ証拠監査、release artifact監査、依存監査に合格した。`release-artifact-audit.json`と専用のfail-closed監査は、build manifestのSHA-256、全配信ファイル、画像32点、音声29点、権利通知、runtime/dev依存0、lockfile、既知脆弱性0を同じbuild IDへ結び付ける。

OpenAI Terms of Useは2026-01-01発効版、Service Termsは2026-10-16更新版を2026-10-24に再確認した。Output所有、非一意性、利用者の適法利用責任という既存通知の整理と矛盾しない。これは法的助言、独自性、非侵害性の保証ではなく、残存リスクを通知と監査証拠に維持する。この作業単位だけではrelease candidate全体を合格にせず、`accepted: false`を保持する。

## 次の作業単位

同じrelease candidateを必須ブラウザ、iOS Safari実機、Android Chrome実機、物理低性能端末で検証する。未導入または未接続の対象は推定合格にせず、利用可能な環境の証拠を更新したうえで残るblockerを明示する。

2026-10-25に`browser-compatibility.json`を固定RCへ更新した。Chrome 156 / macOS 26.6.2はkeyboardとPointer Events経路の4面campaignからending・creditsまで完走し、Pointer Eventsは1568×956、390×844、844×390の3 viewportで完走した。全条件でoverflow 0、console warning/error 0、全宣言済み製品resourceはHTTP 200またはcache再検証304、外部origin 0だった。manifest外のブラウザ自動`/favicon.ico`要求1件は404だが、製品が明示するWebP faviconは正常取得した。EdgeとFirefoxは未導入、Safariはcomputer-use操作未承認、iOS/iPadOS実機とAndroid実機は未接続、物理低性能対象端末も未接続である。必須6対象中1対象、実モバイル0対象のため、この作業単位とPhase 10は未完了のまま維持する。

同日、Edge 156.0.4314.42とFirefox 158.0.1を導入し、固定RCを実ブラウザ本体の公式WebDriver headless modeで再検証した。両ブラウザともkeyboardとPointer Events経路で4面campaignからending・creditsまで完走し、keyboard経路ではP入力によるplaying→paused→playingを観測した。Pointer Eventsは1568×956、390×844、844×390の3 viewportでoverflow 0、外部origin 0、console warning/error 0だった。FirefoxのconsoleとviewportはWebDriver BiDi、Edgeのconsoleと390px viewportはWebDriver / DevTools protocolで採取した。Computer Useは両アプリの操作を承認しなかったが、Chrome互換性から推定せず実ブラウザ本体を起動した証拠である。これにより必須6対象中3対象が合格した。Safari、実モバイル2対象、物理低性能端末は未確認で、Phase 10は継続する。

## 開始した第5作業単位

`final-acceptance.json`と`audit:final-acceptance`を追加し、受け入れ表、固定RC、証拠台帳、環境別記録を単一のfail-closed判定へ接続した。監査はP10対象とP11以降対象を再導出し、非合格要件、未合格の必須ブラウザ、実モバイル2対象、物理低性能端末、critical／major既知不具合を全て判定する。blocker一覧が実文書からずれた場合や、一部artifactだけが`accepted: true`へ進んだ場合は失敗する。

2026-10-25時点では、P10対象67件のうち60件を固定RCの自動検査、Chrome実測、成果物監査から合格へ更新した。UX-05/06、INP-02/03/04、TECH-04/05は、必須6対象中5対象、実モバイル2対象、物理低性能端末が未合格のため`ブロック`であり、判定は`accepted: false`である。全自動検査の合格は未確認環境を閉じず、Phase 10完了を意味しない。SafariはComputer Useが今回も承認されなかった。設定を迂回せず`not-run`を維持した。

EdgeとFirefoxの追加合格後も、同じ7要件はSafari、実モバイル2対象、物理低性能端末の証拠待ちで`ブロック`のままである。必須ブラウザの非合格対象は5件から3件へ減ったが、判定は引き続き`accepted: false`である。

## 完了した受け入れ状態遷移の修正

証拠台帳監査とrelease candidate監査が`accepted: false`を常時強制する一方、最終検収監査は全条件合格時に同じartifactへ`accepted: true`を要求しており、Phase 10を将来も完了できない矛盾があった。各監査を、現在の未達状態は拒否しつつ、P10対象行が全件合格した場合だけ証拠台帳の合格遷移を許可し、release candidateの合格状態を最終検収ゲートへ委ねる形へ修正した。全要件、必須ブラウザ、実モバイル、物理低性能端末、重大不具合0が揃ったfixtureで`accepted: true`へ遷移できる回帰テストを追加した。現在の実データはP10対象60件合格・7件ブロックで、引き続き`accepted: false`である。
