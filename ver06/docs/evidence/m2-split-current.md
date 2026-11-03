# M2 evidence — SPLIT CURRENT

検証日: 2026-11-03

## 規則

- 高速3体と遠方の低速3体が0.6秒に同時出現する。
- 1.15秒に初期3波紋を連打すると、高速群だけを排除して残量0となり、低速群の3体同時被弾で敗北する。
- 1.15秒と6.15秒に1波紋ずつ放つと、耐久3、6排除、残量1で勝利する。
- Vitestで上記2経路を回帰テスト化し、全9件が合格した。

## Chrome実入力

- FIRST RAIN、SHORE CALLを既定戦略で連続クリアし、結果画面の`ENTER READ THE CURRENT`からSPLIT CURRENTへ遷移した。
- 高速群は橙色の長い尾、低速群は紫色の外周輪を持ち、3体ずつが左右に分かれて同時に見える。
- 1.15秒と6.15秒のSpace実入力で`SPLIT CURRENT HELD`へ到達し、耐久3、6排除、残量1を確認した。
- 1280×720のゲーム画面でHUD、6胞子、池、操作案内、結果overlayに欠けや重なりはない。console error / warningは0件だった。

## 自動検証

```text
Test Files  1 passed (1)
Tests       9 passed (9)
tsc --noEmit: passed
vite build: passed
```
