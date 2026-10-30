export function overlapsCircleRect(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

export function overlapsRect(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index];
    const b = polygon[previous];
    const crosses = (a.y > point.y) !== (b.y > point.y)
      && point.x < (b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || Number.EPSILON) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function distanceToSegmentSquared(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = dx * dx + dy * dy;
  const amount = length ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length)) : 0;
  const x = start.x + amount * dx;
  const y = start.y + amount * dy;
  return (point.x - x) ** 2 + (point.y - y) ** 2;
}

export function overlapsCirclePolygon(circle, polygon) {
  if (!polygon?.length) return false;
  if (pointInPolygon(circle, polygon)) return true;
  const radiusSquared = circle.radius * circle.radius;
  return polygon.some((point, index) => distanceToSegmentSquared(circle, point, polygon[(index + 1) % polygon.length]) < radiusSquared);
}

function orientation(a, b, c) {
  return Math.sign((b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y));
}

function segmentsIntersect(a, b, c, d) {
  return orientation(a, b, c) !== orientation(a, b, d) && orientation(c, d, a) !== orientation(c, d, b);
}

export function overlapsRectPolygon(rect, polygon) {
  if (!polygon?.length) return false;
  const corners = [
    { x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height }, { x: rect.x, y: rect.y + rect.height }
  ];
  if (corners.some((point) => pointInPolygon(point, polygon))) return true;
  if (polygon.some(({ x, y }) => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height)) return true;
  return polygon.some((point, index) => corners.some((corner, cornerIndex) => segmentsIntersect(
    point, polygon[(index + 1) % polygon.length], corner, corners[(cornerIndex + 1) % corners.length]
  )));
}
