-- D1 (SQLite) schema — novel platform
-- camelCase column names to match frontend expectations

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER',
  avatar TEXT,
  bio TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS novels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  coverUrl TEXT,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'ONGOING',
  reviewStatus TEXT DEFAULT 'PENDING',
  authorId INTEGER NOT NULL,
  publishedAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  novelId INTEGER NOT NULL,
  serialNumber INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  publishedAt TEXT DEFAULT (datetime('now')),
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (novelId) REFERENCES novels(id) ON DELETE CASCADE,
  UNIQUE(novelId, serialNumber)
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  userId INTEGER NOT NULL,
  novelId INTEGER NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (novelId) REFERENCES novels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  novelId INTEGER NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (novelId) REFERENCES novels(id) ON DELETE CASCADE,
  UNIQUE(userId, novelId)
);

CREATE TABLE IF NOT EXISTS author_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  status TEXT DEFAULT 'PENDING',
  reason TEXT NOT NULL,
  reviewNote TEXT,
  reviewedById INTEGER,
  reviewedAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewedById) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_novels_authorId ON novels(authorId);
CREATE INDEX IF NOT EXISTS idx_novels_category ON novels(category);
CREATE INDEX IF NOT EXISTS idx_novels_reviewStatus ON novels(reviewStatus);
CREATE INDEX IF NOT EXISTS idx_chapters_novelId ON chapters(novelId);
CREATE INDEX IF NOT EXISTS idx_comments_novelId ON comments(novelId);
CREATE INDEX IF NOT EXISTS idx_comments_userId ON comments(userId);
CREATE INDEX IF NOT EXISTS idx_favorites_userId ON favorites(userId);
CREATE INDEX IF NOT EXISTS idx_applications_userId ON author_applications(userId);
CREATE INDEX IF NOT EXISTS idx_applications_status ON author_applications(status);
