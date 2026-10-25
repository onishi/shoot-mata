# 05 技術設計

状態: Phase 05進行中（2026-10-21）

## 1. 設計原則

- 製品コードは単一の `ver02/game/` で育て、フェーズごとに複製しない。
- ゲーム規則はDOM、Canvas、Web Audio、storageから分離したES moduleに置く。
- シミュレーションはseed、初期状態、入力列から再現できる決定的な処理にする。
- ブラウザAPIは薄い境界アダプターへ閉じ込め、拒否・非対応・例外を通常の結果として扱う。
- Phase 04の素材はコピーせず、`ver02/assets/` の同一ファイルを参照する。
- ビルド時通信や実行時の外部通信を前提にせず、静的配信だけで主要機能を成立させる。

## 2. モジュール境界

```text
ver02/game/
  src/
    core/          固定時間刻み、状態遷移、乱数、衝突、スコア
    content/       schema検査済みステージ・敵・ドロップ・ボス定義
    ports/         入力、音声、保存、visibility、fullscreenの抽象境界
    browser/       DOM、Canvas、Pointer Events、Web Audio実装
    ui/            ゲーム外画面とHUDの表示モデル
  tests/           unit、integration、full-run
  public/          静的入口と配信対象メタデータ
```

`core` と `content` はブラウザのglobalを参照しない。`browser` はイベントを意味のあるコマンドへ変換し、ゲーム規則を持たない。

## 3. 時間モデル

- 標準更新幅は `1000 / 60 ms` とし、描画ごとの実deltaをaccumulatorへ加える。
- updateは常に固定秒数を受け取り、描画だけがaccumulatorの端数を補間率として使う。
- 1フレームのdeltaは250msまで、1描画のcatch-upは8 updateまでとする。超過時間は記録して破棄し、停止後の瞬間移動や弾幕集中を防ぐ。
- `document.hidden` 中はaccumulatorを進めない。復帰後の最初のframeは基準時刻の再設定だけを行う。
- 30Hz、60Hz、144Hzの同じ経過時間が同じtick数になることをunit testで保証する。

巨大なdeltaで破棄した時間はゲーム時間へ算入しない。これは低fps時の可変delta化ではなく、異常停止から安全に復帰するための上限である。通常計測でcatch-up上限へ継続到達する場合は性能不合格として扱う。

## 4. 状態と決定性

ゲーム全体は画面状態とプレイ状態を明示的に分ける。画面状態は `title / stageSelect / settings / tutorial / stageIntro / playing / paused / result / gameOver / ending / credits` を持つ。再挑戦・タイトル離脱の確認は画面状態と分離し、確認中に別遷移を受理しない。プレイ状態はserializableな値だけで構成し、描画オブジェクトやAudioNodeを保持しない。

乱数はステージ開始時のseedから生成し、ステージデータ、入力コマンド、tick番号を記録すれば同じ結果を再生できる構造にする。日時と乱数globalをゲーム規則から直接参照しない。

## 5. 入力

キーボードとPointer Eventsを `moveX / moveY / fire / confirm / back / pause` の共通コマンドへ正規化する。移動は矢印またはWASD、射撃はZまたはSpace、決定はEnter、戻るはEscape、ポーズはPを標準割当にする。決定・戻る・ポーズは押下edge、移動・射撃は保持状態として扱い、key repeatで単発操作を重複させない。

複数pointerIdは移動と射撃などの役割ごとに保持する。移動pointerは開始点からの相対量を半径48 CSS pxで−1〜1へ正規化し、同時に2本目の移動pointerが触れた場合は既存操作を維持して安全に無視する。`pointerup`、`pointercancel`、`lostpointercapture`、blur、アダプター破棄で押下状態を必ず解放する。pointer captureの拒否は進行を止めない。ブラウザ既定ジェスチャーの抑止は役割を持つゲーム操作領域だけに限定し、キーボードの既定動作抑止はプレイ中だけにする。

## 6. 音声

AudioContextはユーザーのSTART操作から初期化し、生成処理を最初の非同期境界より前に行う。同時の初期化要求は1つへまとめる。BGMとSFXは別gainを持ち、保存した音量とミュートを初期化時と設定変更時に反映する。作成拒否とresume拒否はアダプター全体を無音へ縮退し、decode・再生失敗と個別音源欠落はその操作だけを失敗結果にする。いずれも例外をゲーム規則へ伝播せず、破棄時は再生中sourceとcontextを安全に停止する。

## 7. 保存

保存値はトップレベルにschema versionを持ち、進行、面・難度別best、設定を分離する。現行versionは1とし、進行には初回説明、最大解放面、面・難度別クリア、bestの得点内訳と直前コア列を含める。設定には標準／アシスト、BGM・SFX別音量とミュート、動き・明滅軽減、高コントラストを含める。

読み込みはparse、version判定、schema検査、migrationの順で行う。version 0は既知フィールドだけをversion 1へ移し、破損、未知の過去version、未来version、移行失敗は原文を同一originのrecovery keyへ上書きせず退避して初期値で起動する。初期化は画面上の確認を必須とする。保存APIの取得・読み書き例外はメモリ内継続と警告へ変換し、書込み失敗でもそのセッションの更新値を失わない。

標準製品は個人情報を保存・送信しない。保存先は同一originのlocal storageだけとし、外部分析は導入しない。

## 8. データ駆動コンテンツ

ステージはslug、区間、背景層、敵wave、drop、仕掛け、boss phase、音、遷移をschema検査可能なデータとして持つ。ステージ固有挙動は登録済みの小さなbehavior IDで選び、ステージ番号を列挙する巨大条件分岐を作らない。

schema version 1は、区間がtick 0からステージ終了まで隙間なく連続すること、waveの全spawnが参照区間内に収まること、敵・drop table・区間の参照が解決できること、IDが重複しないことを読込時に検査する。未知fieldと未登録behavior IDは黙って無視せず拒否する。敵出現時刻はデータで固定し、seedは登録済みlane候補と重み付きdropの選択だけへ使う。同じstage定義とseedから同じscheduleを再生成できる。

Phase 05の `phase05-orbital-segment` は基盤検証専用で、Phase 04の背景・代表敵・音を論理asset IDで参照する。`placeholder-*` の敵、boss、音は完成素材ではなく、Phase 06の第1面完成時に台帳の実asset IDへ置換する。

scheduleは純粋な戦闘シミュレーションへ入力し、tickごとの敵出現、敵弾、固有仕掛け、boss phase、dropを同じseedと入力列から再現する。戦闘状態はDOMやCanvasを含まずserializableな値だけで構成し、終了時にstage dataの `STAGE_CLEAR` または `PLAYER_DEFEATED` をflow machineへ返す。Phase 05の被弾規則は最古コアを1個失い、空の状態での被弾は残機を1失う。青補助の無敵延長は、その青コアを失う被弾にも被弾前の構成から適用する。

`core/game-session.mjs` はflow machineと戦闘状態を束ね、キーボードの共通commandと画面内ボタンのactionを同じ遷移へ渡す。ブラウザ入口はsessionのsnapshotだけを表示モデルへ変換し、再挑戦では同じseedから戦闘状態を作り直す。ボタンにフォーカスがあるEnter／Spaceはブラウザのclickと共通commandを二重発火させず、ボタン本来の操作だけを受理する。

player shotは発射時の武器種、Lv、速度、角度をsimulation stateへ保持し、snapshotを通してCanvasへ渡す。Canvasはランス、スプレッド、シーカーを色だけでなく菱形、山形、円形で描き分け、Lvを寸法へ反映する。音声は入力保持やtick剰余から推測せず、cooldownを通過した実発射時の`weapon-fired` eventに含むasset IDだけを再生する。

`app/game-application.mjs` はgame session、保存repository、音声adapterの接続だけを担う。保存済みの説明・解放状態からsessionを作り、説明完了、設定変更、クリア結果を即時保存する。STARTは同期的にaudio adapterの `activate()` を呼んでからflowを進める。保存と音声の警告は例外ではなく表示可能な状態として公開し、どちらの失敗も戦闘更新を停止しない。

## 9. 描画と画面

内部ゲーム座標は16:9で固定し、CanvasをCSSで利用可能領域へcontainする。縦長ではCanvas下に44 CSS px以上の操作領域を置き、HUDの重要情報はCanvas内とアクセシブルなDOM表示モデルを同じ状態から描く。高コントラストと動き軽減は表示アダプターの設定として全画面へ適用する。

Phase 05の論理解像度は1280×720とする。`ui/stage-view-model.mjs` がstage定義、tick、actor、HUD、表示設定をserializableな描画モデルへ変換し、`browser/canvas-renderer.mjs` はそのモデルだけをCanvas 2Dへ描く。背景3層はstageのasset IDとscroll factorを使い、動き軽減時はoffsetを0へ固定する。Canvas外のDOMには同じモデルから現在区間、score、残機を通知し、タッチ操作はCanvasと分離した44 CSS px以上の領域へ置く。

素材URLは `content/asset-manifest.mjs` に集約し、外部URLを持たず、テストで実ファイルとの対応を検査する。素材読込に1点でも失敗した場合は欠落したままゲームを開始せず、画面内の再読込案内とconsole errorへ変換する。Phase 05のplaceholder敵・bossはCanvasの代表画面へ描かず、完成素材として数えない。

## 10. ビルドと配信

ES moduleを基準とし、導入する依存はロックファイル、権利、脆弱性、配信容量への影響を記録する。出力は相対URLで動く静的ファイルとし、実行時外部通信を必要としない。build IDと権利通知を成果物から確認可能にする。

`npm run build` は `dist/` を毎回作り直し、実行に必要な `game/public`、`game/src`、参照中の配信画像・音声だけを収録する。生成時刻を埋め込まず、各ファイルのSHA-256、byte数、build IDを `build-manifest.json` へ固定順で出力する。同じ入力から2回生成したmanifestが一致することを自動検査する。Phase 07以降は制作原本PNGでなく `assets/delivery/` の検査済みWebPを収録し、build時にも第1面2.25 MiB、共有7 MiB、全体16 MiBの上限をfail closedで検査する。`npm run audit:static` は許可外形式、16 MiB超過、HTML/CSS/JavaScript内の外部URLを拒否する。

packageはruntime/dev依存とも0件で、lockfileを保存する。開発・build実行環境は `.node-version` で最新LTSのNode.js 24.22.1へ固定し、`package.json` と `.npmrc` でNode.js 24.22.1以上24系、npm 11.19.1以上11系を必須にする。`npm run audit:deps` はhigh以上を失敗扱いとし、2026-10-23の監査結果は既知脆弱性0件だった。

## 11. 性能基準の決め方

Phase 05の基準場面はbuild ID `phase05-foundation-20261022` の仮区間、seed `20261022`、出撃後5秒以上とする。開発基準機の現行Chromeでは次を暫定予算とし、Phase 09で低性能対象端末を含めて再測定・確定する。

| 指標 | Phase 05暫定予算 | 2026-10-22 Chrome実測 |
| --- | --- | --- |
| 静的成果物 | 16 MiB以下 | Phase 07第3面音声追加後6,723,107 bytes、70 files |
| 初回encoded resource | 14 MiB以下 | 13,727,049 bytes、34 resources |
| localhost load event | 2,000ms以下 | 187ms |
| 通常戦闘fps | 55fps以上（目標60） | 119.7fps（120Hz環境、1.2秒ポーズ後） |
| 50ms超frame | 5秒窓で0 | 0 |
| 最大frame / simulation drop | 50ms以下 / 0ms | 16.7ms / 0.0ms |
| JS heap短期傾向 | 5秒窓で+8 MiB未満 | 10,125,724 → 7,655,265 bytes |
| 通信・実行時異常 | 外部origin、欠落、warning/error各0 | すべて0 |

Chromeは1568×1012 viewport、ローカルHTTP、cacheなしの新規originで計測した。ポーズ中はframe間隔とsample時間を加算せず、復帰後の最初のframeを新しい基準にする。localhost時間はネットワーク端末のロード保証ではない。5秒heapは短期の暴走検出に限り、5分以上のsoak、低性能端末、各製品ブラウザはPhase 09まで未確認である。

Phase 09の再現可能な低性能相当条件は、製品の1280×720 Canvas全体を各animation frameで4回描画し、固定時間更新と自動campaignを同時に継続する。5分soakの合格条件は30fps以上、simulation dropが計測時間の1%以下、単一frame 1秒以下、60秒warmup後のheap増加16 MiB以下、resource・DOM増加0、進行停止・QA failure・console warning/error・外部通信0とする。この負荷注入は開発機上の回帰条件であり、物理的な低性能端末の合格証拠には置き換えない。

Phase 10の物理低性能端末は、固定release candidateを通常の描画条件で5分以上連続実行し、平均60fps以上、simulation dropと進行時間差が各1%以下、最大frame 1秒以下、入力から次の表示反映まで100ms以下を要求する。60秒warmup後のheap増加は16 MiB以下、resource・DOM増加、console warning/error、外部originは0とする。端末機種、CPU、GPU、memoryとこれらの実測値を構造化して記録し、合格の真偽値だけでは受理しない。
