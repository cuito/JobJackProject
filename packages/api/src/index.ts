import express from "express";
import cors from "cors";
import { opendir, lstat } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT ?? 3000);

/* ---------- helpers (functional) ---------- */

const toRWX = (mode: number) =>
  ["USR", "GRP", "OTH"]
    .map((_, i) => {
      const shift = 6 - i * 3;
      const triad = (mode >> shift) & 0b111;
      return `${triad & 4 ? "r" : "-"}${triad & 2 ? "w" : "-"}${triad & 1 ? "x" : "-"}`;
    })
    .join("");

const toOctal = (mode: number) => (mode & 0o777).toString(8).padStart(3, "0");

async function* toNdjson(src: AsyncIterable<unknown>) {
  for await (const obj of src) {
    yield JSON.stringify(obj) + "\n";
  }
}

/** Map a user-supplied absolute host path to container path under /host.
 * - Windows:  "C:\\Foo\\Bar" -> "/host/c/Foo/Bar"
 * - Unix:     "/var/log"     -> "/host/var/log"   (only if you also mount "/" -> "/host")
 * Guards against escaping /host.
 */
const mapHostPathToContainer = (userPath: string) => {
  if (!userPath || typeof userPath !== "string") {
    throw Object.assign(new Error("Missing path"), { status: 400 });
  }

  const trimmed = userPath.trim();
  const isWindowsAbs = /^[a-zA-Z]:[\\/]/.test(trimmed);

  const containerPath = isWindowsAbs
    ? (() => {
        const drive = trimmed[0].toLowerCase();            // "c"
        const rest = trimmed.slice(2).replace(/\\/g, "/");  // drop "C:" and normalize slashes
        return path.posix.normalize(`/host/${drive}/${rest}`);
      })()
    : path.posix.normalize(`/host${trimmed}`);             // unix absolute (requires "/" -> "/host" mount)

  if (!(containerPath === "/host" || containerPath.startsWith("/host/"))) {
    throw Object.assign(new Error("Path resolution error"), { status: 400 });
  }
  return containerPath;
};

// reverse: container path -> host-looking string for response
const fromContainerToHostPath = (p: string) => {
  if (p === "/host") return "/";
  const segs = p.replace(/^\/+/, "").split("/");
  if (segs[0] !== "host") return p;

  if (segs[1]?.length === 1 && /^[a-z]$/.test(segs[1])) {
    const drive = segs[1].toUpperCase();
    const rest = segs.slice(2).join("\\");
    return rest ? `${drive}:\\${rest}` : `${drive}:\\`;
  }
  return `/${segs.slice(1).join("/")}`;
};

// async generator over entries (stream-friendly)
async function* iterDirEntries(dirFullPath: string) {
  const dir = await opendir(dirFullPath);
  for await (const ent of dir) {
    const full = path.posix.join(dirFullPath, ent.name);
    const s = await lstat(full);

    const kind = ent.isDirectory() ? "dir" : ent.isFile() ? "file" : "other";
    const ext = ent.isFile() ? path.extname(ent.name) : "";

    yield {
      name: ent.name,
      hostPath: fromContainerToHostPath(full),
      kind,
      ext,
      size: ent.isFile() ? s.size : null,
      createdAt: s.birthtime?.toISOString?.() ?? new Date().toISOString(),
      mode: toOctal(s.mode),
      perms: toRWX(s.mode),
      isSymlink: s.isSymbolicLink(),
      isHidden: ent.name.startsWith("."),
    };
  }
}

// NDJSON stream helper
const streamNdjson = (res: express.Response, src: AsyncIterable<unknown>) =>
  pipeline(Readable.from(toNdjson(src)), res);

/* ---------- routes ---------- */

app.get("/api/hello", (_req, res) => res.json({ message: "Hello from JobJack API!" }));

// GET /api/dir?path=<ABSOLUTE_HOST_PATH>&format=ndjson|json&limit=100
app.get("/api/dir", async (req, res) => {
  try {
    const userPath = String(req.query.path ?? "");
    const format = String(req.query.format ?? "ndjson").toLowerCase();
    const limit = Number(req.query.limit ?? 0);

    const target = mapHostPathToContainer(userPath);

    if (format === "json") {
      const items: any[] = [];
      for await (const e of iterDirEntries(target)) {
        items.push(e);
        if (limit > 0 && items.length >= limit) break;
      }
      res.json({ path: userPath, count: items.length, entries: items });
      return;
    }

    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const limited = async function* () {
      let n = 0;
      for await (const e of iterDirEntries(target)) {
        yield e;
        if (limit > 0 && ++n >= limit) break;
      }
    };

    await streamNdjson(res, limited());
  } catch (err: any) {
    res.status(err?.status ?? 500).json({ error: err?.message ?? "Unexpected error" });
  }
});

/* ---------- listen ---------- */

app.listen(PORT, () => console.log(`[api] running at http://localhost:${PORT}`));
