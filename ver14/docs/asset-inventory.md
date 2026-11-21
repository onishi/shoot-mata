# Asset inventory

| 種別 | 用途 | 制作方法・権利 | 現在状態 | 確認先 |
| --- | --- | --- | --- | --- |
| 背景 | 夕港、街路、地下放水路、倒壊コンテナ港、高潮防壁、巨大船外殻・船内排水路 | 新規Canvas描画、プロジェクト所有 | 5区間に加え、ボスの正面外殻、左右船腹レーン、閉鎖天井と水位線をM3実装 | `m2-harbor-wake-idle`, `m3-street-street-bend`, `m3-underflow-underflow-dive`, `m3-convoy-convoy-low`, `m3-boss-chain-boss-anchor/hull/drain` |
| 主役 | 赤白の救難艇 | 新規Canvas描画、プロジェクト所有 | M2固有シルエット・ロール実装 | プレイ画面手前、`m2-wake-idle` |
| 対象 | 漂流者、分岐救助標識、流木、上下障害、救助フェリー、救助桟橋、潮位別航路門、崩落コンテナ、防壁門、アンカー、船腹装甲、排水ファン、洪水コア | 新規Canvas描画、プロジェクト所有 | M3で全区間対象とボス4種を実装 | `m2-harbor-survivor-gesture`, `m3-street-street-choice`, `m3-underflow-underflow-surface`, `m3-convoy-chain-convoy-load/route`, `m3-boss-chain-boss-*` |
| UI | 船体、救助、得点、サージ、深度計、フェリー耐久・積載・隊形回復、潮位・航路履歴、高潮圧、門進捗、ボス段階進捗 | 新規Canvas描画、プロジェクト所有 | 防壁12門とボスのアンカー・装甲・排水・コア状態までM3実装 | 全プレイ画面、`m3-boss-chain-boss-*` |
| エフェクト | 速度連動飛沫、サージ環、救助引上げ、破砕、被害 | 新規手続き描画、プロジェクト所有 | 航跡・救助・流木二分はM2更新、被害はM1暫定 | `m2-harbor-driftwood-break`, `m2-rescue-route` |
| 音楽 | 5区間の短い音列 | 新規Web Audio合成、プロジェクト所有 | M3暫定 | プレイ中 |
| 効果音 | サージ、救助、被害 | 新規Web Audio合成、プロジェクト所有 | M1暫定 | 各イベント |
| 環境音 | 速度・サージ・区間・深度連動のエンジンと水音 | 新規Web Audio合成、プロジェクト所有 | M3で潜水時の低音化・水音増幅まで実装 | `m2-browser-audit.json`, `m3-underflow-browser-audit.json` |

外部素材は使用していない。M3では区間ごとに空間、目的、攻略と完成造形を同時に更新し、暫定Canvas図形や色替えのまま固有区間へ数えない。
