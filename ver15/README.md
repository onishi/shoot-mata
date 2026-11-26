# FOUNDRY CLAMP v15.0

鋳造所の作業ロボを操り、暴走機をつかみ、飛び道具に転用するベルトスクロールアクション。現在は搬入口の戦闘を試す M1 プロトタイプです。

```sh
cd ver15/game
python3 -m http.server 45157 --bind 127.0.0.1
```

Chrome で http://127.0.0.1:45157/ を開く。Enter で開始・再開・再挑戦、矢印キーで移動、Z でつかむ／投げる、X で回避、Esc で一時停止。監督機は小型機を投げ当てて止める。

進捗と検証結果は [status.md](docs/status.md) を参照。
