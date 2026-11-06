# Technical design

## 構成

- Vite + Vanilla JavaScript + Canvas 2D
- `model.js`: 固定時間刻みで進む決定的規則。DOM、Audio、描画へ依存しない
- `main.js`: 入力、固定刻みループ、Canvas描画、Web Audio、ARIA通知
- Node標準test runnerで規則を検証する

## 決定性

ゲーム状態に経過時間、風フェーズ、位置、速度、張力、回収状態を保持する。乱数はM1で使わない。ブラウザ側は最大追いつき回数を制限し、背景復帰時に時間を捨てる。

空域ごとの片配置、雲矩形、突風の横力は`AIRSPACES`へデータとして置く。雲矩形内では突風の横力と巻き上げ時の追加張力を無効化し、同じ判定を規則、描画、accessible nameから参照する。

## 座標

内部解像度960×540。CSSで16:9を保ち、狭幅ではHUDをCanvas内へ収める。入力はkeydown/keyupを状態として保持する。

## アクセシビリティ

Canvasはフォーカス可能なapplicationとし、状態・風・張力・回収数をaccessible nameとlive regionへ反映する。色だけでなく線幅、文字、形で状態を区別する。
