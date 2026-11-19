// Serves the trophy guide's app/ folder over HTTP for local testing.
// Node 22, standard library only. Run `node serve.ts` (or
// `node serve.ts --port <n>`) and open http://localhost:8080.
// It only serves files inside app/, sends the right MIME types, and does
// nothing else — a dev convenience, not a production server.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = resolve(fileURLToPath(new URL("./app", import.meta.url)));

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".woff2", "font/woff2"],
  [".webmanifest", "application/manifest+json"],
]);

function mimeTypeFor(file: string): string {
  return MIME_TYPES.get(extname(file).toLowerCase()) ?? "application/octet-stream";
}

function replyText(res: ServerResponse, code: number, body: string): void {
  res.writeHead(code).end(body);
}

function pickPort(argv: string[]): number {
  const at = argv.indexOf("--port");
  const wanted = at === -1 ? 8080 : Number(argv[at + 1]);
  if (Number.isInteger(wanted) && wanted > 0 && wanted < 65536) return wanted;
  return 8080;
}

function resolveTarget(rawPath: string): string | null {
  let path = rawPath;
  if (path.endsWith("/")) path += "index.html";
  const file = resolve(join(APP_ROOT, normalize(path)));
  if (file !== APP_ROOT && !file.startsWith(APP_ROOT + sep)) return null;
  return file;
}

function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
  } catch {
    replyText(res, 400, "bad request");
    return;
  }
  const file = resolveTarget(pathname);
  if (file === null) {
    replyText(res, 403, "forbidden");
    return;
  }
  let size: number;
  try {
    const info = statSync(file);
    if (!info.isFile()) throw new Error("not a file");
    size = info.size;
  } catch {
    replyText(res, 404, "not found");
    return;
  }
  res.writeHead(200, {
    "content-type": mimeTypeFor(file),
    "content-length": size,
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(res);
}

const port = pickPort(process.argv.slice(2));
createServer(handleRequest).listen(port, "127.0.0.1", () => {
  console.log(`app/ is on http://localhost:${port}`);
});
