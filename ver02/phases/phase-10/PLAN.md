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
6. [完了] `REVIEW.md`へ現時点の不合格判定、検収blocker、残存する非blockerリスク、未測定の主観品質を記録する

## 完了条件

- [x] release candidateが単一build IDと全ファイルhashで固定され、再現buildと一致する
- [x] P10対象の全必須IDが実在する証拠へ追跡できる（67 IDを11 evidence set・57 artifact参照へ対応。P11以降のREL-04〜06は将来証拠のため別管理）
- [ ] READMEの必須要件に未達・不合格・blockが0件である
- [ ] 必須ブラウザ4種、iOS Safari実機、Android Chrome実機が同一buildで合格する
- [ ] 物理低性能端末で進行速度、入力、5分以上の停止・資源傾向を確認する
- [x] 全素材・通知・依存関係をrelease candidateで再確認する
- [x] critical／majorの既知不具合が0件で、残存リスクと主観未測定を分離して記録する

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

同日、`REVIEW.md`へ固定RCの現時点の不合格判定を記録した。60/67件の合格範囲、Safari・実モバイル2対象・物理低性能端末が止める7要件、観測範囲のcritical／major 0件、非blockerリスク、未測定の主観品質を分離した。Computer UseのSafari利用は再度承認されず、ADB接続は0台、Xcodeのdevice一覧はMac本体とSimulatorだけだったため、Phase 10と`accepted: false`を維持する。

## 完了した受け入れ状態遷移の修正

証拠台帳監査とrelease candidate監査が`accepted: false`を常時強制する一方、最終検収監査は全条件合格時に同じartifactへ`accepted: true`を要求しており、Phase 10を将来も完了できない矛盾があった。各監査を、現在の未達状態は拒否しつつ、P10対象行が全件合格した場合だけ証拠台帳の合格遷移を許可し、release candidateの合格状態を最終検収ゲートへ委ねる形へ修正した。全要件、必須ブラウザ、実モバイル、物理低性能端末、重大不具合0が揃ったfixtureで`accepted: true`へ遷移できる回帰テストを追加した。現在の実データはP10対象60件合格・7件ブロックで、引き続き`accepted: false`である。

## 完了した実端末証拠のfail-closed化

汎用の互換性schemaだけでは、実モバイルを単一viewportまたは任意入力、物理低性能端末を一般ブラウザと同じ証拠だけで`pass`にできる余地があった。固定RCの配信hashを変えないPhase 10監査層に、対象別の追加条件を実装した。

- iOS Safari／Android Chrome実機は、実タッチ入力、縦長・横長、4面主要フローと再挑戦、ポーズ・復帰、multi-touch、スクロール競合なし、44 CSS px以上、safe-area内表示を全て要求する。
- 物理低性能端末は、機種・CPU・GPU・memory、5分以上、目標60fpsとその達成、simulation drop 1%以下、入力応答、長時間停止なし、進行速度維持、resource傾向安定を全て要求する。
- 不足証拠を`pass`にしたfixtureが最終検収で拒否され、全項目を持つfixtureだけが合格状態へ遷移できる回帰テストを追加した。

Safariは今回もComputer Useからの操作を承認されなかった。ADB接続は0台、Apple device一覧はMac本体とSimulatorだけで実機はなかったため、現在の7要件と`accepted: false`は変更していない。

## 完了したブラウザ証拠のfail-closed化

汎用の互換性schemaと実端末追加条件だけでは、Safariを1入力・1 viewport・campaign結果なしでも`pass`にでき、実モバイルも主要フローの真偽値だけで4面完走を主張できる余地があった。Phase 10監査を追加で強化し、必須6ブラウザ・端末の合格には固定RCのbuild identityと4面campaign結果を要求する。desktop 4ブラウザにはkeyboardとPointer Eventsの両経路、および1568×956、390×844、844×390の3 viewportを必須化した。不足したSafari fixtureを拒否し、全条件を持つfixtureだけが合格状態へ遷移できる回帰テストを追加した。

SafariはComputer Useからの操作を承認されず、ADB接続は0台、Apple device一覧はMac本体とSimulatorだけだった。受け入れマトリクスのTECH-04証拠説明は、既に合格済みのEdge・Firefoxを反映するよう訂正した。現在の7要件と`accepted: false`は変更していない。

## 完了したRC identity・campaign内訳の完全一致化

固定RC identityを単なるbuild ID入り文字列としていたため、別manifestや部分一致するbuild IDを持つ証拠を拒否できなかった。また、campaignは`stages: 4`だけでdesktopの4経路または実モバイル縦横2経路の実行内訳がなくても通過できた。

合格対象のbuild identityをbuild ID、manifest SHA-256、file count、total bytesへ構造化し、`release-candidate.json`との完全一致を必須化した。desktopはkeyboard 1経路と3 viewportのPointer Eventsに対応する4 run以上、実モバイルは縦横に対応する2 run以上を要求し、run数と同数の非空結果を必須化した。既存Chrome・Edge・Firefox証拠を新形式へ移行し、部分一致の偽identityを拒否する回帰テストを追加した。

Computer UseはSafariとAndroid Tabletを承認せず、ADB接続は0台、開発機はM4 Pro・48GBで物理低性能対象ではなかった。固定RCの配信ファイルと現在の60/67件合格、7件ブロック、`accepted: false`は変更していない。

## 完了した実行経路証拠の構造化

campaign件数と自由記述結果だけでは、同じrunを重複させてdesktopのkeyboard／3 viewport Pointer Eventsまたは実モバイル縦横を検証済みと主張できた。各runをinput mode、viewportまたはorientation、stage数、結果へ構造化し、desktopの必須4組と実モバイルの必須2組を各1回だけ要求するよう最終検収監査を強化した。構造化結果と既存の結果列の不一致も拒否する。

物理低性能端末の性能証拠にも固定RCのbuild ID、manifest SHA-256、file count、total bytesとの完全一致を必須化した。重複desktop run、縦向きだけの実モバイルrun、結果不一致、物理端末のidentity欠落を拒否する回帰テストを追加し、全212テストと全監査に合格した。

Computer Useの環境一覧にはSafariが現れたが、今回もアプリ操作は承認されなかった。固定RCの配信ファイル、60/67件合格、7件ブロック、`accepted: false`は変更していない。

## 完了した実行件数の厳密化

必須の構造化runを含んでいても、総run数は下限だけの検査だったため、desktopの4経路または実モバイルの縦横2経路へ任意の追加runを混在できた。desktopは厳密に4 run、実モバイルは厳密に2 runを要求し、余分な実行を拒否する回帰テストを追加した。全214テスト、固定RCの100 files・10,526,479 bytes再現build、全監査に合格した。

固定RCのlocalhost配信に対して公式SafariDriver 26.6.2を起動したが、Safari設定の`Allow remote automation`が無効でセッション作成を拒否された。Computer UseもSafari操作を承認しなかったため、設定を変更せず`not-run`を維持した。固定RCの配信ファイル、60/67件合格、7件ブロック、`accepted: false`は変更していない。

## 完了した実行成功状態の明示化

構造化runの`result`は非空文字列と配列順の一致だけを要求していたため、入力方式、viewport／orientation、4面実行の組を満たしながら、失敗を表す自由記述を成功証拠として混入できた。各desktop／実モバイルrunへ機械判定可能な`outcome: "pass"`を必須化し、欠落または`fail`を拒否する回帰テストを追加した。既存3 desktop browserの実測記録も同じ形式へ移行した。

全215テスト、固定RCの100 files・10,526,479 bytes再現build、全監査、依存脆弱性0件を確認した。Computer UseはSafari操作を今回も承認しなかったため、新しい環境証拠はなく、60/67件合格、7件ブロック、`accepted: false`を維持する。

## 完了した証拠日付の時間順序検査

互換性記録は日付の字面だけ、最終判定は非空文字列だけを検査していたため、存在しない暦日、固定RC作成前の環境証拠、証拠より古い最終判定日を拒否できなかった。全Phase 10記録へ実在するISO暦日を要求し、互換性・証拠台帳は固定RC作成日以後、最終判定日は参照する全記録以後であることを必須化した。現在の記録はRC 2026-10-24、互換性・証拠・判定 2026-10-25で整合する。

SafariはComputer Useから承認されず、ADB接続は0台、Apple device一覧はMac本体とSimulatorだけだった。固定RCの配信ファイル、60/67件合格、7件ブロック、`accepted: false`は変更していない。

全216テスト、固定RCの100 files・10,526,479 bytes再現build、全監査、依存脆弱性0件を確認した。共通schemaを変更する初案は配信容量を247 bytes変え、RC再現性テストが拒否したため、変更を配信対象外のPhase 10監査層へ限定した。

## 完了したdesktop実測値の整合性検査

desktop browserの`checks`が全てtrueでも、具体的なconsole件数、外部origin一覧、viewport別overflow値が矛盾している状態を最終監査が受理できた。Chrome、Edge、Firefox、Safariの`pass`には、console warning/error 0件、外部originの空配列、1568×956・390×844・844×390の縦横overflow 0を構造化した実測値として必須化した。booleanだけをtrueにして実測値を悪化させたfixtureを拒否する回帰テストを追加した。

SafariはComputer Useから承認されず、公式SafariDriverの有効化も管理者認証を通過しなかった。設定を迂回せず`not-run`を維持した。固定RCの配信ファイル、60/67件合格、7件ブロック、`accepted: false`は変更していない。

全217テスト、固定RCの100 files・10,526,479 bytes再現build、全監査、依存脆弱性0件を確認した。

## 完了した実モバイル実測値の整合性検査

実モバイルは4面実行と縦横、multi-touch、スクロール競合、44 CSS px、safe-areaの真偽値を満たしても、その具体的な実測値が欠落または矛盾する証拠を合格にできた。iOS Safari／Android Chrome実機の`pass`へ、console warning/error 0件、外部origin 0件、縦横それぞれの正しいCSS viewport寸法とoverflow 0、同時タッチ2点以上、スクロール競合0件、最小タッチ対象44 CSS px以上、safe-area違反0件を構造化して必須化した。

真偽値だけをtrueにして実測値を悪化させたfixtureを拒否し、全条件を備えた将来の合格遷移fixtureは引き続き通過する回帰テストを追加した。現在は実モバイルが未接続のため新しい合格証拠はなく、固定RCの配信ファイル、60/67件合格、7件ブロック、`accepted: false`は変更していない。

全218テスト、固定RCの100 files・10,526,479 bytes再現build、全監査、依存脆弱性0件を確認した。

## 完了した物理低性能端末実測値のfail-closed化

物理低性能端末は5分以上、目標fps、simulation drop、入力応答、停止なし、進行速度、resource傾向の真偽値を要求していたが、最大frame、入力遅延、進行時間差、heap・resource・DOM、console・外部originの具体値が矛盾していても合格にできた。合格時には平均60fps以上に加えて、最大frame 1秒以下、最大入力遅延100ms以下、simulation drop・進行時間差1%以下、heap増加16 MiB以下、resource・DOM・console・外部origin増加0の構造化実測値を必須化した。

真偽値だけをtrueにして各実測値を閾値外へ悪化させたfixtureを拒否し、全条件を備えた将来の合格遷移fixtureは引き続き通過する回帰テストを追加した。Android実機は0台、Apple device一覧はMac本体とSimulatorだけで、Computer UseからのSafari操作も承認されなかったため、固定RCの配信ファイル、60/67件合格、7件ブロック、`accepted: false`は変更していない。

全219テスト、固定RCの100 files・10,526,479 bytes再現build、静的・受け入れ・証拠・最終検収・release artifact・依存監査に合格し、既知脆弱性は0件だった。

## 完了したRC manifest identityのfail-closed化

端末証拠のbuild identityはRCと完全一致していたが、最終検収監査単体ではRC manifest側のSHA-256形式、file count、total bytesの型と正値を検査していなかった。RCと合格済み環境証拠を同じ不正値へ改変した場合でも一致扱いにしないよう、manifest object、64文字の小文字16進SHA-256、正の整数のfile count・total bytesを必須化した。

不正manifestと、それに一致するよう改変した環境証拠を拒否する回帰テストを追加した。Computer UseはSafariとAndroid Tabletの操作を承認せず、ADBは接続0台、Apple device一覧も`No devices found`だったため、固定RCの配信ファイル、60/67件合格、7件ブロック、`accepted: false`は変更していない。

全220テスト、固定RCの100 files・10,526,479 bytes再現build、静的・受け入れ・証拠・最終検収・release artifact・依存監査に合格し、既知脆弱性は0件だった。
