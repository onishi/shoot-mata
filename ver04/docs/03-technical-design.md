# Technical Design

## 1. 実行構成

`ver04/game/`を独立したnpmプロジェクトにし、TypeScript、Vite、Canvas 2D、Web Audio APIで新規実装する。ランタイム依存を最小化し、ゲーム規則にブラウザAPIを入れない。テストはVitest、Chrome通しはPlaywrightを使う。

```text
game/
  assets/manifest.json
  src/
    core/        # 数学、固定tick、PRNG、入力、状態型
    simulation/  # player, trail, loop, combat, enemy, stage, scoring
    content/     # 敵・面・欄外注のデータ
    render/      # Canvas描画、カメラ、エフェクト、UI
    audio/       # ミキサ、再生指示、設定
    app/         # 画面遷移、保存、起動
  tests/         # 単体、統合、決定性
  e2e/           # Chrome通し、画像、性能
  scripts/       # 自動操縦、素材・音量・性能監査
```

過去版からファイルをコピーしない。依存の設定もv4の必要条件から作る。

## 2. 決定的シミュレーション

ゲーム規則は毎秒120tickの固定刻み。表示は`requestAnimationFrame`で補間する。1フレームの遅延を250msで打ち切り、最大8tick処理後は余剰時間を破棄して停止連鎖を防ぐ。ポーズ中はaccumulatorを進めない。

`step(state, inputFrame) -> { state, events }`を中心にする。状態更新は同じ初期状態、seed、入力列から同じ整数・量子化値を返す。乱数はシード付きPRNGを状態に含め、描画粒子用乱数とゲーム規則用乱数を分離する。

座標と速度は内部では整数の1/256px単位、角度は0〜65535の固定表現を使う。ポリゴン判定で境界が揺れないよう、航跡点は移動距離6px以上または50ms経過で追加し、古い点をtickで期限切れにする。

イベントは`shot-fired`, `loop-ready`, `loop-collated`, `bullet-captured`, `damage`, `enemy-defeated`, `audio-cue`などの値として返す。描画と音はイベントを消費するだけで状態を変更しない。

## 3. 航跡と閉路

航跡は`{x, y, bornTick, segmentId}`の列。新しい線分と、隣接2線分および直近12px以内の線分を除く過去線分の交差を探す。空間ハッシュ（セル64px）で候補を絞る。

M1では最も新しい有効交点から現在点までを単一ポリゴン候補にする。有効条件は以下。

- 3点以上、符号付き面積の絶対値が最小8,000px²以上。
- 自己交差を含まない。追加交差があれば最も内側の単純環を選ぶ。
- 画面外頂点がない。
- 周長が航跡の有効長を超えない。

点の内外は半開レイキャスト規則、線上は内側として扱う。敵弾は中心点、敵は当たり判定中心が内側なら対象。完成版では大型ボス部位ごとに判定点を持つ。確定時に対象IDを昇順で処理し、上限を超えた弾は輪の中心に近い順、同距離はID順に選ぶ。

RETRACEは直近の航跡を弧長で逆走する。移動中もtickごとに当たり判定し、敵弾だけを無視する。終点が地形内なら、最後の安全点へ戻し、地形接触を1回記録する。

## 4. 戦闘とコンテンツデータ

エンティティは安定した連番IDを持つ構造体配列として管理し、更新順をIDで固定する。衝突解決順は、入力、移動、出現、敵行動、弾移動、閉路確定、自弾命中、敵弾命中、体当たり、撃破、期限切れ。

敵・攻撃・ステージはTypeScriptの検証済みデータで定義する。任意コードをデータ文字列から実行しない。各敵は役割、当たり判定、耐久、状態機械、予告、攻撃、得点、素材IDを持つ。ステージ表はtick、出現位置、編成ID、環境状態、チェックポイント、章イベントを持つ。

画面外で無限に生存する敵を防ぎ、各出現には最大生存tickまたは明示退場を必須にする。弾・敵・粒子にはプール上限を設け、規則上限超過は優先度の低い生成を拒否して計測する。目標上限は敵64、敵弾512、自弾128、視覚粒子1,200。

## 5. 状態機械

トップレベルは判別可能な`AppState`で管理し、不正遷移を関数で拒否する。

```text
boot -> title -> guide/settings/credits
title -> stageIntro -> playing <-> paused
playing -> marginalia -> playing
playing -> continue -> stageIntro | title
playing -> result -> stageIntro | ending
ending -> campaignResult -> title
```

画面遷移時に押下中キーをクリアし、復帰直後の射撃や決定暴発を防ぐ。`visibilitychange`とwindow blurでは自動ポーズし、復帰は明示入力を要求する。ポーズ、結果、コンティニュー中にsimulation tickは進まない。

## 6. 保存

保存キーは`palimpsest-wake:v4.0:save`、設定は`palimpsest-wake:v4.0:settings`として旧版と分離する。JSONには`schemaVersion`, `buildVersion`, `stage`, `checkpoint`, `health`, `gauge`, `marginalia`, `score`, `seed`とチェックサムを含める。

読込時はスキーマ検証し、未知版、破損値、範囲外値は拒否する。保存は一時キーへ書いて読戻し後に本キーを更新する。quota、security、private modeなどの例外を捕捉し、保存不能でもゲームはメモリ上で継続する。壊れた保存は削除せず隔離キーへ移す。

## 7. 描画とアクセシビリティ

Canvasの内部解像度は1280×720、CSSでアスペクト比を維持して整数に限定せず拡大する。devicePixelRatioは最大2。座標変換は1か所に集約し、当たり判定と表示の中心・半径を素材メタデータから共有する。

背景層、世界、危険、航跡、エフェクト、HUDの順に描く。危険と航跡は色だけでなく輪郭・塗り・動きが異なる。点滅軽減、画面揺れ0、BGM/SE個別音量を起動前にも設定可能にする。

Canvas外にスクリーンリーダー用の状態テキストと操作可能なHTMLメニューを置く。プレイ本体はキーボード中心だが、メニューのフォーカス順、Enter/Escape、aria-labelを検査する。

## 8. 音

ユーザー操作後にAudioContextを開始する。simulationの`audio-cue`をミキサへ渡し、BGM、SE、UI、環境のbusを分ける。BGMとSEの設定値は知覚的カーブへ変換する。

同一SEの連打は最小間隔と同時数を定義する。非決定的な音の揺らぎはaudio専用seedで行い、ゲーム状態に影響させない。タブ非表示・ポーズで短くフェードし、復帰時にBGM位置をゲームtickへ再同期する。

## 9. ビルド、検証、公開

想定コマンドは以下。

- `npm run dev`: ローカル開発。
- `npm run build`: 型検査後、静的成果物を生成。
- `npm test`: 単体・統合テスト。
- `npm run test:e2e`: Chrome通しと画像採取。
- `npm run audit:assets`, `audit:audio`, `audit:perf`: 個別監査。
- `npm run verify`: lint、型、単体、ビルド、素材、音量、Chrome、性能を順に実行。

`dist/`は相対パスで動作させ、トップと`/v4.0/`の両方へ同一の検証済みartifactを配置できるようにする。公開CIはverify成功後だけデプロイし、artifactにbuild versionとgit commitを埋める。

v4.0完成までは公開トップを変更しない。完成後は旧v3固定URL、`/v4.0/`、トップのHTTP 200、タイトル画面の版表示、主要素材のMIMEを外部から検査する。失敗時は以前のartifactへ戻せるよう、公開artifactをリリース単位で保持する。
