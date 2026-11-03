# M3 REED GATE evidence

実施日: 2026-11-03

## 規則

- 葦帯は月花の右側、中心半径132、角度-0.68〜0.68ラジアンの弧として定義した。
- 波紋原点から胞子への線分と葦弧の交差を判定し、交差時はその波紋による反射を無効にする。
- 中央側から2.0秒・7.2秒に放つ固定戦略は0排除で敗北した。
- 最初の1.2秒で右上へ移動し、葦の外側から同じ時刻に放つ固定戦略は耐久3・6排除で勝利した。

## Chrome実入力

- Google Chromeへ矢印キーとSpaceを送り、FIRST RAIN、SHORE CALL、SPLIT CURRENT、REED GATEを連続クリアした。
- REED GATEでは開始直後に右上へ1.2秒移動し、2.0秒と7.2秒にSpaceを入力した。
- 最終状態は`won`、耐久3、排除6。console error / warningは0件だった。

## 目視

- [プレイ中](m3-reed-gate-playing.png): 葦の外側にいるアメンボ、葦より手前と奥へ広がる二重波紋、右から来る3胞子、月花、残量2、残り12秒を同時に判読できる。
- [結果](m3-reed-gate-complete.png): `REED GATE HELD`、6排除、再挑戦操作が欠けずに表示される。
- 1280×720でHUD、footer、池の境界に欠けや重なりはなかった。

## 自動検証

- Vitest: 19/19
- TypeScript: 合格
- production build: 合格
- Google Chrome E2E: 3/3
