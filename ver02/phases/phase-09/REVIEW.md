# Phase 09 review — ポリッシュとベータ

判定: 完了（2026-10-24）

## ゲート判定

Phase 09で定めた難度、視覚状態、アクセシビリティ、音声、互換性、長時間性能の検査を実行し、観測範囲に残るcritical／majorの既知不具合は0件だった。`beta-gate.json`は、未確認環境を既知不具合や合格へ読み替えず、Phase 10の終了を止める受け入れblockerとして分離している。

Phase 10の開始は許可する。ただし最終検収の合格は許可しない。現時点の必須ブラウザ・端末は6対象中Chrome desktopの1対象だけが合格し、実モバイルは0対象である。さらに互換性確認時と現在のsoak buildでbuild IDが異なるため、Phase 10では単一のrelease candidateを固定して全対象を再検証する必要がある。

## 品質目標の結果

- 標準／アシスト、危険予告、導入間隔、被弾分布、武器交換は全4面の決定的監査に合格した。
- 4面×4表示profile×10武装状態を描画命令まで再実行し、重要状態・演出・非色形状の欠落と署名衝突は0件だった。
- 全4面の通常2層／boss 3層は6分相当で位相差0 sample、危機層欠落時も通常層とゲーム進行を維持した。
- Chrome desktopはPointer Eventsによる4面campaign、ポーズ・復帰、3 viewport、console、resource、外部通信の検査に合格した。
- 4倍全画面描画でplaying実時間300,000.9msを継続し、116.1fps、simulation drop 0.703%、warmup後heap増加782,631 bytes、resource／DOM増加0で閾値に合格した。
- `npm run verify`は191テスト、100 files・10,526,479 bytesの再現build、外部URL 0件に合格し、high以上の依存脆弱性は0件だった。

## Phase 10へ残すblocker

1. Edge、Firefox、Safari、iOS Safari実機、Android Chrome実機を同一release candidateで検証する。
2. 物理低性能対象端末でfps、進行速度、入力、5分以上の停止・資源傾向を測る。
3. Phase 10の全受け入れ行を、固定したbuild IDと実在する証拠へ対応付ける。
4. 画像生成の利用条件、非一意性・非侵害未保証、配布通知、成果物hashをrelease candidateで再照合する。

楽しさ、操作感、聴感、美しさ、懐かしさ、新しさは未測定である。2026-10-21のユーザー指示に従い、これらを機械検査から推定せず、進行ゲートにも使わない。
