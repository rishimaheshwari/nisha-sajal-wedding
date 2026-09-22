import http from "node:http";
import { readFile, mkdir, appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";
const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 5173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/api/rsvp" && req.method === "POST") {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 16384) {
            res.writeHead(413);
            res.end();
            return;
          }
        }
        let data;
        try {
          data = JSON.parse(body);
        } catch {
          res.writeHead(400);
          res.end();
          return;
        }
        if (
          !data ||
          typeof data.name !== "string" ||
          !data.name.trim() ||
          data.name.length > 200 ||
          !["Yes", "No"].includes(data.attending) ||
          !Number.isInteger(data.plusOnes) ||
          data.plusOnes < 0 ||
          data.plusOnes > 99 ||
          ["song"].some(
            (k) =>
              data[k] !== undefined &&
              (typeof data[k] !== "string" || data[k].length > 2000),
          )
        ) {
          res.writeHead(400);
          res.end("Invalid response");
          return;
        }
        const record = {
          id: randomUUID(),
          createdAt: new Date().toISOString(),
          name: data.name.trim(),
          attending: data.attending,
          plusOnes: data.attending === "Yes" ? data.plusOnes : 0,
          totalGuests: data.attending === "Yes" ? data.plusOnes + 1 : 0,
          song: data.song || "",
        };
        await mkdir(path.join(root, "data"), { recursive: true });
        await appendFile(
          path.join(root, "data/rsvps.jsonl"),
          JSON.stringify(record) + "\n",
        );
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405);
        res.end();
        return;
      }
      const requested =
        decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
      if (
        ![
          "index.html",
          "styles.css",
          "enhancements.css",
          "app.js",
          "event-audio.js",
          "config.js",
          "translations.json",
        ].includes(requested) &&
        !/^assets\/[\w.-]+$/.test(requested)
      ) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const data = await readFile(path.join(root, requested));
      const headers = {
        "Content-Type":
          mime[path.extname(requested)] || "application/octet-stream",
        "Accept-Ranges": "bytes",
      };
      const match = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      if (match) {
        const start = Number(match[1]),
          end = match[2]
            ? Math.min(Number(match[2]), data.length - 1)
            : data.length - 1;
        if (start > end || start >= data.length) {
          res.writeHead(416, { "Content-Range": `bytes */${data.length}` });
          res.end();
          return;
        }
        res.writeHead(206, {
          ...headers,
          "Content-Range": `bytes ${start}-${end}/${data.length}`,
          "Content-Length": end - start + 1,
        });
        res.end(
          req.method === "HEAD" ? undefined : data.subarray(start, end + 1),
        );
        return;
      }
      res.writeHead(200, { ...headers, "Content-Length": data.length });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500);
      res.end("Unable to complete request");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Wedding app: http://localhost:${port}`),
  );
