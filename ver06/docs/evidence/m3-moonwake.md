# M3 MOONWAKE evidence

検証日: 2026-11-03

## 規則

- 月花は12秒周期で池の左右を往復し、胞子は指定された到達時刻の月花位置へ進む。
- 同じ2.0秒・7.3秒・13.0秒の3波紋を開始位置から放つ戦略は、一部の胞子へ半径132の波紋が届かず敗北する。
- 月花の航路を追いながら同時刻に放つ戦略は、耐久3、6排除、残量0で16秒を守り切る。

## Chrome実入力

- Google Chromeへ矢印とSpaceを送り、FIRST RAINからMOONWAKEまで6面を連続クリアした。
- MOONWAKEは右、左、右へ花を追い、2.0秒・7.3秒・13.0秒に発射して`MOONWAKE HELD`へ到達した。
- console error / warningは0件だった。

## 目視

- [プレイ中](m3-moonwake-playing.png): 点線の航路、未来位置の輪、胞子の予測線、移動した月花、短い波紋を同時に判読できる。HUD、池、footerに欠けや重なりはない。
- [勝利](m3-moonwake-complete.png): `MOONWAKE HELD`、6排除、再挑戦操作が明瞭で、overlayの欠けや重なりはない。

## 自動検証

- `npm run verify`: 単体23/23、型検査、production build、Google Chrome E2E 3/3。
