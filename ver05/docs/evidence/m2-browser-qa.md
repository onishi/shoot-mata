# M2 Browser QA Evidence

日付: 2026-11-03

## 対象

- Production build (`vite preview`)
- Google Chrome 156.0.8078.76
- 1280×720、640×800

## 自動操作

- タイトルからFIRST CHORDを開始し、ポーズ、ヒント2段階、ポーズへの復帰、再開を実キーで確認した。
- 4部屋すべてを固定3フレーズ解法で連続クリアし、最終 `SCORE COMPLETE` へ到達した。
- 完了後の保存が `highestUnlockedRoom: 3`、`completedRooms: [0,1,2,3]`、`hintsSeen: [0]` であることを確認した。
- 再読み込み後に第4室が選択され、開始時は0/8拍・録音済みVOICE 0本へ安全に戻ることを確認した。
- 音量75%と動きの軽減ONを実キーで設定し、再読み込み後も維持されることを確認した。
- ブラウザconsole errorとpage errorは0件。faviconの404を検出した初回実行を、自己完結data URL favicon追加後に修復した。

## Viewport監査

両viewportのタイトル、ヒント、ポーズでキャンバス境界を数値検査し、左右上下がviewport内、16:9比率であることを確認した。640×800ではPC向け16:9画面を中央配置し、上下余白は生じるが、主要文字、ボタン、盤面、HUD、overlayに切れや重なりはない。

目視した証跡:

- `m2-e2e-score-complete.png`
- `m2-viewport-title-1280x720.png`
- `m2-viewport-hint-1280x720.png`
- `m2-viewport-paused-1280x720.png`
- `m2-viewport-title-640x800.png`
- `m2-viewport-hint-640x800.png`
- `m2-viewport-paused-640x800.png`

## 結果

- `npm run verify`: 単体19/19、型検査、production build、Google Chrome E2E 2/2 合格
- M2のブラウザQA受け入れ条件を満たした。

## 残る判断

640×800では全画面を縮小するため文字は小さい。PC Chromeを第一対象とするM2では判読可能と判断するが、M4のアクセシビリティ監査では最小実用解像度と拡大時の代替提示を再評価する。
