// Auth helpers — PBKDF2 password hashing + JWT via Web Crypto API
// No external dependencies, runs natively on Cloudflare Workers

// ========== base64url helpers ==========

function b64urlEncodeStr(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecodeStr(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

function b64urlEncodeBuf(buf) {
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecodeBuf(str) {
  const raw = b64urlDecodeStr(str);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

// ========== Password hashing (PBKDF2, 100k iterations, SHA-256) ==========

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256
  );
  const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2:100000:${toHex(salt)}:${toHex(hash)}`;
}

export async function verifyPassword(password, stored) {
  const parts = stored.split(":");
  if (parts.length !== 4) return false;
  const [, iterStr, saltHex, hashHex] = parts;
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: parseInt(iterStr), hash: "SHA-256" }, key, 256
  );
  const computed = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return computed === hashHex;
}

// ========== JWT (HS256) via Web Crypto ==========

export async function signJWT(payload, secret) {
  const header = b64urlEncodeStr(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64urlEncodeStr(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 7 * 86400 })
  );
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${b64urlEncodeBuf(sig)}`;
}

export async function verifyJWT(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "HMAC", key, b64urlDecodeBuf(sig), new TextEncoder().encode(data)
  );
  if (!valid) return null;
  const payload = JSON.parse(b64urlDecodeStr(body));
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
  return payload;
}

// ========== Hono middleware ==========

export async function authenticate(c, next) {
  const header = c.req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return c.json({ error: "未提供认证令牌" }, 401);
  }
  const token = header.split(" ")[1];
  try {
    const decoded = await verifyJWT(token, c.env.JWT_SECRET);
    if (!decoded) return c.json({ error: "认证令牌无效或已过期" }, 401);

    const user = await c.env.DB.prepare(
      "SELECT id, username, email, role, avatar, bio FROM users WHERE id = ?"
    ).bind(decoded.userId).first();

    if (!user) return c.json({ error: "用户不存在" }, 401);
    c.set("user", user);
    await next();
  } catch {
    return c.json({ error: "认证令牌无效或已过期" }, 401);
  }
}

export function requireRole(...roles) {
  return async (c, next) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "请先登录" }, 401);
    if (!roles.includes(user.role)) {
      return c.json({ error: `权限不足，需要角色: ${roles.join(", ")}` }, 403);
    }
    await next();
  };
}
