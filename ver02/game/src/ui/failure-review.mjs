const CORE_LABELS = Object.freeze({
  red: "赤I",
  blue: "青+",
  yellow: "黄◎",
});

const REASON_DETAILS = Object.freeze({
  "enemy-shot": Object.freeze({
    cause: "敵弾に被弾",
    advice: "敵の射線から上下へ早めに外れ、混色するなら青コアの無敵補助を残してください。",
  }),
  "enemy-collision": Object.freeze({
    cause: "敵機と接触",
    advice: "画面左側に退避幅を残し、接近する敵を広射線か追尾弾で先に処理してください。",
  }),
  "closing-corridor": Object.freeze({
    cause: "圧縮回廊の外縁に接触",
    advice: "回廊の中央帯へ先に移動し、正面の敵は貫通弾で短時間に処理してください。",
  }),
  "shutter-cover": Object.freeze({
    cause: "開閉遮蔽の閉鎖域に接触",
    advice: "開口が上下どちらにあるかを見てから移動し、遮蔽越しには追尾弾を使ってください。",
  }),
  "charged-cloud": Object.freeze({
    cause: "帯電雲の危険側に滞在",
    advice: "帯電側が切り替わる前に反対半面へ移動し、直射に固執せず回避を優先してください。",
  }),
  "reactive-tissue": Object.freeze({
    cause: "生体門の閉鎖部に接触",
    advice: "射撃で組織を開いてから中央帯を通過してください。",
  }),
  "contracting-tissue": Object.freeze({
    cause: "収縮通路の外縁に接触",
    advice: "収縮周期を見て中央へ寄り、追尾弾で移動中も攻撃を維持してください。",
  }),
  "periodic-heatwave": Object.freeze({
    cause: "周期熱波の退避域外に滞在",
    advice: "熱波予告に合わせて上下の退避域へ移動し、退避中は広射線か追尾弾を使ってください。",
  }),
  "destruction-safe-zone": Object.freeze({
    cause: "可変安全圏の外に滞在",
    advice: "敵撃破で安全圏が変わるため、撃破直後は攻撃より新しい安全圏への移動を優先してください。",
  }),
  "boss-timeout": Object.freeze({
    cause: "ボス制限時間を超過",
    advice: "ボス正面へ軸を合わせて赤コアの貫通火力を育て、危険時だけ補助構成へ交換してください。",
  }),
});

function requireFailure(snapshot) {
  const failure = snapshot?.failure;
  if (!failure || typeof failure.reason !== "string") {
    throw new TypeError("a failure snapshot is required");
  }
  if (!Array.isArray(failure.coreQueueBefore)
    || failure.coreQueueBefore.some((core) => !CORE_LABELS[core])) {
    throw new TypeError("failure coreQueueBefore is invalid");
  }
  return failure;
}

export function createFailureReview(snapshot) {
  const failure = requireFailure(snapshot);
  const detail = REASON_DETAILS[failure.reason] ?? {
    cause: "原因不明の被弾",
    advice: "直前の危険表示とコア構成を確認し、回避を優先して再挑戦してください。",
  };
  const coreQueue = failure.coreQueueBefore.length === 0
    ? "なし（無武装）"
    : failure.coreQueueBefore.map((core) => CORE_LABELS[core]).join(" → ");
  const loss = failure.lostCore === null
    ? (failure.livesAfter < failure.livesBefore ? `残機 ${failure.livesBefore} → ${failure.livesAfter}` : "コア・残機の喪失なし")
    : `${CORE_LABELS[failure.lostCore]}コアを喪失`;
  return Object.freeze({
    reason: failure.reason,
    cause: detail.cause,
    tick: failure.tick,
    coreQueue,
    loss,
    advice: detail.advice,
  });
}
