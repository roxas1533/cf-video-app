export type VideoMeta = {
  name: string;
  duration: number;
  size: number;
};

export type Video = { id: string; createdAt: number } & VideoMeta;

export async function getVideoList(db: D1Database): Promise<Video[]> {
  const { results } = await db
    .prepare(
      "SELECT id, name, duration, size, created_at FROM videos ORDER BY name COLLATE NOCASE ASC",
    )
    .all<{
      id: string;
      name: string;
      duration: number;
      size: number;
      created_at: number;
    }>();
  return results.map((r) => ({
    id: r.id,
    name: r.name,
    duration: r.duration,
    size: r.size,
    createdAt: r.created_at,
  }));
}

export async function getVideoById(
  db: D1Database,
  id: string,
): Promise<VideoMeta | null> {
  const row = await db
    .prepare("SELECT name, duration, size FROM videos WHERE id = ?")
    .bind(id)
    .first<{ name: string; duration: number; size: number }>();
  return row ?? null;
}

export async function getVideoByName(
  db: D1Database,
  name: string,
): Promise<{ id: string } | null> {
  return db
    .prepare("SELECT id FROM videos WHERE name = ?")
    .bind(name)
    .first<{ id: string }>();
}

export async function insertVideo(
  db: D1Database,
  video: { id: string; name: string; duration: number; size: number },
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO videos (id, name, duration, size) VALUES (?, ?, ?, ?)",
    )
    .bind(video.id, video.name, video.duration, video.size)
    .run();
}

export async function renameVideo(
  db: D1Database,
  id: string,
  name: string,
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "duplicate" }> {
  const existing = await getVideoByName(db, name);
  if (existing && existing.id !== id) return { ok: false, reason: "duplicate" };
  const res = await db
    .prepare("UPDATE videos SET name = ? WHERE id = ?")
    .bind(name, id)
    .run();
  if (!res.meta.changes) return { ok: false, reason: "not_found" };
  return { ok: true };
}

export async function deleteVideo(
  db: D1Database,
  id: string,
): Promise<boolean> {
  const res = await db
    .prepare("DELETE FROM videos WHERE id = ?")
    .bind(id)
    .run();
  return res.meta.changes > 0;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
