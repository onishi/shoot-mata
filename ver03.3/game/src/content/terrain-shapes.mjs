function hash(text) {
  let value = 17;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) % 997;
  return value;
}

function ridge(width, height, seed, ceiling, stageNumber) {
  const steps = 5 + stageNumber % 3;
  const points = [];
  for (let index = 0; index <= steps; index += 1) {
    const x = width * index / steps;
    const wave = (Math.sin(seed * 0.17 + index * (1.1 + stageNumber * 0.08)) + 1) / 2;
    const notch = index > 0 && index < steps && (index + seed) % 3 === 0 ? 24 + stageNumber * 3 : 0;
    const depth = Math.min(height * 0.42, 22 + wave * (34 + stageNumber * 4) + notch);
    points.push({ x, y: ceiling ? height - depth : depth });
  }
  return points;
}

export function terrainPolygon(stageId, item) {
  const width = item.width;
  const height = item.height;
  const stageNumber = Number(stageId.at(-1));
  const seed = hash(`${stageId}:${item.id}`);
  if (item.y <= 1) {
    const edge = ridge(width, height, seed, true, stageNumber).reverse();
    return [{ x: 0, y: 0 }, { x: width, y: 0 }, ...edge];
  }
  if (item.y + item.height >= 719) {
    const edge = ridge(width, height, seed, false, stageNumber);
    return [{ x: 0, y: height }, { x: 0, y: edge[0].y }, ...edge.slice(1), { x: width, y: height }];
  }
  const cut = Math.min(46, width * 0.2, height * 0.2);
  const skew = (seed % 19) - 9;
  return [
    { x: cut, y: 0 }, { x: width - cut + skew, y: 0 }, { x: width, y: cut },
    { x: width - cut / 2, y: height * 0.58 }, { x: width, y: height - cut },
    { x: width - cut, y: height }, { x: cut - skew, y: height }, { x: 0, y: height - cut },
    { x: cut / 2, y: height * 0.42 }, { x: 0, y: cut }
  ];
}

export function withTerrainPolygon(stageId, item) {
  const localPoints = terrainPolygon(stageId, item);
  return {
    ...item,
    localPoints,
    points: localPoints.map(({ x, y }) => ({ x: item.screenX + x, y: item.y + y }))
  };
}
