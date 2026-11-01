# M4-02 SETTINGS evidence

- TITLEの`S`とPAUSEの`S`から同じSETTINGSへ入り、`Escape` / `Backspace`で呼出元へ戻る。
- BGM、SEは0〜100を5刻みで変更し、BGMはmusic / environment、SEはse / ui busへ知覚カーブを通して即時反映する。
- 画面揺れは被弾直後の局所揺れを無効化でき、点滅軽減はCOLLATE候補輪郭の周期輝度変化を固定表示へ変える。
- ECHOは航跡寿命を3.2秒から4.0秒、被弾無敵を1.1秒から1.6秒へ延長する。PROOFは予告と弾速を維持し、通常敵の初回攻撃間隔を18%短縮する。NORMALは既存規則を維持する。
- 設定は`palimpsest-wake:v4.0:settings`へキャンペーン保存と独立して記録する。一時キーの読戻し検証後に確定し、破損JSON、0〜100範囲外、未知難易度を拒否する。
- 保存拒否時も変更値をメモリへ適用し、SETTINGS内にセッション限定の警告を表示する。
- `m4-02-settings.png`を1280×720で目視し、5項目、選択行、値、操作案内に文字切れ・重なりがないことを確認した。
- `m4-02-settings-unavailable.png`を1280×720で目視し、保存不能警告と選択値が同時に読めることを確認した。
- 単体65件、自動計測12件、素材監査50 final・仮素材0、音量監査59素材、型検査、production buildに合格した。Chrome E2Eは19件に合格した。
