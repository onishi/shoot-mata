# M2 evidence — MOVING DEADLINE

実施日: 2026-11-04

## 自動検証

- `npm run verify`: 合格
- Vitest: 8/8（第2面遷移、一時開放と再閉鎖、勝利経路を含む）
- TypeScript `tsc --noEmit`: 合格
- Vite production build: 合格
- bundle: JavaScript 12.43 kB、CSS 0.89 kB（gzip前）

## Chrome実入力

1. DEAD LETTERを通常解で完了し、勝利overlayのEnterからMOVING DEADLINEへ進んだ。
2. 上、上、右5手を入力してEnterで7手の残務影を確定した。
3. 局員を右へ6手進めた。影が上段の印へ到着した同じ手に局員が下段の扉を通り、Canvasの読み上げ名も`Censorship gate open`へ変化した。
4. 右へ1手進むと影が印を離れ、扉が再び閉じた。同時に封書を回収した。
5. さらに右へ進み、`LETTER DELIVERED`へ到達した。console error / warningは0件だった。

## 目視結果

- 上段の影用経路と下段の局員用経路が入口で分岐し、同じ横方向の距離として比較できる。
- 印作動時は青緑の影、同心円、斜めの作動線、破線の扉、扉上の局員を同時に判読できる。
- 面名、目的文、歩数HUD、盤面、操作欄、勝利overlayに欠けや重なりはなかった。

## 判定

第2面の機械的な完成条件を満たす。初見理解は未評価のため、説明追加はせず第3面までの段階導入を通したプレイテストで判断する。
