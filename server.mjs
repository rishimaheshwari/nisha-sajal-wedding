import http from "node:http";
import { readFile, mkdir, appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { webcrypto } from "node:crypto";
import { validateRsvp, rsvpCounts, createRequestKey } from "./rsvp-model.mjs";
const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 5173);
let storedReplies;
let saveQueue = Promise.resolve();
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
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
          if (body.length > 131072) {
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
        let reply;
        try {
          reply = validateRsvp(data);
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.submissionId)) throw new Error("Invalid ID");
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "Invalid RSVP" }));
          return;
        }
        const payloadKey = await createRequestKey(reply, webcrypto.subtle);
        // Load saved IDs once and serialize writes to make retries idempotent.
        const save = async () => {
          if (!storedReplies) {
            let saved = "";
            try { saved = await readFile(path.join(root, "data/rsvps.jsonl"), "utf8"); }
            catch (error) { if (error.code !== "ENOENT") throw error; }
            storedReplies = new Map(saved.split("\n").filter(Boolean).map((line) => {
              const record = JSON.parse(line); return [record.id, record.payloadKey];
            }));
          }
          if (storedReplies.has(data.submissionId)) {
            if (storedReplies.get(data.submissionId) !== payloadKey) throw new Error("Conflicting reply");
            return;
          }
          const record = { id: data.submissionId, createdAt: new Date().toISOString(), payloadKey, ...reply, ...rsvpCounts(reply.guests) };
          await mkdir(path.join(root, "data"), { recursive: true });
          await appendFile(path.join(root, "data/rsvps.jsonl"), JSON.stringify(record) + "\n");
          storedReplies.set(data.submissionId, payloadKey);
        };
        const result = saveQueue.then(save);
        saveQueue = result.catch(() => {});
        await result;
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, submission_id: data.submissionId }));
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
          "music-samples.html",
          "styles.css",
          "enhancements.css",
          "app.js",
          "event-audio.js",
          "rsvp-identity.mjs",
          "rsvp-model.mjs",
          "rsvp.js",
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
