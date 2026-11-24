# TIDEBREAK 95 v14.2

洪水都市を突っ切る救難ハイドロフォイルを操り、慣性のある操舵と一瞬のサージで漂流者を救い、瓦礫を砕き、崩壊する防潮線へ駆けつける前進型レスキューレーサー。

## 起動

```sh
cd ver14.2/game
npm run serve
```

PC版Chromeで `http://127.0.0.1:4315` を開く。Enterで開始、左右矢印で操舵、Spaceでサージ、Pでポーズ、Rで再挑戦する。

## 現在地

M5第2回独立批評でFLOOD CUTを4.5秒のCURRENT SLINGへ変え、イベント接近速度、透視線、残秒、エンジン、水音、拍を同期した。40/40 tests、4方針、製品横断監査に合格した。クリーン配布候補は7ファイル108,246 bytesとしてSHA-256を固定し、rootと`/v14.2/`、v14.1以下を含む17経路、14 hash応答、旧版保持をローカル確認済み。現在はRelease Candidateで、Pages公開と本番runtime確認を継続する。

## 検証

```sh
cd ver14.2/game
npm run verify
npm run build:clean
npm run package:release
npm run verify:release
```
