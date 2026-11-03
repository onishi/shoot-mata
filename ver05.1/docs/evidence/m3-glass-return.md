# M3 GLASS RETURN 検証記録

実施日: 2026-11-03

## 対象

- 第6室GLASS RETURN
- 二枚の反転床による左右反転と復元
- 6室連続進行、保存、再読み込み

## 規則・解法

- 最初の奏者は `右 右 上 右 上 待 待 待` を録音する。
- 録音中は文字どおり右上へ進む。再演では一拍目に一枚目へ入り、二拍目の右が左になる。三拍目の上で二枚目へ入り、四拍目の右から通常方向へ戻る。
- 残る奏者を左右の音盤へ送り、5拍目に中央上を含む三枚を同時占有する。

## 自動検証

- `npm run verify`: 合格
- Vitest: 25/25
- TypeScript: 合格
- production build: 合格
- Google Chrome E2E: 2/2
- E2Eでタイトルから6室を実キー入力だけで連続クリアした。
- `highestUnlockedRoom = 5`、`completedRooms = [0,1,2,3,4,5]`を保存し、再読み込み後は第6室の0拍・VOICE 0本から開始した。
- console error / page error: 0件

## 目視

- `m3-glass-return-replay.png`: 二枚の青いガラス、反転区間から復元後までの軌跡、録音譜面を確認した。
- `m3-e2e-glass-return-complete.png`: 第3フレーズ5拍目のSCORE COMPLETEと背後の成立盤面を確認した。
- 1280×720で盤面、HUD、操作表、メッセージ、勝利overlayに欠けや重なりはない。

## 結論

MIRROR ENTRYの一方向反転を、区間として開始・終了させる判断へ発展できた。次は第7室REST MARKで静寂帯を単独導入する。
