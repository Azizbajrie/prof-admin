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

const replyComment = (commentId, text) => replizRequest({ method: "POST", url: `/public/comment/${commentId}`, data: { text } });

const updateCommentStatus = (commentId, status) => replizRequest({ method: "PATCH", url: `/public/comment/${commentId}/status`, data: { status } });

// Chat (DM) — requires Gold+ tier
const getChats = (params) => replizRequest({ method: "GET", url: "/public/chat", params: { page: 1, limit: 50, ...params } });

const getChatMessages = (chatId) => replizRequest({ method: "GET", url: `/public/chat/${chatId}/message`, params: { page: 1, limit: 50 } });

const sendChatMessage = (chatId, text) => replizRequest({ method: "POST", url: `/public/chat/${chatId}/message`, data: { type: "text", text } });

// ---------------------------------------------------------------------------
// In-memory store (swap this for Postgres when going to production)
// ---------------------------------------------------------------------------

const store = {
  conversations: new Map(), // key: `${type}:${replizId}` -> normalized conversation
  assignments: new Map(),   // key: same -> admin name
};

function upsertConversation(conv) {
  const existing = store.conversations.get(conv.id);
  const merged = { ...existing, ...conv, assignedTo: store.assignments.get(conv.id) || existing?.assignedTo || null };
  store.conversations.set(conv.id, merged);
  return merged;
}

// Map a Repliz comment doc -> our dashboard's conversation shape
function normalizeComment(doc) {
  const stat = doc.content?.statistic || {};
  return {
    id: `comment:${doc._id}`,
    replizId: doc._id,
    kind: "comment",
    type: "comment",
    account: doc.account?.username || doc.account?.name,
    platform: doc.account?.type, // instagram | threads | facebook | tiktok | youtube | linkedin
    contact: doc.comment?.owner?.name,
    contactAvatar: doc.comment?.owner?.picture,
    preview: doc.comment?.text,
    status: doc.status === "resolved" ? "replied" : "pending",
    time: doc.comment?.createdAt,
    // NOTE: confirm the exact field names against docs.repliz.com/api/content —
    // "comment" is confirmed, "like"/"share" are best-guess names, adjust once you see a real payload.
    likes: stat.like ?? 0,
    comments: stat.comment ?? 0,
    shares: stat.share ?? 0,
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

// ---------------------------------------------------------------------------
// Polling worker
// ---------------------------------------------------------------------------

let io; // set once the socket server is created

async function pollOnce() {
  try {
    const commentRes = await getComments({ status: "pending" });
    const changedComments = (commentRes.docs || []).map(normalizeComment).map(upsertConversation);

    let changedChats = [];
    try {
      const chatRes = await getChats({ status: "unreplied" });
      changedChats = (chatRes.docs || []).map(normalizeChat).map(upsertConversation);
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
    res.status(502).json({ message: "failed to send reply via Repliz", detail: err.response?.data || err.message });
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

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

const server = http.createServer(app);
io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  socket.emit("inbox:update", Array.from(store.conversations.values()));
});

server.listen(PORT, () => {
  console.log(`Prof Admin sync service running on :${PORT}`);
  startPolling();
});
