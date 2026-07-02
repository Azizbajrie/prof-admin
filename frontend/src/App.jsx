import { useState, useMemo, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import {
  Search, MessageCircle, Mail, Heart, Share2, Clock, Send,
  LayoutDashboard, Inbox, Users, Settings, ChevronDown,
  CircleCheck, CircleDot, AtSign, Image as ImageIcon,
  TrendingUp, Trophy, Globe, Moon, Sun, CheckCircle2, AlertTriangle, UserPlus, X,
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
    summaryToday: "Ringkasan hari ini", unassignedLabel: "Belum ditugaskan",
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
    periodToday: "Hari ini", periodWeek: "Minggu ini", periodMonth: "Bulan ini",
    totalComments: "Total komentar", totalDms: "Total DM", totalLikes: "Total suka", totalShares: "Total dibagikan",
    perAccount: "Performa per akun", perPlatform: "Performa per platform", bestContent: "Konten performa terbaik",
    conversations: "percakapan",
    accountsTitle: "Akun terintegrasi", accountsSub: "akun terhubung ke Prof Admin", connected: "Terhubung", needsAttention: "Perlu perhatian",
    settingsTitle: "Pengaturan", settingsSub: "Sesuaikan bahasa dan tampilan dashboard",
    language: "Bahasa", theme: "Tampilan", dark: "Gelap", light: "Terang", indonesian: "Indonesia", english: "English",
    adminList: "Daftar admin", adminAdd: "Tambah admin", adminPlaceholder: "Nama admin baru...",
    adminEmpty: "Belum ada admin, tambahin dulu di atas.",
    demoWarning: "Nggak bisa konek ke server Repliz — nampilin data contoh dulu.",
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
    summaryToday: "Today's summary", unassignedLabel: "Unassigned",
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
    periodToday: "Today", periodWeek: "This week", periodMonth: "This month",
    totalComments: "Total comments", totalDms: "Total DMs", totalLikes: "Total likes", totalShares: "Total shares",
    perAccount: "Performance per account", perPlatform: "Performance per platform", bestContent: "Best performing content",
    conversations: "conversations",
    accountsTitle: "Integrated accounts", accountsSub: "accounts connected to Prof Admin", connected: "Connected", needsAttention: "Needs attention",
    settingsTitle: "Settings", settingsSub: "Adjust the dashboard's language and appearance",
    language: "Language", theme: "Appearance", dark: "Dark", light: "Light", indonesian: "Indonesia", english: "English",
    adminList: "Admin list", adminAdd: "Add admin", adminPlaceholder: "New admin name...",
    adminEmpty: "No admins yet, add one above.",
    demoWarning: "Can't reach the Repliz server — showing sample data instead.",
    replyFailed: "Failed to send the reply to Repliz. Try again in a moment.",
    noPostDm: "This is a direct message, not tied to a specific post.",
    loadingThread: "Loading conversation...",
  },
};

function platformLabel(p) { return p === "instagram" ? "Instagram" : "Threads"; }
function platformChip(p, t) { return p === "instagram" ? t.chipInstagram : t.chipThreads; }

function TypeIcon({ type, className }) {
  return type === "dm" ? <Mail className={className} /> : <MessageCircle className={className} />;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

// Backend URL — set VITE_API_URL in Vercel once the backend is deployed on Railway.
// Falls back to localhost so local testing still works without extra setup.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ProfAdmin() {
  const [themeMode, setThemeMode] = useState("dark");
  const [lang, setLang] = useState("id");
  const t = THEMES[themeMode];
  const s = STRINGS[lang];

  const [view, setView] = useState("inbox");

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
  const [period, setPeriod] = useState("today");
  const [admins, setAdmins] = useState(DEFAULT_ADMINS);
  const [newAdminName, setNewAdminName] = useState("");

  // Load the inbox once on mount, then keep it live via WebSocket.
  useEffect(() => {
    fetch(`${API_URL}/api/inbox`)
      .then((res) => res.json())
      .then((docs) => {
        setData(docs);
        setConnectionError(false);
        if (docs.length) setSelectedId((cur) => cur ?? docs[0].id);
      })
      .catch(() => {
        setConnectionError(true);
        setData(CONVERSATIONS);
        setSelectedId(CONVERSATIONS[0].id);
      });

    const socket = io(API_URL);
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
  }, []);

  function addAdmin() {
    const name = newAdminName.trim();
    if (!name || admins.includes(name)) return;
    setNewAdminName("");
    setAdmins((prev) => [...prev, name]); // optimistic, socket will confirm
    fetch(`${API_URL}/api/admins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => {});
  }

  function removeAdmin(name) {
    setAdmins((prev) => prev.filter((a) => a !== name)); // optimistic
    setData((prev) => prev.map((c) => (c.assignedTo === name ? { ...c, assignedTo: null } : c)));
    fetch(`${API_URL}/api/admins/${encodeURIComponent(name)}`, { method: "DELETE" }).catch(() => {});
  }

  const accountNames = useMemo(() => Array.from(new Set(data.map((c) => c.account))), [data]);

  const filtered = useMemo(() => {
    return data.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (accountFilter !== "all" && c.account !== accountFilter) return false;
      if (platformFilter !== "all" && c.platform !== platformFilter) return false;
      if (query && !(`${c.contact} ${c.preview} ${c.account}`.toLowerCase().includes(query.toLowerCase()))) return false;
      return true;
    });
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
    fetch(`${API_URL}/api/inbox/${encodeURIComponent(selected.id)}`)
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
    fetch(`${API_URL}/api/inbox/${encodeURIComponent(selected.id)}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const detail = typeof body.detail === "string" ? body.detail : body.detail?.message || JSON.stringify(body.detail || "");
          throw new Error(detail || body.message || "failed");
        }
      })
      .catch((err) => setReplyError(`${s.replyFailed} ${err.message ? `(${err.message})` : ""}`));
  }

  function claim(adminName) {
    if (!selected) return;
    setData((prev) => prev.map((c) => (c.id === selected.id ? { ...c, assignedTo: adminName || null } : c)));
    fetch(`${API_URL}/api/inbox/${encodeURIComponent(selected.id)}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminName: adminName || null }),
    }).catch(() => setConnectionError(true));
  }

  // --- Dashboard aggregates ---
  const totals = useMemo(() => {
    const commentCount = data.filter((c) => c.type === "comment").length;
    const dmCount = data.filter((c) => c.type === "dm").length;
    const likes = data.reduce((sum, c) => sum + c.likes, 0);
    const shares = data.reduce((sum, c) => sum + c.shares, 0);
    return { commentCount, dmCount, likes, shares };
  }, [data]);

  const perAccount = useMemo(() => {
    const map = new Map();
    data.forEach((c) => {
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
  }, [data]);

  const perPlatform = useMemo(() => {
    const map = new Map();
    data.forEach((c) => {
      const cur = map.get(c.platform) || { platform: c.platform, count: 0, likes: 0, comments: 0, shares: 0 };
      cur.count += 1;
      cur.likes += c.likes;
      cur.comments += c.comments;
      cur.shares += c.shares;
      map.set(c.platform, cur);
    });
    return Array.from(map.values());
  }, [data]);

  const bestContent = useMemo(
    () => [...data].sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares)).slice(0, 3),
    [data]
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
        <div className="w-full bg-amber-900/60 border-b border-amber-700 text-amber-200 text-xs px-4 py-2 flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {s.demoWarning}
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
                { key: "today", label: s.periodToday },
                { key: "week", label: s.periodWeek },
                { key: "month", label: s.periodMonth },
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

          <div className="grid grid-cols-2 gap-4 mb-5">
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
              <div className={`text-xs mb-3 flex items-center gap-1.5 ${t.textMuted}`}>
                <TrendingUp className="w-3.5 h-3.5" /> {s.perPlatform}
              </div>
              <div className="flex flex-col gap-2.5">
                {perPlatform.map((p) => (
                  <div key={p.platform} className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] ${platformChip(p.platform, t)}`}>
                      {platformLabel(p.platform)}
                    </span>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="flex items-center gap-1 text-pink-400"><Heart className="w-3 h-3" />{p.likes}</span>
                      <span className="flex items-center gap-1 text-orange-400"><MessageCircle className="w-3 h-3" />{p.comments}</span>
                      <span className="flex items-center gap-1 text-amber-400"><Share2 className="w-3 h-3" />{p.shares}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${t.card}`}>
            <div className={`text-xs mb-3 flex items-center gap-1.5 ${t.textMuted}`}>
              <Trophy className="w-3.5 h-3.5 text-orange-400" /> {s.bestContent}
            </div>
            <div className="flex flex-col gap-2.5">
              {bestContent.map((c, i) => (
                <div key={c.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${t.cardMuted}`}>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-800 flex items-center justify-center text-white text-xs font-medium shrink-0">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate ${t.textBody}`}>{c.post.caption}</div>
                    <div className={`text-[11px] ${t.textMuted}`}>{c.account} · {platformLabel(c.platform)}</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <span className="flex items-center gap-1 text-pink-400"><Heart className="w-3 h-3" />{c.likes}</span>
                    <span className="flex items-center gap-1 text-orange-400"><MessageCircle className="w-3 h-3" />{c.comments}</span>
                    <span className="flex items-center gap-1 text-amber-400"><Share2 className="w-3 h-3" />{c.shares}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- ACCOUNTS VIEW ---------------- */}
      {view === "accounts" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className={`text-lg font-medium ${t.textStrong}`}>{s.accountsTitle}</div>
          <div className={`text-xs mt-0.5 mb-5 ${t.textMuted}`}>{ACCOUNT_INTEGRATIONS.length} {s.accountsSub}</div>
          <div className="grid grid-cols-3 gap-3">
            {ACCOUNT_INTEGRATIONS.map((acc, i) => (
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
                {acc.status === "connected" ? (
                  <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" title={s.connected} />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" title={s.needsAttention} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- SETTINGS VIEW ---------------- */}
      {view === "settings" && (
        <div className="flex-1 overflow-y-auto p-6 max-w-lg">
          <div className={`text-lg font-medium ${t.textStrong}`}>{s.settingsTitle}</div>
          <div className={`text-xs mt-0.5 mb-6 ${t.textMuted}`}>{s.settingsSub}</div>

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
                          <span className={`text-xs shrink-0 ${t.textMuted}`}>{c.time}</span>
                        </div>
                        <div className={`text-xs truncate mb-1.5 ${t.textMuted}`}>via {c.account}</div>
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
                      <div className={`text-[11px] mt-1 ${t.textMuted} ${m.from === "admin" ? "text-right" : "text-left"}`}>{m.time}</div>
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
