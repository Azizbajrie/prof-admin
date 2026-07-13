import { useState, useMemo, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  Search, MessageCircle, Mail, Heart, Share2, Clock, Send,
  LayoutDashboard, Inbox, Users, Settings, ChevronDown,
  CircleCheck, CircleDot, AtSign, Image as ImageIcon,
  TrendingUp, Trophy, Globe, Moon, Sun, CheckCircle2, AlertTriangle, UserPlus, X,
  ArrowRight, Lock, Zap, LayoutGrid, Sparkles, LogOut, ExternalLink,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Mock data — swap this for real Repliz API data later
// ---------------------------------------------------------------------------

const DEFAULT_ADMINS = ["Aziz", "Nadia", "Dimas"];

const CONVERSATIONS = [
  {
    id: 1, account: "catatan.putri", platform: "instagram", type: "comment", status: "pending",
    contact: "rifky.rifky.kiky", preview: "Sitik efek cuaca panas iki, tapi tetep semangat kak!",
    time: "14:20", unread: true, assignedTo: null, likes: 312, comments: 41, shares: 5,
    post: { caption: "Cerita rutinitas pagi di tengah cuaca panas Jakarta minggu ini" },
    thread: [{ from: "contact", text: "Sitik efek cuaca panas iki, tapi tetep semangat kak!", time: "14:20" }],
  },
  {
    id: 2, account: "rutinitas.diana", platform: "threads", type: "dm", status: "pending",
    contact: "andri.ristiawan", preview: "Sepakat bang, kapan bisa mulai kerja sama?",
    time: "14:13", unread: true, assignedTo: "Nadia", likes: 89, comments: 19, shares: 2,
    post: { caption: "Open kolaborasi konten untuk brand lokal, DM untuk detail" },
    thread: [
      { from: "contact", text: "Halo kak, saya tertarik sama kontennya", time: "13:50" },
      { from: "contact", text: "Sepakat bang, kapan bisa mulai kerja sama?", time: "14:13" },
    ],
  },
  {
    id: 3, account: "ruang.andika", platform: "instagram", type: "comment", status: "replied",
    contact: "peskeong", preview: "Ga tp aku abis lari kak, pegel semua badan",
    time: "14:05", unread: false, assignedTo: "Aziz", likes: 654, comments: 88, shares: 12,
    post: { caption: "Tips lari pagi 5K buat pemula biar nggak gampang capek" },
    thread: [
      { from: "contact", text: "Ga tp aku abis lari kak, pegel semua badan", time: "14:05" },
      { from: "admin", text: "Semangat kak, istirahat yang cukup ya!", time: "14:09" },
    ],
  },
  {
    id: 4, account: "latif.titiktemu", platform: "threads", type: "dm", status: "pending",
    contact: "jasrotia3479", preview: "Dear souls, How much of...",
    time: "13:32", unread: true, assignedTo: null, likes: 204, comments: 37, shares: 3,
    post: { caption: "Refleksi tentang waktu layar dan kehidupan digital" },
    thread: [{ from: "contact", text: "Dear souls, How much of your day is spent online?", time: "13:32" }],
  },
  {
    id: 5, account: "KitabPedia", platform: "threads", type: "comment", status: "pending",
    contact: "possatpam555", preview: "gede ya ka.... gunung yang di foto itu",
    time: "13:24", unread: false, assignedTo: "Dimas", likes: 1200, comments: 156, shares: 34,
    post: { caption: "Foto pendakian gunung Semeru, rekomendasi jalur untuk pemula" },
    thread: [{ from: "contact", text: "gede ya ka.... gunung yang di foto itu", time: "13:24" }],
  },
  {
    id: 6, account: "Fairus Ali Bajry", platform: "instagram", type: "dm", status: "replied",
    contact: "shandy_ackerman", preview: "Oke siap kak, ditunggu infonya", time: "12:58",
    unread: false, assignedTo: "Aziz", likes: 410, comments: 62, shares: 8,
    post: { caption: "Rezeki paling mahal: peluncuran produk baru minggu ini" },
    thread: [
      { from: "contact", text: "Kak boleh minta info produknya?", time: "12:40" },
      { from: "admin", text: "Boleh kak, saya kirim ke DM ya", time: "12:50" },
      { from: "contact", text: "Oke siap kak, ditunggu infonya", time: "12:58" },
    ],
  },
  {
    id: 7, account: "catatan.putri", platform: "threads", type: "comment", status: "pending",
    contact: "rara915012", preview: "Yg pntg g spot nya aj", time: "13:30",
    unread: true, assignedTo: null, likes: 178, comments: 25, shares: 4,
    post: { caption: "Rekomendasi tempat healing akhir pekan di sekitar kota" },
    thread: [{ from: "contact", text: "Yg pntg g spot nya aj", time: "13:30" }],
  },
];

const ACCOUNT_INTEGRATIONS = [
  { name: "catatan.putri", platform: "instagram", status: "connected" },
  { name: "catatan.putri", platform: "threads", status: "warning" },
  { name: "rutinitas.diana", platform: "instagram", status: "connected" },
  { name: "rutinitas.diana", platform: "threads", status: "connected" },
  { name: "ruang.andika", platform: "instagram", status: "connected" },
  { name: "ruang.andika", platform: "threads", status: "connected" },
  { name: "latif.titiktemu", platform: "instagram", status: "connected" },
  { name: "latif.titiktemu", platform: "threads", status: "connected" },
  { name: "KitabPedia", platform: "threads", status: "connected" },
  { name: "Fairus Ali Bajry", platform: "instagram", status: "connected" },
  { name: "Fairus Ali Bajry", platform: "threads", status: "connected" },
  { name: "resepinAI", platform: "threads", status: "connected" },
  { name: "Aryabaskoro", platform: "threads", status: "connected" },
  { name: "karinaL", platform: "threads", status: "connected" },
];

// ---------------------------------------------------------------------------
// Theme + language
// ---------------------------------------------------------------------------

const THEMES = {
  dark: {
    page: "bg-gradient-to-br from-black via-zinc-950 to-orange-950 text-zinc-200",
    sidebar: "bg-gradient-to-b from-zinc-900 to-black border-orange-950",
    sidebarActive: "bg-gradient-to-r from-orange-700 to-orange-950 text-orange-100",
    sidebarHover: "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
    panelBorder: "border-orange-950/40",
    divider: "border-zinc-800",
    card: "bg-zinc-900 border-zinc-800",
    cardMuted: "bg-zinc-900/60 border-orange-950/40",
    input: "bg-zinc-900 border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:border-orange-700",
    textMuted: "text-zinc-500",
    textSoft: "text-zinc-400",
    textBody: "text-zinc-300",
    textStrong: "text-zinc-100",
    listHover: "hover:bg-zinc-900/60",
    listActive: "bg-gradient-to-r from-orange-950 to-zinc-900",
    bubbleContact: "bg-zinc-800 text-zinc-200",
    logoText: "bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-transparent",
    chipInstagram: "bg-pink-950 text-pink-300 border-pink-800",
    chipThreads: "bg-slate-800 text-slate-300 border-slate-600",
  },
  light: {
    page: "bg-gradient-to-br from-orange-50 via-white to-amber-50 text-zinc-800",
    sidebar: "bg-white border-orange-200",
    sidebarActive: "bg-gradient-to-r from-orange-500 to-orange-600 text-white",
    sidebarHover: "text-zinc-500 hover:bg-orange-50 hover:text-zinc-800",
    panelBorder: "border-orange-200",
    divider: "border-orange-100",
    card: "bg-white border-orange-100",
    cardMuted: "bg-orange-50/70 border-orange-200",
    input: "bg-white border-orange-200 text-zinc-800 placeholder-zinc-400 focus:border-orange-500",
    textMuted: "text-zinc-400",
    textSoft: "text-zinc-500",
    textBody: "text-zinc-600",
    textStrong: "text-zinc-900",
    listHover: "hover:bg-orange-50",
    listActive: "bg-gradient-to-r from-orange-100 to-orange-50",
    bubbleContact: "bg-zinc-100 text-zinc-700",
    logoText: "bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent",
    chipInstagram: "bg-pink-50 text-pink-600 border-pink-200",
    chipThreads: "bg-slate-100 text-slate-600 border-slate-300",
  },
};

const STRINGS = {
  id: {
    tagline: "Kelola jutaan engagement-mu",
    navDashboard: "Dashboard", navInbox: "Unified inbox", navAccounts: "Akun", navSettings: "Pengaturan",
    searchPlaceholder: "Cari kontak, akun, isi pesan",
    all: "Semua", comment: "Komen", dm: "DM",
    allStatus: "Semua status", pending: "Pending", replied: "Terbalas",
    allAccounts: "Semua akun", allPlatforms: "Semua platform",
    summaryToday: "Ringkasan hari ini", unassignedLabel: "Belum ditugaskan", logout: "Keluar",
    noMatch: "Tidak ada percakapan yang cocok.",
    repliesTo: "membalas sebagai",
    originalPost: "Postingan asli yang dikomentari",
    replyPlaceholderComment: "Balas komentar ini...",
    replyPlaceholderDm: "Balas DM ini...",
    send: "Kirim",
    pickConversation: "Pilih percakapan di sebelah kiri",
    assignedTo: "Ditugaskan ke", unassigned: "Belum ditugaskan",
    engagementOnPost: "Engagement pada konten asal",
    likes: "Suka", comments: "Komentar", shares: "Dibagikan",
    responseTime: "Waktu respon", waitingReply: "Menunggu balasan", alreadyReplied: "Sudah dibalas",
    dashboardTitle: "Ringkasan performa", dashboardSub: "Semua akun dan platform, digabung jadi satu pandangan",
    periodToday: "Hari ini", periodWeek: "Minggu ini", periodMonth: "Bulan ini", periodYear: "Tahun ini", periodAll: "Semua",
    totalComments: "Total komentar", totalDms: "Total DM", totalLikes: "Total suka", totalShares: "Total dibagikan",
    perAccount: "Performa per akun", perPlatform: "Performa per platform", bestContent: "Konten performa terbaik",
    noLink: "Tanpa link",
    conversations: "percakapan",
    accountsTitle: "Akun terintegrasi", accountsSub: "akun terhubung ke Prof Admin", connected: "Terhubung", needsAttention: "Perlu perhatian",
    settingsTitle: "Pengaturan", settingsSub: "Sesuaikan bahasa dan tampilan dashboard",
    language: "Bahasa", theme: "Tampilan", dark: "Gelap", light: "Terang", indonesian: "Indonesia", english: "English",
    adminList: "Daftar admin", adminAdd: "Tambah admin", adminPlaceholder: "Nama admin baru...",
    adminEmpty: "Belum ada admin, tambahin dulu di atas.",
    demoWarning: "Nggak bisa konek ke server Repliz — nampilin data contoh dulu.",
    notConnectedYet: "Akun Repliz kamu belum terhubung.",
    goToSettings: "Hubungkan sekarang",
    replyFailed: "Gagal mengirim balasan ke Repliz. Coba lagi sebentar lagi.",
    noPostDm: "Ini pesan langsung (DM), nggak terhubung ke postingan tertentu.",
    loadingThread: "Memuat percakapan...",
  },
  en: {
    tagline: "Manage millions of your engagements",
    navDashboard: "Dashboard", navInbox: "Unified inbox", navAccounts: "Accounts", navSettings: "Settings",
    searchPlaceholder: "Search contact, account, message",
    all: "All", comment: "Comment", dm: "DM",
    allStatus: "All status", pending: "Pending", replied: "Replied",
    allAccounts: "All accounts", allPlatforms: "All platforms",
    summaryToday: "Today's summary", unassignedLabel: "Unassigned", logout: "Log out",
    noMatch: "No matching conversations.",
    repliesTo: "replying as",
    originalPost: "Original post being commented on",
    replyPlaceholderComment: "Reply to this comment...",
    replyPlaceholderDm: "Reply to this DM...",
    send: "Send",
    pickConversation: "Pick a conversation on the left",
    assignedTo: "Assigned to", unassigned: "Unassigned",
    engagementOnPost: "Engagement on original content",
    likes: "Likes", comments: "Comments", shares: "Shares",
    responseTime: "Response time", waitingReply: "Awaiting reply", alreadyReplied: "Replied",
    dashboardTitle: "Performance overview", dashboardSub: "All accounts and platforms, in one view",
    periodToday: "Today", periodWeek: "This week", periodMonth: "This month", periodYear: "This year", periodAll: "All time",
    totalComments: "Total comments", totalDms: "Total DMs", totalLikes: "Total likes", totalShares: "Total shares",
    perAccount: "Performance per account", perPlatform: "Performance per platform", bestContent: "Best performing content",
    noLink: "No link",
    conversations: "conversations",
    accountsTitle: "Integrated accounts", accountsSub: "accounts connected to Prof Admin", connected: "Connected", needsAttention: "Needs attention",
    settingsTitle: "Settings", settingsSub: "Adjust the dashboard's language and appearance",
    language: "Language", theme: "Appearance", dark: "Dark", light: "Light", indonesian: "Indonesia", english: "English",
    adminList: "Admin list", adminAdd: "Add admin", adminPlaceholder: "New admin name...",
    adminEmpty: "No admins yet, add one above.",
    demoWarning: "Can't reach the Repliz server — showing sample data instead.",
    notConnectedYet: "Your Repliz account isn't connected yet.",
    goToSettings: "Connect now",
    replyFailed: "Failed to send the reply to Repliz. Try again in a moment.",
    noPostDm: "This is a direct message, not tied to a specific post.",
    loadingThread: "Loading conversation...",
  },
};

const PLATFORM_NAMES = { instagram: "Instagram", threads: "Threads", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", linkedin: "LinkedIn" };
const PLATFORM_COLORS = {
  instagram: { dark: "#ec4899", light: "#db2777" },
  threads: { dark: "#a1a1aa", light: "#71717a" },
  facebook: { dark: "#3b82f6", light: "#2563eb" },
  tiktok: { dark: "#f43f5e", light: "#e11d48" },
  youtube: { dark: "#ef4444", light: "#dc2626" },
  linkedin: { dark: "#0ea5e9", light: "#0284c7" },
};
function platformLabel(p) { return PLATFORM_NAMES[p] || (p ? p[0].toUpperCase() + p.slice(1) : "Lainnya"); }
function platformChip(p, t) { return p === "instagram" ? t.chipInstagram : t.chipThreads; }

// Formats an ISO timestamp into 24-hour WIB (UTC+7) time, e.g. "10 Jul 20:54".
// Falls back to the raw value for non-ISO strings like "now" or mock "14:20".
function formatWIB(value) {
  if (!value || value === "now") return value === "now" ? "Baru saja" : value;
  const date = new Date(value);
  if (isNaN(date)) return value;
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const day = String(wib.getUTCDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const month = months[wib.getUTCMonth()];
  const hours = String(wib.getUTCHours()).padStart(2, "0");
  const minutes = String(wib.getUTCMinutes()).padStart(2, "0");
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const isToday = wib.getUTCFullYear() === now.getUTCFullYear() && wib.getUTCMonth() === now.getUTCMonth() && wib.getUTCDate() === now.getUTCDate();
  return isToday ? `${hours}:${minutes} WIB` : `${day} ${month} ${hours}:${minutes} WIB`;
}

function TypeIcon({ type, className }) {
  return type === "dm" ? <Mail className={className} /> : <MessageCircle className={className} />;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

// Backend URL — set VITE_API_URL in Vercel once the backend is deployed on Railway.
// Falls back to localhost so local testing still works without extra setup.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function Dashboard({ onLogout, userId }) {
  const isPersonal = !!userId;
  // In personal mode, every call goes to /api/me/... with an x-user-id header
  // instead of the shared team endpoints — that's what keeps each user's
  // data separate.
  const apiPath = (p) => `${API_URL}${isPersonal ? "/api/me" : "/api"}${p}`;
  const apiHeaders = (extra = {}) => ({ ...(isPersonal ? { "x-user-id": String(userId) } : {}), ...extra });

  const [themeMode, setThemeMode] = useState("dark");
  const [lang, setLang] = useState("id");
  const t = THEMES[themeMode];
  const s = STRINGS[lang];

  const [view, setView] = useState("dashboard");

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [reply, setReply] = useState("");
  const [data, setData] = useState([]);
  const [connectionError, setConnectionError] = useState(false);
  const [showPost, setShowPost] = useState(true);
  const [period, setPeriod] = useState("all");
  const [admins, setAdmins] = useState(isPersonal ? [] : DEFAULT_ADMINS);
  const [newAdminName, setNewAdminName] = useState("");
  const [replizKeysForm, setReplizKeysForm] = useState({ replizAccessKey: "", replizSecretKey: "" });
  const [replizKeysStatus, setReplizKeysStatus] = useState(null);

  // Load the inbox once on mount, then keep it live via WebSocket.
  useEffect(() => {
    fetch(apiPath("/inbox"), { headers: apiHeaders() })
      .then(async (res) => {
        const docs = await res.json();
        if (!res.ok) throw new Error(Array.isArray(docs) ? "" : docs.message || "failed");
        return docs;
      })
      .then((docs) => {
        setData(Array.isArray(docs) ? docs : []);
        setConnectionError(false);
        if (docs.length) setSelectedId((cur) => cur ?? docs[0].id);
      })
      .catch(() => {
        setConnectionError(true);
        setData([]);
        if (!isPersonal) {
          setData(CONVERSATIONS);
          setSelectedId(CONVERSATIONS[0].id);
        }
      });

    fetch(apiPath("/admins"), { headers: apiHeaders() })
      .then((res) => res.json())
      .then((list) => Array.isArray(list) && setAdmins(list))
      .catch(() => {});

    const socket = io(API_URL);
    if (isPersonal) socket.emit("join", userId);
    else socket.emit("join-team");
    socket.on("inbox:update", (changed) => {
      setData((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]));
        changed.forEach((c) => map.set(c.id, c));
        return Array.from(map.values());
      });
      setConnectionError(false);
    });
    socket.on("admins:update", (list) => setAdmins(list));
    socket.on("connect_error", () => setConnectionError(true));

    return () => socket.disconnect();
  }, [userId]);

  function addAdmin() {
    const name = newAdminName.trim();
    if (!name || admins.includes(name)) return;
    setNewAdminName("");
    setAdmins((prev) => [...prev, name]); // optimistic, socket will confirm
    fetch(apiPath("/admins"), {
      method: "POST",
      headers: apiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name }),
    })
      .then((res) => (isPersonal ? res.json() : null))
      .then((list) => list && setAdmins(list))
      .catch(() => {});
  }

  function removeAdmin(name) {
    setAdmins((prev) => prev.filter((a) => a !== name)); // optimistic
    setData((prev) => prev.map((c) => (c.assignedTo === name ? { ...c, assignedTo: null } : c)));
    fetch(apiPath(`/admins/${encodeURIComponent(name)}`), { method: "DELETE", headers: apiHeaders() }).catch(() => {});
  }

  const accountNames = useMemo(() => Array.from(new Set(data.map((c) => c.account))), [data]);
  const liveAccounts = useMemo(() => {
    const seen = new Map(); // "account:platform" -> { name, platform }
    data.forEach((c) => {
      const key = `${c.account}:${c.platform}`;
      if (!seen.has(key)) seen.set(key, { name: c.account, platform: c.platform, status: "connected" });
    });
    return Array.from(seen.values());
  }, [data]);

  const filtered = useMemo(() => {
    return data
      .filter((c) => {
        if (typeFilter !== "all" && c.type !== typeFilter) return false;
        if (statusFilter !== "all" && c.status !== statusFilter) return false;
        if (accountFilter !== "all" && c.account !== accountFilter) return false;
        if (platformFilter !== "all" && c.platform !== platformFilter) return false;
        if (query && !(`${c.contact} ${c.preview} ${c.account}`.toLowerCase().includes(query.toLowerCase()))) return false;
        return true;
      })
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [data, typeFilter, statusFilter, accountFilter, platformFilter, query]);

  const selected = data.find((c) => c.id === selectedId) || filtered[0];

  // DM threads are loaded lazily by the backend — fetch the full detail once selected.
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyError, setReplyError] = useState(null);
  useEffect(() => {
    if (!selected || connectionError) return;
    setReplyError(null);
    if (selected.thread && selected.thread.length > 0) return;
    setThreadLoading(true);
    fetch(apiPath(`/inbox/${encodeURIComponent(selected.id)}`), { headers: apiHeaders() })
      .then((res) => res.json())
      .then((full) => {
        setData((prev) => prev.map((c) => (c.id === full.id ? full : c)));
      })
      .catch(() => {})
      .finally(() => setThreadLoading(false));
  }, [selectedId]);

  const pendingCount = data.filter((c) => c.status === "pending").length;
  const repliedTodayCount = data.filter((c) => c.status === "replied").length;
  const unassignedCount = data.filter((c) => !c.assignedTo).length;

  function sendReply() {
    if (!reply.trim() || !selected) return;
    const text = reply.trim();
    setReply("");
    setReplyError(null);
    // Optimistic update so the admin sees it instantly, then confirm with the backend.
    setData((prev) =>
      prev.map((c) =>
        c.id === selected.id
          ? { ...c, status: "replied", unread: false, thread: [...c.thread, { from: "admin", text, time: "now" }] }
          : c
      )
    );
    fetch(apiPath(`/inbox/${encodeURIComponent(selected.id)}/reply`), {
      method: "POST",
      headers: apiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ text }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const detailText = typeof body.detail === "string" ? body.detail : body.detail?.message || JSON.stringify(body.detail || "");
          const label = detailText && detailText !== '""' ? detailText : body.message || `HTTP ${body.status || res.status}`;
          throw new Error(label);
        }
      })
      .catch((err) => setReplyError(`${s.replyFailed} ${err.message ? `(${err.message})` : ""}`));
  }

  function claim(adminName) {
    if (!selected) return;
    setData((prev) => prev.map((c) => (c.id === selected.id ? { ...c, assignedTo: adminName || null } : c)));
    fetch(apiPath(`/inbox/${encodeURIComponent(selected.id)}/assign`), {
      method: "POST",
      headers: apiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ adminName: adminName || null }),
    }).catch(() => setConnectionError(true));
  }

  function saveReplizKeys(e) {
    e.preventDefault();
    setReplizKeysStatus("saving");
    fetch(apiPath("/repliz-keys"), {
      method: "POST",
      headers: apiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(replizKeysForm),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || "Gagal menyimpan");
        setReplizKeysStatus("saved");
        setTimeout(() => window.location.reload(), 1200); // reload so the dashboard picks up the fresh connection
      })
      .catch((err) => setReplizKeysStatus(err.message));
  }

  // --- Dashboard aggregates ---
  // Filter the underlying data by the selected period before computing any stats.
  const periodData = useMemo(() => {
    const now = new Date();
    let cutoff;
    if (period === "today") cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (period === "week") cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (period === "month") cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else if (period === "year") cutoff = new Date(now.getFullYear(), 0, 1);
    else return data;
    return data.filter((c) => {
      const t = new Date(c.time);
      return !isNaN(t) && t >= cutoff;
    });
  }, [data, period]);

  const totals = useMemo(() => {
    const commentCount = periodData.filter((c) => c.type === "comment").length;
    const dmCount = periodData.filter((c) => c.type === "dm").length;
    const likes = periodData.reduce((sum, c) => sum + c.likes, 0);
    const shares = periodData.reduce((sum, c) => sum + c.shares, 0);
    return { commentCount, dmCount, likes, shares };
  }, [periodData]);

  const perAccount = useMemo(() => {
    const map = new Map();
    periodData.forEach((c) => {
      const key = c.account;
      const cur = map.get(key) || { account: c.account, platforms: new Set(), count: 0, likes: 0, comments: 0, shares: 0 };
      cur.platforms.add(c.platform);
      cur.count += 1;
      cur.likes += c.likes;
      cur.comments += c.comments;
      cur.shares += c.shares;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.likes + b.comments - (a.likes + a.comments));
  }, [periodData]);

  const perPlatform = useMemo(() => {
    const map = new Map();
    periodData.forEach((c) => {
      const key = c.platform || "lainnya";
      const cur = map.get(key) || { platform: key, count: 0, likes: 0, comments: 0, shares: 0 };
      cur.count += 1;
      cur.likes += c.likes;
      cur.comments += c.comments;
      cur.shares += c.shares;
      map.set(key, cur);
    });
    return Array.from(map.values());
  }, [periodData]);

  const typeSplit = useMemo(() => {
    const comment = periodData.filter((c) => c.type === "comment").length;
    const dm = periodData.filter((c) => c.type === "dm").length;
    return [
      { name: s.comment, value: comment },
      { name: "DM", value: dm },
    ];
  }, [periodData, s]);

  const [bestContentPeriod, setBestContentPeriod] = useState("week");
  const bestContentData = useMemo(() => {
    if (bestContentPeriod === "all") return data;
    const now = new Date();
    const cutoff =
      bestContentPeriod === "today"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return data.filter((c) => {
      const t = new Date(c.time);
      return !isNaN(t) && t >= cutoff;
    });
  }, [data, bestContentPeriod]);

  const bestContent = useMemo(
    () => [...bestContentData].sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares)).slice(0, 10),
    [bestContentData]
  );

  const navItems = [
    { key: "dashboard", icon: LayoutDashboard, label: s.navDashboard },
    { key: "inbox", icon: Inbox, label: s.navInbox },
    { key: "accounts", icon: Users, label: s.navAccounts },
    { key: "settings", icon: Settings, label: s.navSettings },
  ];

  return (
    <div className={`w-full h-screen flex flex-col text-sm overflow-hidden ${t.page}`}>
      {connectionError && (
        <div className="w-full bg-amber-900/60 border-b border-amber-700 text-amber-200 text-xs px-4 py-2 flex items-center justify-between gap-2 shrink-0">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {isPersonal ? s.notConnectedYet : s.demoWarning}
          </span>
          {isPersonal && (
            <button onClick={() => setView("settings")} className="underline shrink-0">
              {s.goToSettings}
            </button>
          )}
        </div>
      )}
      <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <div className={`w-56 shrink-0 border-r flex flex-col py-5 px-3 gap-1 ${t.sidebar}`}>
        <div className="px-2 mb-6">
          <div className={`font-medium text-base ${t.logoText}`}>Prof Admin</div>
          <div className={`text-xs mt-0.5 ${t.textMuted}`}>{s.tagline}</div>
        </div>
        {navItems.map(({ key, icon: Icon, label }) => (
          <div
            key={key}
            onClick={() => setView(key)}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer ${
              view === key ? t.sidebarActive : t.sidebarHover
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </div>
        ))}

        <div className={`mt-auto px-2 pt-4 border-t ${t.divider}`}>
          <div className={`text-xs mb-2 ${t.textMuted}`}>{s.summaryToday}</div>
          <div className="flex items-center justify-between py-1">
            <span className={t.textSoft}>{s.pending}</span>
            <span className="text-amber-400 font-medium">{pendingCount}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className={t.textSoft}>{s.replied}</span>
            <span className="text-orange-400 font-medium">{repliedTodayCount}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className={t.textSoft}>{s.unassignedLabel}</span>
            <span className={`font-medium ${t.textStrong}`}>{unassignedCount}</span>
          </div>
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-2 mt-3 pt-3 border-t text-xs ${t.divider} ${t.textMuted} hover:text-red-400`}
          >
            <LogOut className="w-3.5 h-3.5" /> {s.logout}
          </button>
        </div>
      </div>

      {/* ---------------- DASHBOARD VIEW ---------------- */}
      {view === "dashboard" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className={`text-lg font-medium ${t.textStrong}`}>{s.dashboardTitle}</div>
              <div className={`text-xs mt-0.5 ${t.textMuted}`}>{s.dashboardSub}</div>
            </div>
            <div className="flex gap-1.5">
              {[
                { key: "all", label: s.periodAll },
                { key: "today", label: s.periodToday },
                { key: "week", label: s.periodWeek },
                { key: "month", label: s.periodMonth },
                { key: "year", label: s.periodYear },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-3 py-1.5 rounded-full border text-xs ${
                    period === p.key ? "bg-orange-950 border-orange-800 text-orange-300" : `border-transparent ${t.textSoft} hover:${t.textStrong}`
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 my-5">
            {[
              { label: s.totalComments, value: totals.commentCount, icon: MessageCircle },
              { label: s.totalDms, value: totals.dmCount, icon: Mail },
              { label: s.totalLikes, value: totals.likes.toLocaleString(), icon: Heart },
              { label: s.totalShares, value: totals.shares.toLocaleString(), icon: Share2 },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className={`rounded-xl border px-4 py-3.5 ${t.card}`}>
                <div className={`flex items-center gap-1.5 text-xs mb-2 ${t.textMuted}`}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </div>
                <div className={`text-2xl font-medium ${t.textStrong}`}>{value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className={`rounded-xl border p-4 ${t.card}`}>
              <div className={`text-xs mb-3 flex items-center gap-1.5 ${t.textMuted}`}>
                <TrendingUp className="w-3.5 h-3.5" /> {s.perAccount}
              </div>
              <div className="flex flex-col gap-2.5">
                {perAccount.map((a) => (
                  <div key={a.account} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className={`truncate ${t.textBody}`}>{a.account}</div>
                      <div className={`text-[11px] ${t.textMuted}`}>{a.count} {s.conversations}</div>
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="flex items-center gap-1 text-pink-400"><Heart className="w-3 h-3" />{a.likes}</span>
                      <span className="flex items-center gap-1 text-orange-400"><MessageCircle className="w-3 h-3" />{a.comments}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${t.card}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`text-xs flex items-center gap-1.5 ${t.textMuted}`}>
                  <TrendingUp className="w-3.5 h-3.5" /> {s.perPlatform}
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-orange-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
                  </span>
                  Live
                </span>
              </div>
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer>
                  <BarChart data={perPlatform} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barLikes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fb923c" stopOpacity={1} />
                        <stop offset="100%" stopColor="#7c2d12" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="barShares" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                        <stop offset="100%" stopColor="#78350f" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={themeMode === "dark" ? "#27272a" : "#fed7aa"} vertical={false} />
                    <XAxis
                      dataKey="platform"
                      tickFormatter={(p) => platformLabel(p)}
                      tick={{ fill: themeMode === "dark" ? "#a1a1aa" : "#78716c", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tick={{ fill: themeMode === "dark" ? "#a1a1aa" : "#78716c", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: themeMode === "dark" ? "#18181b" : "#fff",
                        border: "1px solid #7c2d12",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelFormatter={(p) => platformLabel(p)}
                    />
                    <Bar dataKey="likes" name={s.likes} fill="url(#barLikes)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600} />
                    <Bar dataKey="shares" name={s.shares} fill="url(#barShares)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${t.card}`}>
              <div className={`text-xs mb-3 flex items-center gap-1.5 ${t.textMuted}`}>
                <MessageCircle className="w-3.5 h-3.5" /> {s.comment} vs DM
              </div>
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <defs>
                      <linearGradient id="pieComment" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fb923c" />
                        <stop offset="100%" stopColor="#9a3412" />
                      </linearGradient>
                      <linearGradient id="pieDm" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#92400e" />
                      </linearGradient>
                    </defs>
                    <Pie
                      data={typeSplit.some((d) => d.value > 0) ? typeSplit : [{ name: "-", value: 1 }]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={typeSplit.some((d) => d.value > 0) ? 3 : 0}
                      isAnimationActive
                      animationDuration={600}
                    >
                      <Cell fill="url(#pieComment)" />
                      <Cell fill={typeSplit.some((d) => d.value > 0) ? "url(#pieDm)" : (themeMode === "dark" ? "#3f3f46" : "#e5e7eb")} />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: themeMode === "dark" ? "#18181b" : "#fff",
                        border: "1px solid #7c2d12",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 -mt-2 text-[11px]">
                <span className={`flex items-center gap-1.5 ${t.textSoft}`}>
                  <span className="w-2 h-2 rounded-full bg-orange-500" /> {s.comment} ({typeSplit[0].value})
                </span>
                <span className={`flex items-center gap-1.5 ${t.textSoft}`}>
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> DM ({typeSplit[1].value})
                </span>
              </div>
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${t.card}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`text-xs flex items-center gap-1.5 ${t.textMuted}`}>
                <Trophy className="w-3.5 h-3.5 text-orange-400" /> {s.bestContent}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[
                    { key: "week", label: s.periodWeek },
                    { key: "all", label: s.periodAll },
                  ].map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setBestContentPeriod(p.key)}
                      className={`px-2 py-0.5 rounded-full border text-[11px] ${
                        bestContentPeriod === p.key ? "bg-orange-950 border-orange-800 text-orange-300" : `border-transparent ${t.textMuted}`
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-orange-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
                  </span>
                  Live
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 max-h-[196px] overflow-y-auto pr-1">
              {bestContent.map((c, i) => {
                const url = c.post?.url;
                const Row = url ? "a" : "div";
                return (
                  <Row
                    key={c.id}
                    {...(url ? { href: url, target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                      url ? "cursor-pointer hover:border-orange-700" : "opacity-60"
                    } ${t.cardMuted}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-800 flex items-center justify-center text-white text-xs font-medium shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate ${t.textBody}`}>{c.post?.caption || c.preview}</div>
                      <div className={`text-[11px] ${t.textMuted}`}>{c.account} · {platformLabel(c.platform)}</div>
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="flex items-center gap-1 text-pink-400"><Heart className="w-3 h-3" />{c.likes}</span>
                      <span className="flex items-center gap-1 text-orange-400"><MessageCircle className="w-3 h-3" />{c.comments ?? 0}</span>
                      <span className="flex items-center gap-1 text-amber-400"><Share2 className="w-3 h-3" />{c.shares}</span>
                    </div>
                    {url ? (
                      <ExternalLink className={`w-3.5 h-3.5 shrink-0 ${t.textMuted}`} />
                    ) : (
                      <span className={`text-[10px] shrink-0 ${t.textMuted}`}>{s.noLink}</span>
                    )}
                  </Row>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- ACCOUNTS VIEW ---------------- */}
      {view === "accounts" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className={`text-lg font-medium ${t.textStrong}`}>{s.accountsTitle}</div>
          <div className={`text-xs mt-0.5 mb-5 ${t.textMuted}`}>{liveAccounts.length} {s.accountsSub}</div>
          {liveAccounts.length === 0 ? (
            <div className={`text-sm ${t.textMuted}`}>
              {isPersonal ? s.notConnectedYet : s.noMatch}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {liveAccounts.map((acc, i) => (
                <div key={i} className={`rounded-xl border p-3.5 flex items-center gap-3 ${t.card}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs shrink-0 ${t.bubbleContact}`}>
                    {acc.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate ${t.textBody}`}>{acc.name}</div>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] mt-1 ${platformChip(acc.platform, t)}`}>
                      {platformLabel(acc.platform)}
                    </span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" title={s.connected} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- SETTINGS VIEW ---------------- */}
      {view === "settings" && (
        <div className="flex-1 overflow-y-auto p-6 max-w-lg">
          <div className={`text-lg font-medium ${t.textStrong}`}>{s.settingsTitle}</div>
          <div className={`text-xs mt-0.5 mb-6 ${t.textMuted}`}>{s.settingsSub}</div>

          {isPersonal && (
            <div className={`rounded-xl border p-4 mb-4 ${t.card}`}>
              <div className={`text-xs mb-3 flex items-center gap-1.5 ${t.textMuted}`}>
                <Lock className="w-3.5 h-3.5" /> Akun Repliz kamu
              </div>
              <form onSubmit={saveReplizKeys} className="flex flex-col gap-3">
                <div>
                  <label className={`text-xs mb-1 block ${t.textMuted}`}>Repliz Access Key</label>
                  <input
                    type="text"
                    value={replizKeysForm.replizAccessKey}
                    onChange={(e) => setReplizKeysForm((f) => ({ ...f, replizAccessKey: e.target.value }))}
                    placeholder="Access key dari Repliz"
                    className={`w-full rounded-lg px-3 py-2 text-sm outline-none border ${t.input}`}
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${t.textMuted}`}>Repliz Secret Key</label>
                  <input
                    type="password"
                    value={replizKeysForm.replizSecretKey}
                    onChange={(e) => setReplizKeysForm((f) => ({ ...f, replizSecretKey: e.target.value }))}
                    placeholder="Secret key dari Repliz"
                    className={`w-full rounded-lg px-3 py-2 text-sm outline-none border ${t.input}`}
                  />
                </div>
                {replizKeysStatus === "saved" && <div className="text-green-400 text-xs">Tersimpan! Memuat ulang...</div>}
                {replizKeysStatus && replizKeysStatus !== "saving" && replizKeysStatus !== "saved" && (
                  <div className="text-red-400 text-xs">{replizKeysStatus}</div>
                )}
                <button
                  type="submit"
                  disabled={replizKeysStatus === "saving"}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 text-white font-medium disabled:opacity-60"
                >
                  {replizKeysStatus === "saving" ? "Menyimpan..." : "Simpan & Hubungkan"}
                </button>
              </form>
            </div>
          )}

          <div className={`rounded-xl border p-4 mb-4 ${t.card}`}>
            <div className={`text-xs mb-3 flex items-center gap-1.5 ${t.textMuted}`}>
              <Globe className="w-3.5 h-3.5" /> {s.language}
            </div>
            <div className="flex gap-2">
              {[
                { key: "id", label: s.indonesian },
                { key: "en", label: s.english },
              ].map((l) => (
                <button
                  key={l.key}
                  onClick={() => setLang(l.key)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                    lang === l.key ? "bg-gradient-to-r from-orange-600 to-orange-800 border-orange-700 text-white" : `${t.input}`
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`rounded-xl border p-4 mb-4 ${t.card}`}>
            <div className={`text-xs mb-3 flex items-center gap-1.5 ${t.textMuted}`}>
              {themeMode === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />} {s.theme}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setThemeMode("dark")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                  themeMode === "dark" ? "bg-gradient-to-r from-orange-600 to-orange-800 border-orange-700 text-white" : t.input
                }`}
              >
                <Moon className="w-3.5 h-3.5" /> {s.dark}
              </button>
              <button
                onClick={() => setThemeMode("light")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                  themeMode === "light" ? "bg-gradient-to-r from-orange-600 to-orange-800 border-orange-700 text-white" : t.input
                }`}
              >
                <Sun className="w-3.5 h-3.5" /> {s.light}
              </button>
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${t.card}`}>
            <div className={`text-xs mb-3 flex items-center gap-1.5 ${t.textMuted}`}>
              <UserPlus className="w-3.5 h-3.5" /> {s.adminList}
            </div>
            <div className="flex gap-2 mb-3">
              <input
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAdmin()}
                placeholder={s.adminPlaceholder}
                className={`flex-1 rounded-lg px-3 py-2 text-sm outline-none border ${t.input}`}
              />
              <button
                onClick={addAdmin}
                className="px-3.5 rounded-lg bg-gradient-to-r from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 text-white flex items-center gap-1.5 shrink-0 text-sm"
              >
                <UserPlus className="w-3.5 h-3.5" /> {s.adminAdd}
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {admins.map((a) => (
                <div key={a} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${t.cardMuted}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${t.bubbleContact}`}>
                      {a.slice(0, 2).toUpperCase()}
                    </div>
                    <span className={t.textBody}>{a}</span>
                  </div>
                  <button onClick={() => removeAdmin(a)} className={`${t.textMuted} hover:text-red-400`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {admins.length === 0 && <div className={`text-xs text-center py-3 ${t.textMuted}`}>{s.adminEmpty}</div>}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- INBOX VIEW ---------------- */}
      {view === "inbox" && (
        <>
          {/* Inbox list */}
          <div className={`w-80 shrink-0 border-r flex flex-col ${t.panelBorder}`}>
            <div className={`p-3 border-b ${t.divider}`}>
              <div className="relative mb-2.5">
                <Search className={`w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={s.searchPlaceholder}
                  className={`w-full rounded-lg pl-8 pr-3 py-1.5 outline-none border ${t.input}`}
                />
              </div>
              <div className="flex gap-1.5 mb-2">
                {[
                  { key: "all", label: s.all },
                  { key: "comment", label: s.comment },
                  { key: "dm", label: s.dm },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setTypeFilter(f.key)}
                    className={`px-2.5 py-1 rounded-full border text-xs ${
                      typeFilter === f.key ? "bg-orange-950 border-orange-800 text-orange-300" : `bg-transparent ${t.textSoft} ${t.divider}`
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <div className="flex-1" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`rounded-full px-2 py-1 text-xs outline-none border ${t.input}`}
                >
                  <option value="all">{s.allStatus}</option>
                  <option value="pending">{s.pending}</option>
                  <option value="replied">{s.replied}</option>
                </select>
              </div>
              <div className="flex gap-1.5">
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className={`flex-1 min-w-0 rounded-lg px-2 py-1.5 text-xs outline-none border ${t.input}`}
                >
                  <option value="all">{s.allAccounts}</option>
                  {accountNames.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className={`w-28 shrink-0 rounded-lg px-2 py-1.5 text-xs outline-none border ${t.input}`}
                >
                  <option value="all">{s.allPlatforms}</option>
                  <option value="instagram">Instagram</option>
                  <option value="threads">Threads</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.map((c) => {
                const isActive = selected && c.id === selected.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`px-3 py-3 border-b cursor-pointer ${t.divider} ${isActive ? t.listActive : t.listHover}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${t.bubbleContact}`}>
                        {c.contact.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`truncate ${c.unread ? `font-medium ${t.textStrong}` : t.textBody}`}>
                            {c.contact}
                          </span>
                          <span className={`text-xs shrink-0 ${t.textMuted}`}>{formatWIB(c.time)}</span>
                        </div>
                        <div className={`text-xs truncate mb-1.5 flex items-center gap-1.5 ${t.textMuted}`}>
                          via {c.account}
                          {c.status === "pending" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" title="Belum dibalas" />
                          )}
                        </div>
                        <div className={`text-xs truncate ${c.unread ? t.textBody : t.textMuted}`}>{c.preview}</div>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] ${platformChip(c.platform, t)}`}>
                            {platformLabel(c.platform)}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[11px] ${t.textMuted}`}>
                            <TypeIcon type={c.type} className="w-3 h-3" />
                            {c.type === "dm" ? "DM" : s.comment}
                          </span>
                          {c.unread && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 ml-auto" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className={`text-xs px-4 py-8 text-center ${t.textMuted}`}>{s.noMatch}</div>
              )}
            </div>
          </div>

          {/* Conversation detail */}
          <div className="flex-1 flex flex-col min-w-0">
            {selected ? (
              <>
                <div className={`px-5 py-3.5 border-b flex items-center justify-between ${t.divider}`}>
                  <div>
                    <div className={`font-medium ${t.textStrong}`}>{selected.contact}</div>
                    <div className={`text-xs mt-0.5 flex items-center gap-1.5 ${t.textMuted}`}>
                      <AtSign className="w-3 h-3" /> {s.repliesTo} {selected.account}
                      <span className={`ml-1 px-1.5 py-0.5 rounded border text-[11px] ${platformChip(selected.platform, t)}`}>
                        {platformLabel(selected.platform)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {selected.status === "replied" ? (
                      <span className="inline-flex items-center gap-1 text-orange-400"><CircleCheck className="w-3.5 h-3.5" /> {s.replied}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400"><CircleDot className="w-3.5 h-3.5" /> {s.pending}</span>
                    )}
                  </div>
                </div>

                <div className={`mx-5 mt-4 border rounded-xl overflow-hidden shrink-0 ${t.cardMuted}`}>
                  <button
                    onClick={() => setShowPost(!showPost)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-left"
                  >
                    <span className={`flex items-center gap-2 text-xs ${t.textBody}`}>
                      <ImageIcon className="w-3.5 h-3.5 text-orange-400" /> {s.originalPost}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${t.textMuted} ${showPost ? "rotate-180" : ""}`} />
                  </button>
                  {showPost && (
                    selected.post ? (
                      <div className="px-3.5 pb-3.5 flex gap-3">
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-orange-700 to-zinc-800 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-5 h-5 text-orange-200" />
                        </div>
                        <div className="min-w-0 flex flex-col justify-center">
                          <div className={`text-xs mb-1 ${t.textBody}`}>{selected.post.caption}</div>
                          <div className={`text-[11px] ${t.textMuted}`}>
                            {selected.likes} {s.likes.toLowerCase()} · {selected.comments} {s.comments.toLowerCase()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`px-3.5 pb-3.5 text-xs ${t.textMuted}`}>{s.noPostDm}</div>
                    )
                  )}
                </div>

                {replyError && (
                  <div className="mx-5 mt-3 rounded-lg border border-red-800 bg-red-950/60 text-red-300 text-xs px-3 py-2">
                    {replyError}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                  {threadLoading && (
                    <div className={`text-xs text-center py-2 ${t.textMuted}`}>{s.loadingThread}</div>
                  )}
                  {selected.thread.map((m, i) => (
                    <div key={i} className={`max-w-md ${m.from === "admin" ? "self-end" : "self-start"}`}>
                      <div
                        className={`px-3.5 py-2 rounded-2xl text-sm ${
                          m.from === "admin"
                            ? "bg-gradient-to-br from-orange-600 to-orange-900 text-orange-50 rounded-br-sm"
                            : `${t.bubbleContact} rounded-bl-sm`
                        }`}
                      >
                        {m.text}
                      </div>
                      <div className={`text-[11px] mt-1 ${t.textMuted} ${m.from === "admin" ? "text-right" : "text-left"}`}>{formatWIB(m.time)}</div>
                    </div>
                  ))}
                </div>

                <div className={`px-5 py-3.5 border-t ${t.divider}`}>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {["Terima kasih ya kak!", "Boleh cek DM ya", "Ditunggu kabarnya"].map((tpl) => (
                      <button
                        key={tpl}
                        onClick={() => setReply(tpl)}
                        className={`px-2.5 py-1 rounded-full border text-xs ${t.divider} ${t.textMuted}`}
                      >
                        {tpl}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-end gap-2">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder={selected.type === "dm" ? s.replyPlaceholderDm : s.replyPlaceholderComment}
                      rows={2}
                      className={`flex-1 rounded-lg px-3 py-2 outline-none resize-none border ${t.input}`}
                    />
                    <button
                      onClick={sendReply}
                      className="h-9 px-3.5 rounded-lg bg-gradient-to-r from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 text-white flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" /> {s.send}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className={`flex-1 flex items-center justify-center ${t.textMuted}`}>{s.pickConversation}</div>
            )}
          </div>

          {/* Meta panel */}
          {selected && (
            <div className={`w-64 shrink-0 border-l p-4 ${t.panelBorder}`}>
              <div className={`text-xs mb-2 ${t.textMuted}`}>{s.assignedTo}</div>
              <div className="relative mb-5">
                <select
                  value={selected.assignedTo || ""}
                  onChange={(e) => claim(e.target.value)}
                  className={`w-full rounded-lg px-2.5 py-2 outline-none appearance-none border ${t.input}`}
                >
                  <option value="">{s.unassigned}</option>
                  {admins.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${t.textMuted}`} />
              </div>

              <div className={`text-xs mb-2 ${t.textMuted}`}>{s.engagementOnPost}</div>
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className={`rounded-lg px-2.5 py-2.5 border ${t.card}`}>
                  <div className={`flex items-center gap-1 text-xs mb-1 ${t.textMuted}`}><Heart className="w-3.5 h-3.5" /></div>
                  <div className={`font-medium ${t.textStrong}`}>{selected.likes}</div>
                </div>
                <div className={`rounded-lg px-2.5 py-2.5 border ${t.card}`}>
                  <div className={`flex items-center gap-1 text-xs mb-1 ${t.textMuted}`}><MessageCircle className="w-3.5 h-3.5" /></div>
                  <div className={`font-medium ${t.textStrong}`}>{selected.comments}</div>
                </div>
                <div className={`rounded-lg px-2.5 py-2.5 border ${t.card}`}>
                  <div className={`flex items-center gap-1 text-xs mb-1 ${t.textMuted}`}><Share2 className="w-3.5 h-3.5" /></div>
                  <div className={`font-medium ${t.textStrong}`}>{selected.shares}</div>
                </div>
              </div>

              <div className={`text-xs mb-2 ${t.textMuted}`}>{s.responseTime}</div>
              <div className={`rounded-lg px-3 py-2.5 flex items-center gap-2 border ${t.card}`}>
                <Clock className={`w-3.5 h-3.5 ${t.textMuted}`} />
                <span className={`text-xs ${t.textBody}`}>
                  {selected.status === "replied" ? s.alreadyReplied : s.waitingReply}
                </span>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------

function LandingPage({ onLogin, onSignup }) {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${apiUrl}/api/public-stats`)
      .then((res) => res.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const features = [
    { icon: LayoutGrid, title: "Unified inbox", desc: "Komen dan DM dari semua akun & platform digabung jadi satu tampilan." },
    { icon: Zap, title: "Real-time", desc: "Pesan baru langsung muncul lewat webhook, nggak perlu refresh manual." },
    { icon: TrendingUp, title: "Dashboard analitik", desc: "Pantau performa per akun dan per platform, plus konten terbaik." },
    { icon: Users, title: "Multi-admin", desc: "Bagi kerjaan ke beberapa admin, assign percakapan per orang." },
    { icon: Sparkles, title: "Ditenagai AI", desc: "Rekomendasi balasan pintar & deteksi prioritas otomatis. Segera hadir." },
    { icon: LayoutDashboard, title: "Satu login tim", desc: "Semua admin masuk lewat 1 kode akses, nggak perlu akun ribet." },
  ];

  const platforms = ["Instagram", "Threads", "Facebook", "TikTok", "YouTube", "LinkedIn"];

  const statCards = [
    { label: "Total percakapan", value: stats?.totalConversations },
    { label: "Sedang pending", value: stats?.totalPending },
    { label: "Total suka terkelola", value: stats?.totalLikes },
    { label: "Akun terhubung", value: stats?.totalAccounts },
  ];

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-black via-zinc-950 to-orange-950 text-zinc-200 overflow-x-hidden">
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .marquee-track { animation: marquee 22s linear infinite; }
      `}</style>

      <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="font-medium text-lg bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-transparent">
          Prof Admin
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onLogin}
            className="px-4 py-2 rounded-lg border border-orange-800 text-orange-300 hover:bg-orange-950 text-sm"
          >
            Masuk
          </button>
          <button
            onClick={onSignup}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 text-white text-sm flex items-center gap-1.5"
          >
            Daftar <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-16 pb-14 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-800 bg-orange-950 text-orange-300 text-xs mb-6">
          <Sparkles className="w-3 h-3" /> Tempatnya mesin cuan
        </div>
        <h1 className="text-4xl sm:text-5xl font-medium text-zinc-50 mb-4 leading-tight">
          Kelola jutaan <span className="bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-transparent">engagement</span> dari satu dashboard
        </h1>
        <p className="text-zinc-400 text-base mb-8 max-w-xl mx-auto">
          Semua komentar dan DM dari puluhan akun media sosial, digabung jadi satu inbox yang gampang dikelola tim admin lu.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onSignup}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 text-white font-medium inline-flex items-center gap-2"
          >
            Daftar Gratis <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onLogin}
            className="px-6 py-3 rounded-lg border border-orange-800 text-orange-300 hover:bg-orange-950 font-medium"
          >
            Sudah punya akun? Masuk
          </button>
        </div>
      </div>

      {/* Running text ticker */}
      <div className="border-y border-orange-950/50 bg-black/40 py-3 overflow-hidden mb-14">
        <div className="flex whitespace-nowrap marquee-track">
          {[0, 1].map((rep) => (
            <div key={rep} className="flex items-center shrink-0">
              {[...platforms, "Real-time", "Multi-admin", "Dashboard analitik", "Ditenagai AI"].map((item, i) => (
                <span key={`${rep}-${i}`} className="flex items-center gap-2 mx-4 text-sm text-zinc-400">
                  <span className="w-1 h-1 rounded-full bg-orange-500" /> {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Live stats */}
      <div className="max-w-5xl mx-auto px-6 mb-16">
        <div className="text-center mb-6">
          <div className={`inline-flex items-center gap-1.5 text-xs text-orange-400`}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
            </span>
            Data live dari dashboard yang lagi jalan
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-orange-950/40 bg-zinc-900/60 p-4 text-center">
              <div className="text-2xl sm:text-3xl font-medium bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-transparent">
                {value != null ? value.toLocaleString() : "–"}
              </div>
              <div className="text-zinc-500 text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-orange-950/40 bg-zinc-900/60 p-5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-600 to-orange-900 flex items-center justify-center mb-3">
              <Icon className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="text-zinc-100 font-medium mb-1">{title}</div>
            <div className="text-zinc-500 text-sm">{desc}</div>
          </div>
        ))}
      </div>

      {/* Supported platforms */}
      <div className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="text-zinc-100 font-medium mb-1">Connect media sosial apa aja?</div>
        <div className="text-zinc-500 text-sm mb-6">Satu dashboard buat semua akun bisnis lu.</div>
        <div className="flex flex-wrap justify-center gap-2">
          {platforms.map((p) => (
            <span key={p} className="px-3.5 py-1.5 rounded-full border border-orange-800 bg-orange-950/60 text-orange-300 text-sm">
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sign up page — creates a real user account (email + password + their own
// Repliz keys). Fase 1 only: doesn't personalize the dashboard data yet.
// ---------------------------------------------------------------------------

function SignupPage({ onDone, onBackToLanding, apiUrl }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.email.trim() || !form.password) {
      setError("Email dan password wajib diisi");
      return;
    }
    if (form.password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }
    setLoading(true);
    fetch(`${apiUrl}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || "Gagal mendaftar");
        setDone(true);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  if (done) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-black via-zinc-950 to-orange-950 text-zinc-200 flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-orange-900 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div className="text-zinc-100 font-medium mb-2">Akun berhasil dibuat!</div>
          <p className="text-zinc-500 text-sm mb-6">
            Login pakai email & password lu di tab "Akun Saya". Nanti di dalam, buka <b>Pengaturan</b> buat hubungin akun Repliz lu.
          </p>
          <button
            onClick={onDone}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 text-white font-medium"
          >
            Ke halaman Masuk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-black via-zinc-950 to-orange-950 text-zinc-200 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="font-medium text-lg bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-transparent">
            Daftar Prof Admin
          </div>
          <div className="text-zinc-500 text-xs mt-1">Gratis, isi data akun lu di bawah</div>
        </div>

        <form onSubmit={submit} className="rounded-xl border border-orange-950/40 bg-zinc-900/60 p-5 flex flex-col gap-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="kamu@email.com"
              autoFocus
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 placeholder-zinc-600 outline-none focus:border-orange-700"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 placeholder-zinc-600 outline-none focus:border-orange-700"
            />
          </div>
          {error && <div className="text-red-400 text-xs">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 text-white font-medium disabled:opacity-60 mt-1"
          >
            {loading ? "Mendaftar..." : "Daftar"}
          </button>
        </form>

        <button onClick={onBackToLanding} className="w-full text-center text-zinc-500 text-xs mt-4 hover:text-zinc-300">
          Sudah punya akun? Masuk
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------

function LoginPage({ onLogin, onPersonalLogin, onSignup, apiUrl }) {
  const [tab, setTab] = useState("personal"); // "personal" | "team"
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function submitTeamCode(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    fetch(`${apiUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Kode akses salah");
        return res.json();
      })
      .then(() => onLogin())
      .catch((err) => setError(err.message || "Gagal login"))
      .finally(() => setLoading(false));
  }

  function submitPersonal(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    fetch(`${apiUrl}/api/user-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || "Gagal login");
        return body;
      })
      .then((body) => onPersonalLogin(body.userId, body.email))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-black via-zinc-950 to-orange-950 text-zinc-200 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-orange-900 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div className="font-medium text-lg bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-transparent">
            Prof Admin
          </div>
        </div>

        <div className="flex rounded-lg border border-orange-950/40 bg-zinc-900/60 p-1 mb-4">
          <button
            onClick={() => setTab("personal")}
            className={`flex-1 py-1.5 rounded-md text-xs ${tab === "personal" ? "bg-gradient-to-r from-orange-600 to-orange-800 text-white" : "text-zinc-400"}`}
          >
            Akun Saya
          </button>
          <button
            onClick={() => setTab("team")}
            className={`flex-1 py-1.5 rounded-md text-xs ${tab === "team" ? "bg-gradient-to-r from-orange-600 to-orange-800 text-white" : "text-zinc-400"}`}
          >
            Kode Tim
          </button>
        </div>

        {tab === "personal" ? (
          <form onSubmit={submitPersonal} className="rounded-xl border border-orange-950/40 bg-zinc-900/60 p-5 flex flex-col gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                autoFocus
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 placeholder-zinc-600 outline-none focus:border-orange-700"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 placeholder-zinc-600 outline-none focus:border-orange-700"
              />
            </div>
            {error && <div className="text-red-400 text-xs">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 text-white font-medium disabled:opacity-60"
            >
              {loading ? "Memeriksa..." : "Masuk"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitTeamCode} className="rounded-xl border border-orange-950/40 bg-zinc-900/60 p-5">
            <label className="text-xs text-zinc-500 mb-1.5 block">Kode akses tim</label>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 placeholder-zinc-600 outline-none focus:border-orange-700 mb-3"
            />
            {error && <div className="text-red-400 text-xs mb-3">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 text-white font-medium disabled:opacity-60"
            >
              {loading ? "Memeriksa..." : "Masuk"}
            </button>
          </form>
        )}

        <button onClick={onSignup} className="w-full text-center text-zinc-500 text-xs mt-4 hover:text-zinc-300">
          Belum punya akun? Daftar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top-level router: Landing -> Login -> Dashboard
// ---------------------------------------------------------------------------

export default function App() {
  const [stage, setStage] = useState(() => {
    const mode = localStorage.getItem("profadmin_mode");
    return mode === "team" || mode === "personal" ? "dashboard" : "landing";
  });
  const [userId, setUserId] = useState(() => {
    if (localStorage.getItem("profadmin_mode") !== "personal") return null;
    const saved = localStorage.getItem("profadmin_user_id");
    return saved ? Number(saved) : null;
  });
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";

  function handleLogin() {
    localStorage.setItem("profadmin_mode", "team");
    localStorage.removeItem("profadmin_user_id");
    setUserId(null);
    setStage("dashboard");
  }

  function handlePersonalLogin(id) {
    localStorage.setItem("profadmin_mode", "personal");
    localStorage.setItem("profadmin_user_id", String(id));
    setUserId(id);
    setStage("dashboard");
  }

  function handleLogout() {
    localStorage.removeItem("profadmin_mode");
    localStorage.removeItem("profadmin_auth"); // old flag, in case it's still around from before
    localStorage.removeItem("profadmin_user_id");
    setUserId(null);
    setStage("landing");
  }

  if (stage === "landing") return <LandingPage onLogin={() => setStage("login")} onSignup={() => setStage("signup")} />;
  if (stage === "signup")
    return <SignupPage onDone={() => setStage("login")} onBackToLanding={() => setStage("login")} apiUrl={apiUrl} />;
  if (stage === "login")
    return <LoginPage onLogin={handleLogin} onPersonalLogin={handlePersonalLogin} onSignup={() => setStage("signup")} apiUrl={apiUrl} />;
  return <Dashboard onLogout={handleLogout} userId={userId} />;
}
