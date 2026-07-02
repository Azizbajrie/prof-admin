/**
 * Prof Admin — Repliz sync service
 * -----------------------------------------------------------------
 * Backend kecil yang jadi jembatan antara Repliz API dan dashboard.
 * Tugasnya dua:
 *  1. Polling Repliz secara berkala (comment + chat) lalu simpan/update
 *     ke penyimpanan kita sendiri, dan broadcast ke dashboard via WebSocket.
 *  2. Menyediakan endpoint buat dashboard: ambil inbox gabungan,
 *     kirim balasan, dan assign percakapan ke admin.
 *
 * Catatan penting:
 *  - Repliz TIDAK punya webhook, jadi "real-time" di sini adalah
 *    polling interval pendek, bukan push asli.
 *  - Chat API (DM) butuh tier akun Gold+. Kalau akun Repliz lu di
 *    bawah itu, bagian chat akan selalu kosong / error 401-ish.
 *  - Assignment admin BUKAN fitur Repliz — itu kita simpan sendiri
 *    di in-memory store ini (gampang diganti ke Postgres nanti).
 *
 * Jalankan:
 *   npm init -y
 *   npm install express axios socket.io cors dotenv
 *   REPLIZ_ACCESS_KEY=xxx REPLIZ_SECRET_KEY=yyy node repliz-sync-service.js
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");

const ACCESS_KEY = process.env.REPLIZ_ACCESS_KEY || "YOUR_ACCESS_KEY";
const SECRET_KEY = process.env.REPLIZ_SECRET_KEY || "YOUR_SECRET_KEY";
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 20000);
const PORT = process.env.PORT || 4000;

// ---------------------------------------------------------------------------
// Repliz API client
// ---------------------------------------------------------------------------

const repliz = axios.create({
  baseURL: "https://api.repliz.com",
  auth: { username: ACCESS_KEY, password: SECRET_KEY },
});

// Retry with backoff on 429 (rate limit), per Repliz docs guidance.
async function replizRequest(config, attempt = 1) {
  try {
    const res = await repliz.request(config);
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    if (status === 429 && attempt <= 4) {
      const wait = attempt * 2000;
      console.warn(`Rate limited by Repliz, retrying in ${wait}ms (attempt ${attempt})`);
      await new Promise((r) => setTimeout(r, wait));
      return replizRequest(config, attempt + 1);
    }
    throw err;
  }
}

const getAccounts = () => replizRequest({ method: "GET", url: "/public/account", params: { page: 1, limit: 100 } });

const getComments = (params) => replizRequest({ method: "GET", url: "/public/comment", params: { page: 1, limit: 50, status: "pending", ...params } });

// Loops through every page of pending comments/chats instead of only page 1 —
// otherwise anything beyond the first `limit` items never gets synced once
// the pending count grows past that.
async function getAllPages(fetchPageFn, maxPages = 10) {
  let page = 1;
  let all = [];
  while (page <= maxPages) {
    const res = await fetchPageFn(page);
    all = all.concat(res.docs || []);
    if (!res.hasNextPage) break;
    page += 1;
  }
  return all;
}

const replyComment = (commentId, text) => replizRequest({ method: "POST", url: `/public/comment/${commentId}`, data: { text } });

const updateCommentStatus = (commentId, status) => replizRequest({ method: "PATCH", url: `/public/comment/${commentId}/status`, data: { status } });

// Chat (DM) — requires Gold+ tier
const getChats = (params) => replizRequest({ method: "GET", url: "/public/chat", params: { page: 1, limit: 50, ...params } });

const getChatMessages = (chatId) => replizRequest({ method: "GET", url: `/public/chat/${chatId}/message`, params: { page: 1, limit: 50 } });

const sendChatMessage = (chatId, text) => replizRequest({ method: "POST", url: `/public/chat/${chatId}/message`, data: { type: "text", text } });

// Content statistic — the ONLY place Repliz exposes real like/share counts (Gold+).
// GET /public/comment only returns statistic.comment, no like/share — this fills the gap.
const statsCache = new Map(); // key: `${contentId}:${accountId}` -> { data, fetchedAt }
const STATS_TTL_MS = 5 * 60 * 1000;

async function getContentStatistic(contentId, accountId) {
  const key = `${contentId}:${accountId}`;
  const cached = statsCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < STATS_TTL_MS) return cached.data;

  try {
    const data = await replizRequest({ method: "GET", url: `/public/content/${contentId}/statistic`, params: { accountId } });
    statsCache.set(key, { data, fetchedAt: Date.now() });
    return data;
  } catch (err) {
    // Some platforms/content types don't expose stats (404) — treat as zeros instead of failing the poll.
    const fallback = { like: 0, comment: 0, share: 0 };
    statsCache.set(key, { data: fallback, fetchedAt: Date.now() });
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// In-memory store (swap this for Postgres when going to production)
// ---------------------------------------------------------------------------

const store = {
  conversations: new Map(), // key: `${type}:${replizId}` -> normalized conversation
  assignments: new Map(),   // key: same -> admin name
  admins: ["Aziz", "Nadia", "Dimas"], // shared roster, persists across refreshes/browsers
};

function upsertConversation(conv) {
  const existing = store.conversations.get(conv.id);
  const merged = { ...existing, ...conv, assignedTo: store.assignments.get(conv.id) || existing?.assignedTo || null };
  store.conversations.set(conv.id, merged);
  return merged;
}

// Map a Repliz comment doc -> our dashboard's conversation shape.
// likes/shares start at 0 here and get filled in by enrichWithStatistics() below.
function normalizeComment(doc) {
  return {
    id: `comment:${doc._id}`,
    replizId: doc._id,
    kind: "comment",
    type: "comment",
    account: doc.account?.username || doc.account?.name,
    accountId: doc.account?._id || doc.accountId,
    platform: doc.account?.type, // instagram | threads | facebook | tiktok | youtube | linkedin
    contact: doc.comment?.owner?.name,
    contactAvatar: doc.comment?.owner?.picture,
    preview: doc.comment?.text,
    status: doc.status === "resolved" ? "replied" : "pending",
    time: doc.comment?.createdAt,
    likes: 0,
    comments: doc.content?.statistic?.comment ?? 0,
    shares: 0,
    contentId: doc.content?.id || null,
    post: doc.content
      ? {
          caption: doc.content.title || doc.content.description || "",
          thumbnail: doc.content.medias?.[0]?.thumbnail || null,
        }
      : null,
    thread: [{ from: "contact", text: doc.comment?.text, time: doc.comment?.createdAt }],
  };
}

// Map a Repliz chat doc -> our dashboard's conversation shape
function normalizeChat(doc) {
  return {
    id: `chat:${doc._id}`,
    replizId: doc._id,
    kind: "chat",
    type: "dm",
    account: doc.account?.username || doc.account?.name,
    platform: doc.account?.type,
    contact: doc.senderName,
    contactAvatar: doc.senderPicture,
    preview: doc.lastMessage?.text,
    status: doc.unreadCount > 0 ? "pending" : "replied",
    time: doc.lastMessage?.sendAt,
    likes: 0,
    comments: 0,
    shares: 0,
    post: null, // DMs aren't tied to a specific post
    thread: [], // fetched lazily via /api/inbox/:id/thread
  };
}

// For each comment, look up real like/share numbers via the content statistic
// endpoint — deduped per contentId+accountId so we don't hammer the API when
// many comments belong to the same post.
async function enrichWithStatistics(comments) {
  const seen = new Map(); // `${contentId}:${accountId}` -> stats
  for (const c of comments) {
    if (!c.contentId || !c.accountId) continue;
    const key = `${c.contentId}:${c.accountId}`;
    if (!seen.has(key)) {
      const stat = await getContentStatistic(c.contentId, c.accountId);
      seen.set(key, stat);
    }
    const stat = seen.get(key);
    c.likes = stat.like ?? 0;
    c.shares = stat.share ?? 0;
    if (stat.comment != null) c.comments = stat.comment;
  }
  return comments;
}

// ---------------------------------------------------------------------------
// Polling worker
// ---------------------------------------------------------------------------

let io; // set once the socket server is created

async function pollOnce() {
  try {
    const commentDocs = await getAllPages((page) =>
      replizRequest({ method: "GET", url: "/public/comment", params: { page, limit: 50, status: "pending" } })
    );
    const normalizedComments = commentDocs.map(normalizeComment);
    await enrichWithStatistics(normalizedComments);
    const changedComments = normalizedComments.map(upsertConversation);

    let changedChats = [];
    try {
      const chatDocs = await getAllPages((page) =>
        replizRequest({ method: "GET", url: "/public/chat", params: { page, limit: 50, status: "unreplied" } })
      );
      changedChats = chatDocs.map(normalizeChat).map(upsertConversation);
    } catch (chatErr) {
      // Likely means the account isn't on Gold+ tier — don't crash the whole poll loop.
      console.warn("Chat polling skipped:", chatErr.response?.data?.message || chatErr.message);
    }

    const changed = [...changedComments, ...changedChats];
    if (changed.length && io) {
      io.emit("inbox:update", changed);
    }
    console.log(`Poll ok — ${changedComments.length} comments, ${changedChats.length} chats`);
  } catch (err) {
    console.error("Poll failed:", err.response?.data?.message || err.message);
  }
}

function startPolling() {
  pollOnce();
  setInterval(pollOnce, POLL_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// HTTP API for the dashboard
// ---------------------------------------------------------------------------

const app = express();
app.use(cors());
app.use(express.json());

// GET merged inbox, already in the shape the dashboard expects
app.get("/api/inbox", (req, res) => {
  res.json(Array.from(store.conversations.values()));
});

// GET single conversation (fetches full thread on demand for chats)
app.get("/api/inbox/:id", async (req, res) => {
  const conv = store.conversations.get(req.params.id);
  if (!conv) return res.status(404).json({ message: "not found" });

  if (conv.kind === "chat" && conv.thread.length === 0) {
    try {
      const msgs = await getChatMessages(conv.replizId);
      conv.thread = (msgs.docs || []).map((m) => ({
        from: m.isFromMe ? "admin" : "contact",
        text: m.text,
        time: m.sendAt,
      }));
    } catch (err) {
      console.warn("Failed to load chat thread:", err.message);
    }
  }
  res.json(conv);
});

// POST reply — routes to the right Repliz endpoint depending on comment vs DM
app.post("/api/inbox/:id/reply", async (req, res) => {
  const conv = store.conversations.get(req.params.id);
  const { text } = req.body;
  if (!conv) return res.status(404).json({ message: "not found" });
  if (!text?.trim()) return res.status(400).json({ message: "text is required" });

  try {
    if (conv.kind === "comment") {
      await replyComment(conv.replizId, text);
      await updateCommentStatus(conv.replizId, "resolved").catch(() => {});
    } else {
      await sendChatMessage(conv.replizId, text);
    }
    conv.status = "replied";
    conv.thread.push({ from: "admin", text, time: new Date().toISOString() });
    store.conversations.set(conv.id, conv);
    io?.emit("inbox:update", [conv]);
    res.json(conv);
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data || err.message;
    console.error(`Reply failed for ${conv.id} (status ${status}):`, JSON.stringify(detail));
    res.status(502).json({ message: "failed to send reply via Repliz", status, detail });
  }
});

// POST assign — purely local, Repliz has no concept of this
app.post("/api/inbox/:id/assign", (req, res) => {
  const conv = store.conversations.get(req.params.id);
  const { adminName } = req.body;
  if (!conv) return res.status(404).json({ message: "not found" });
  store.assignments.set(conv.id, adminName || null);
  conv.assignedTo = adminName || null;
  store.conversations.set(conv.id, conv);
  io?.emit("inbox:update", [conv]);
  res.json(conv);
});

app.get("/api/accounts", async (req, res) => {
  try {
    const data = await getAccounts();
    res.json(data.docs || []);
  } catch (err) {
    res.status(502).json({ message: "failed to fetch accounts", detail: err.response?.data || err.message });
  }
});

// Admin roster — shared across everyone using the dashboard.
app.get("/api/admins", (req, res) => {
  res.json(store.admins);
});

app.post("/api/admins", (req, res) => {
  const name = (req.body?.name || "").trim();
  if (!name) return res.status(400).json({ message: "name is required" });
  if (!store.admins.includes(name)) store.admins.push(name);
  io?.emit("admins:update", store.admins);
  res.json(store.admins);
});

app.delete("/api/admins/:name", (req, res) => {
  const name = decodeURIComponent(req.params.name);
  store.admins = store.admins.filter((a) => a !== name);
  // Unassign any conversations that were sitting with this admin.
  store.conversations.forEach((c) => {
    if (c.assignedTo === name) {
      c.assignedTo = null;
      store.assignments.delete(c.id);
    }
  });
  io?.emit("admins:update", store.admins);
  res.json(store.admins);
});

// ---------------------------------------------------------------------------
// Webhook receiver — Repliz pushes new comments/messages here in real-time.
// Configure this URL + token in Repliz > Setting > Webhook.
// ---------------------------------------------------------------------------

const WEBHOOK_TOKEN = process.env.REPLIZ_WEBHOOK_TOKEN || "";

app.post("/webhooks/repliz", async (req, res) => {
  // Verify the request really came from Repliz (they send the token via x-token header).
  if (WEBHOOK_TOKEN && req.header("x-token") !== WEBHOOK_TOKEN) {
    return res.status(401).json({ message: "invalid webhook token" });
  }

  const { type, data } = req.body || {};

  try {
    if (type === "comment" && data) {
      const normalized = normalizeComment(data);
      await enrichWithStatistics([normalized]);
      const conv = upsertConversation(normalized);
      io?.emit("inbox:update", [conv]);
      console.log(`Webhook: new comment from ${conv.contact} on ${conv.account}`);
    } else if (type === "chat" && data?.chat) {
      const normalized = normalizeChat(data.chat);
      const existing = store.conversations.get(normalized.id);
      // Keep any thread we already loaded, then append the new message so it
      // shows up immediately without needing another fetch.
      normalized.thread = existing?.thread || [];
      if (data.message) {
        normalized.thread = [
          ...normalized.thread,
          {
            from: data.message.isFromMe ? "admin" : "contact",
            text: data.message.text,
            time: data.message.createdAt,
          },
        ];
      }
      const conv = upsertConversation(normalized);
      io?.emit("inbox:update", [conv]);
      console.log(`Webhook: new chat message from ${conv.contact} on ${conv.account}`);
    }
    // "schedule" and other webhook types are ignored — not relevant to the inbox.
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook processing failed:", err.message);
    res.status(200).json({ ok: true }); // still 200 so Repliz doesn't retry-storm us
  }
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

const server = http.createServer(app);
io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  socket.emit("inbox:update", Array.from(store.conversations.values()));
  socket.emit("admins:update", store.admins);
});

server.listen(PORT, () => {
  console.log(`Prof Admin sync service running on :${PORT}`);
  startPolling();
});
