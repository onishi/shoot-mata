# M3 SHIFTED GATE 検証記録

実施日: 2026-11-03

## 実装

- 第11室を6拍として追加し、左の起動盤、中央の拍扉、奥と右の音盤を配置した。
- 起動役は`左×3、上、待機×2`、中央役は`上、待機×2、上×3`、右役は`右×3、待機×2、上`を固定解法とした。
- 規則、役割、同期拍を順に示す3段階ヒントを追加した。

## 自動検証

- `npm run verify`: 合格
- Vitest: 40/40
- TypeScript型検査: 合格
- production build: 合格
- Google Chrome E2E: 2/2
- E2Eでタイトルから11室を実キー入力だけで連続クリアした。
- 4/6拍の開扉、6拍目の勝利、`highestUnlockedRoom: 10`、完了室0〜10、第11室再開時の0拍・VOICEなし、console/page error 0件を確認した。

## 目視

- `m3-shifted-gate-open.png`: 左盤の起動役と中央扉の通過役が4拍目に同時成立し、金色の導線と開扉状態を判別できる。
- `m3-e2e-shifted-gate-complete.png`: 6拍HUD、録音済み2譜面、三奏者の成立、勝利overlayに欠けや重なりがない。

## 残課題

第12室CHORUS SHIFT、終演演出、完成音響、M4のアクセシビリティ・全画面・性能監査は未完了。
