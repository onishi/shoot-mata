# M2 Progressive Hints Evidence

検証日: 2026-11-03

## 対象

- FIRST CHORD、HELD NOTE、LONG TONE、FINAL CADENCEの各3段階ヒント
- ゲーム中／ポーズ中のヒント遷移
- version 1保存の`hintsSeen`

## 自動検証

`npm run verify`に合格した。

- Vitest: 2ファイル、19テスト合格
- `markHintSeen`は有効な部屋を一度だけ記録し、範囲外入力を無視する
- TypeScript型検査合格
- Vite production build合格

## Chrome目視

保存済み進行からHELD NOTEを開始して確認した。

- HでHINT 1/3を開き、盤面、部屋名、拍情報を背後に保持した
- Hを2回押してHINT 3/3まで進み、段階ドットと本文が欠けずに表示された
- ヒントを閉じてポーズし、ポーズ中にもHで同じヒントを開けた
- Escapeでヒントを閉じるとPAUSEDへ復帰し、意図せずゲームを再開しなかった
- HUDにHINT / Hの常設導線があり、閲覧後はキー表示が金色に変わった

ヒント本文は固定解法の方向列を記載していない。規則、役割、同期させる拍の考え方までを段階的に示す。

## 結論

M2のヒント要件を満たす。残るM2作業はChrome E2Eと複数viewport監査である。
