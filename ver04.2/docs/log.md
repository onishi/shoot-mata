# v4.2 Log

## 2026-11-02 — baseline再評価と改善方針固定

- v4.1を変更しない一時コピーでautoplay 14/14、simulation性能、seed 4700〜4702の3難易度9周、production build、Chrome E2E 24/24を再実行した。
- 9/9周は22.95〜24.31分で完走しコンティニュー0。被弾中央値はECHO 2 / NORMAL 2 / PROOF 3で、PROOF差はあるがECHO / NORMAL差は実測へ現れなかった。
- simulationは平均0.033ms / p95 0.054ms / 最大2.469ms。Chromeは平均0.067ms / p95 0.100ms / 最大3.000ms、long task 0、heap増加4.11%だった。
- 全画面再採取と目視で、通常弾が攻撃種によらず同じ赤い二重円へ収束すること、AFTERWORD説明が右端カードから切れること、Stage 1 / 2 / 5ボスが短いことを確認した。
- `m3-22-last-editor-phase-1.png`が実際にはphase 3を表示するQAシナリオ不備を発見した。v4.1は固定し、v4.2独立土台の最初に回帰テストごと修復する。
- 攻撃表現、MARGINALIA比較、初回30秒、短い3ボス、ECHO / NORMAL差の5件を`00-v4.2-direction.md`へ固定した。
- 最初のChrome実行はsandboxのpreview port権限で失敗した。許可済みローカルpreviewから同じproduction buildを再実行して24/24に合格した。
