CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  duration REAL NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_videos_name ON videos(name);
CREATE INDEX idx_videos_created_at ON videos(created_at);
