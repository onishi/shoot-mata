# M1 evidence — DEAD LETTER

実施日: 2026-11-04

## 自動検証

- `npm run verify`: 合格
- Vitest: 5/5
- TypeScript `tsc --noEmit`: 合格
- Vite production build: 合格
- bundle: JavaScript 11.53 kB、CSS 0.89 kB（gzip前）

## Chrome実入力

1. タイトルでEnterを押しDEAD LETTERを開始した。
2. 右へ2手進み、Enterで2手の記録を確定した。局員は入口へ戻り、青緑の残務影が現れた。
3. 右へ2手進むと残務影が朱色の感圧印へ到着し、同じ手で検閲扉が青緑の破線表示へ変わった。Canvasの読み上げ名も`Censorship gate open`へ更新された。
4. 右へ進んで扉を通り、封書を回収して投函口へ到達し、`LETTER DELIVERED`を確認した。
5. console error / warningは0件だった。

## 目視結果

- タイトルは記録票を模した象牙色の面と朱色の印で、ゲーム本編の表現を事前提示している。
- 初回確認では`DEAD LETTER`と目的文が重なっていた。目的文を独立行へ移し、再確認で解消した。
- 修正後は現在の局員、印上で停止した青緑の残務影、両者を結ぶ開放線、破線化した扉、封書、投函口を同時に判読できた。
- 勝利overlayは背景を十分暗くし、結果、理由、再開操作に欠けや重なりがなかった。

## 判定

M1完成条件を満たす。初見でEnterを「残務影の配置」と理解できるかは未評価のため、説明追加ではなく第2面の配置と実プレイで検証する。
