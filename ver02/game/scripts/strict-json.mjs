function syntaxError(label, message, offset) {
  return new SyntaxError(`${label}: ${message} at offset ${offset}`);
}

export function parseJsonWithUniqueKeys(source, label = "JSON document") {
  if (typeof source !== "string") throw new TypeError(`${label}: source must be a string`);

  let offset = 0;
  const skipWhitespace = () => {
    while (/\s/.test(source[offset] ?? "")) offset += 1;
  };
  const parseString = () => {
    const start = offset;
    if (source[offset] !== '"') throw syntaxError(label, "expected string", offset);
    offset += 1;
    while (offset < source.length) {
      if (source[offset] === '"') {
        offset += 1;
        return JSON.parse(source.slice(start, offset));
      }
      if (source[offset] === "\\") offset += 1;
      offset += 1;
    }
    throw syntaxError(label, "unterminated string", start);
  };
  const parseScalar = () => {
    const start = offset;
    while (offset < source.length && !/[\s,}\]]/.test(source[offset])) offset += 1;
    if (start === offset) throw syntaxError(label, "expected value", offset);
    JSON.parse(source.slice(start, offset));
  };
  const parseValue = (path) => {
    skipWhitespace();
    if (source[offset] === "{") {
      parseObject(path);
    } else if (source[offset] === "[") {
      parseArray(path);
    } else if (source[offset] === '"') {
      parseString();
    } else {
      parseScalar();
    }
  };
  const parseObject = (path) => {
    const keys = new Set();
    offset += 1;
    skipWhitespace();
    if (source[offset] === "}") {
      offset += 1;
      return;
    }
    while (offset < source.length) {
      skipWhitespace();
      const keyOffset = offset;
      const key = parseString();
      if (keys.has(key)) {
        const location = path === "$" ? `$.${key}` : `${path}.${key}`;
        throw syntaxError(label, `duplicate key ${JSON.stringify(key)} at ${location}`, keyOffset);
      }
      keys.add(key);
      skipWhitespace();
      if (source[offset] !== ":") throw syntaxError(label, "expected colon", offset);
      offset += 1;
      parseValue(path === "$" ? `$.${key}` : `${path}.${key}`);
      skipWhitespace();
      if (source[offset] === "}") {
        offset += 1;
        return;
      }
      if (source[offset] !== ",") throw syntaxError(label, "expected comma or closing brace", offset);
      offset += 1;
    }
    throw syntaxError(label, "unterminated object", offset);
  };
  const parseArray = (path) => {
    offset += 1;
    skipWhitespace();
    if (source[offset] === "]") {
      offset += 1;
      return;
    }
    let index = 0;
    while (offset < source.length) {
      parseValue(`${path}[${index}]`);
      index += 1;
      skipWhitespace();
      if (source[offset] === "]") {
        offset += 1;
        return;
      }
      if (source[offset] !== ",") throw syntaxError(label, "expected comma or closing bracket", offset);
      offset += 1;
    }
    throw syntaxError(label, "unterminated array", offset);
  };

  parseValue("$");
  skipWhitespace();
  if (offset !== source.length) throw syntaxError(label, "unexpected trailing content", offset);
  return JSON.parse(source);
}
