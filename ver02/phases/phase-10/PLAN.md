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
2. [未着手] 受け入れマトリクスの全ID、証拠パス、状態を機械監査する
3. [未着手] 全自動検査、静的成果物、権利・通知、依存関係をrelease candidateで再検証する
4. [未着手] 全必須ブラウザ・実端末・物理低性能端末を同一buildで検証する
5. [未着手] 全受け入れ行を更新し、中核未達0件と重大既知不具合0件を判定する
6. [未着手] `REVIEW.md`へ合否、残存する低リスク、未測定の主観品質を記録する

## 完了条件

- [x] release candidateが単一build IDと全ファイルhashで固定され、再現buildと一致する
- [ ] 製品要件の全必須IDが実在する証拠へ追跡できる
- [ ] READMEの必須要件に未達・不合格・blockが0件である
- [ ] 必須ブラウザ4種、iOS Safari実機、Android Chrome実機が同一buildで合格する
- [ ] 物理低性能端末で進行速度、入力、5分以上の停止・資源傾向を確認する
- [ ] 全素材・通知・依存関係をrelease candidateで再確認する
- [ ] critical／majorの既知不具合が0件で、残存リスクと主観未測定を分離して記録する

## 最初の作業単位

build IDを`phase10-rc1-20261024`へ固定し、静的buildの全ファイルhashを含むmanifest自体のSHA-256、ファイル数、総容量を`release-candidate.json`へ記録する。再buildが同じmanifestへ一致しなければ検収を開始しない。

build manifestは100 files・10,526,479 bytes、SHA-256 `3c25733152691eadf21eaa5919a538c29919b5451a6d7045cf8420dde012e7ab`で固定した。専用テストはfresh buildを作り、build ID、全ファイル一覧を含むmanifest hash、件数、容量が記録と一致することを検査する。`accepted`はfalseのまま保持し、残りの検収前に公開可能と扱わない。

## 次の作業単位

`02-product-requirements.md`と`02-acceptance-matrix.md`の全IDを機械的に照合し、欠落ID、重複ID、証拠のない合格、許可外状態を拒否するPhase 10監査を追加する。
