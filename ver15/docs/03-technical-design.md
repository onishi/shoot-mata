# 技術設計

静的 HTML、Canvas 2D、Web Audio、ES modules。依存パッケージなし。rules.mjs に状態遷移と出現データを置き、main.mjs が固定60 Hzで更新しながら入力、描画、発音を処理する。フォーカス喪失で入力を解除して一時停止。Chrome で静的 HTTP 配信を使う。配布検証はクリーンなファイル一覧、SHA-256、公開URLと過去版の疎通を記録する。
