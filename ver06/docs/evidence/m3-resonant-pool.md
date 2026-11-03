# M3 RESONANT POOL evidence

検証日: 2026-11-03

## 規則

- 単独波紋だけを放つ固定入力は重い胞子を1体も排除できず、月花の耐久が0になって敗北する。
- 0.05秒に開始位置で1波紋目を放ち、右へ0.37秒移動して0.42秒に2波紋目を放つと、重なり領域で3体全てが共鳴し、耐久3で勝利する。
- 単体テスト21/21に合格した。

## Chrome通し

- Google Chromeへ製品キー入力だけを送り、FIRST RAINからRESONANT POOLまで5面を連続クリアした。
- 第5面は耐久3、排除3で`RESONANT POOL HELD`へ到達した。
- console error、console warning、page errorは0件だった。
- E2E 3/3、型検査、production buildに合格した。

## 目視

- `m3-resonant-pool-playing.png`: 点線殻の重い胞子3体、異なる位置からの2波紋、淡い波紋面と重なり領域、月花、プレイヤー、HUDを確認した。
- `m3-resonant-pool-complete.png`: 勝利overlay、耐久、残り波紋、面名、再挑戦操作に欠けや重なりがないことを確認した。
