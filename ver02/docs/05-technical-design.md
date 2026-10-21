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

## 9. 描画と画面

内部ゲーム座標は16:9で固定し、CanvasをCSSで利用可能領域へcontainする。縦長ではCanvas下に44 CSS px以上の操作領域を置き、HUDの重要情報はCanvas内とアクセシブルなDOM表示モデルを同じ状態から描く。高コントラストと動き軽減は表示アダプターの設定として全画面へ適用する。

## 10. ビルドと配信

ES moduleを基準とし、導入する依存はロックファイル、権利、脆弱性、配信容量への影響を記録する。出力は相対URLで動く静的ファイルとし、実行時外部通信を必要としない。build IDと権利通知を成果物から確認可能にする。

## 11. 性能基準の決め方

Phase 05で固定場面、対象端末、ブラウザ、計測時間を確定する。通常戦闘は60fpsを目標とし、継続的なcatch-up上限到達、入力処理の長時間停止、時間経過によるメモリ増加を不合格にする。最終の数値予算は仮区間の実測後に本書へ追記する。
