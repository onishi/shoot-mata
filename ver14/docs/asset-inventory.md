# Asset inventory

| 種別 | 用途 | 制作方法・権利 | 現在状態 | 確認先 |
| --- | --- | --- | --- | --- |
| 背景 | 夕港、街路、地下放水路、倒壊コンテナ港、高潮防壁、巨大船外殻・船内排水路 | 新規Canvas描画、プロジェクト所有 | 5区間に加え、ボスの正面外殻、左右船腹レーン、閉鎖天井と水位線をM3実装 | `m2-harbor-wake-idle`, `m3-street-street-bend`, `m3-underflow-underflow-dive`, `m3-convoy-convoy-low`, `m3-boss-chain-boss-anchor/hull/drain` |
| 主役 | 赤白の救難艇 | 新規Canvas描画、プロジェクト所有 | M2固有シルエット・ロール実装 | プレイ画面手前、`m2-wake-idle` |
| 対象 | 漂流者、分岐救助標識、流木、上下障害、救助フェリー、救助桟橋、潮位別航路門、崩落コンテナ、防壁門、アンカー、船腹装甲、排水ファン、洪水コア | 新規Canvas描画、プロジェクト所有 | M3で全区間対象とボス4種を実装 | `m2-harbor-survivor-gesture`, `m3-street-street-choice`, `m3-underflow-underflow-surface`, `m3-convoy-chain-convoy-load/route`, `m3-boss-chain-boss-*` |
| UI | 船体、救助、得点、サージ、深度計、フェリー耐久・積載・隊形回復、潮位・航路履歴、高潮圧、門進捗、ボス段階進捗 | 新規Canvas描画、プロジェクト所有 | 防壁12門とボスのアンカー・装甲・排水・コア状態までM3実装 | 全プレイ画面、`m3-boss-chain-boss-*` |
| エフェクト | 速度連動飛沫、サージ環、救助引上げ、破砕、被害、巨大船外殻破断・洪水圧解放・沈降・2艇脱出 | 新規手続き描画、プロジェクト所有 | 航跡・救助・流木二分はM2、最終決着4段階はM4更新 | `m2-harbor-driftwood-break`, `m2-rescue-route`, `m4-collapse-final-boss-*` |
| 音楽 | 5区間とボスの固有拍・音色・低音ドローン・転換ジングル | 新規Web Audio合成、プロジェクト所有 | M4でテンポ、拍パターン、波形、低音を6空間へ分離 | `m4-audio-browser-audit.json`の6 `audioSamples` |
| 効果音 | サージ、救助、被害、コア破砕、圧力解放、沈降、脱出 | 新規Web Audio合成、プロジェクト所有 | 基本操作はM1、決着4段階はM4実装 | 各イベント、`m4-collapse-final-browser-audit.json` |
| 環境音 | 速度・サージ・区間・深度連動のエンジン、水音、空間ドローン | 新規Web Audio合成、プロジェクト所有 | M4で6空間の水音帯域・Q・低音周波数を分離 | `m4-audio-browser-audit.json` |

外部素材は使用していない。M3では区間ごとに空間、目的、攻略と完成造形を同時に更新し、暫定Canvas図形や色替えのまま固有区間へ数えない。
