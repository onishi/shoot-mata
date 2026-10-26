import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const gameRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = process.argv.includes("--dist") ? path.join(gameRoot, "dist") : gameRoot;
const requestedPort = Number(process.env.PORT || 4173);
const types = new Map([[".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"], [".mjs", "text/javascript; charset=utf-8"], [".js", "text/javascript; charset=utf-8"], [".webp", "image/webp"]]);

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(`${root}${path.sep}`) || !(await stat(filename)).isFile()) throw new Error("not found");
    response.writeHead(200, { "content-type": types.get(path.extname(filename)) || "application/octet-stream", "cache-control": "no-store" });
    createReadStream(filename).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(requestedPort, "127.0.0.1", () => {
  const address = server.address();
  console.log(`Serving ${root} at http://127.0.0.1:${address.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
