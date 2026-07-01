import { useState, useMemo } from "react";
import {
  Search, MessageCircle, Mail, Heart, Share2, Clock, Send,
  LayoutDashboard, Inbox, Users, BarChart3, Settings, ChevronDown,
  CircleCheck, CircleDot, AtSign, Image as ImageIcon
} from "lucide-react";

const ACCOUNTS = ["catatan.putri", "rutinitas.diana", "ruang.andika", "latif.titiktemu", "KitabPedia", "Fairus Ali Bajry"];
const ADMINS = ["Aziz", "Nadia", "Dimas"];

const CONVERSATIONS = [
  {
    id: 1, account: "catatan.putri", platform: "instagram", type: "comment", status: "pending",
    contact: "rifky.rifky.kiky", preview: "Sitik efek cuaca panas iki, tapi tetep semangat kak!",
    time: "14:20", unread: true, assignedTo: null, likes: 8, shares: 0,
    post: { caption: "Cerita rutinitas pagi di tengah cuaca panas Jakarta minggu ini", stat: "312 suka - 41 komentar" },
    thread: [{ from: "contact", text: "Sitik efek cuaca panas iki, tapi tetep semangat kak!", time: "14:20" }],
  },
  {
    id: 2, account: "rutinitas.diana", platform: "threads", type: "dm", status: "pending",
    contact: "andri.ristiawan", preview: "Sepakat bang, kapan bisa mulai kerja sama?",
    time: "14:13", unread: true, assignedTo: "Nadia", likes: 0, shares: 0,
    post: { caption: "Open kolaborasi konten untuk brand lokal, DM untuk detail", stat: "89 suka - 19 komentar" },
    thread: [
      { from: "contact", text: "Halo kak, saya tertarik sama kontennya", time: "13:50" },
      { from: "contact", text: "Sepakat bang, kapan bisa mulai kerja sama?", time: "14:13" },
    ],
  },
  {
    id: 3, account: "ruang.andika", platform: "instagram", type: "comment", status: "replied",
    contact: "peskeong", preview: "Ga tp aku abis lari kak, pegel semua badan",
    time: "14:05", unread: false, assignedTo: "Aziz", likes: 22, shares: 1,
    post: { caption: "Tips lari pagi 5K buat pemula biar nggak gampang capek", stat: "654 suka - 88 komentar" },
    thread: [
      { from: "contact", text: "Ga tp aku abis lari kak, pegel semua badan", time: "14:05" },
      { from: "admin", text: "Semangat kak, istirahat yang cukup ya!", time: "14:09" },
    ],
  },
  {
    id: 4, account: "latif.titiktemu", platform: "threads", type: "dm", status: "pending",
    contact: "jasrotia3479", preview: "Dear souls, How much of...",
    time: "13:32", unread: true, assignedTo: null, likes: 0, shares: 0,
    post: { caption: "Refleksi tentang waktu layar dan kehidupan digital", stat: "204 suka - 37 komentar" },
    thread: [{ from: "contact", text: "Dear souls, How much of your day is spent online?", time: "13:32" }],
  },
  {
    id: 5, account: "KitabPedia", platform: "threads", type: "comment", status: "pending",
    contact: "possatpam555", preview: "gede ya ka.... gunung yang di foto itu",
    time: "13:24", unread: false, assignedTo: "Dimas", likes: 45, shares: 6,
    post: { caption: "Foto pendakian gunung Semeru, rekomendasi jalur untuk pemula", stat: "1.2rb suka - 156 komentar" },
    thread: [{ from: "contact", text: "gede ya ka.... gunung yang di foto itu", time: "13:24" }],
  },
  {
    id: 6, account: "Fairus Ali Bajry", platform: "instagram", type: "dm", status: "replied",
    contact: "shandy_ackerman", preview: "Oke siap kak, ditunggu infonya", time: "12:58",
    unread: false, assignedTo: "Aziz", likes: 0, shares: 0,
    post: { caption: "Rezeki paling mahal: peluncuran produk baru minggu ini", stat: "410 suka - 62 komentar" },
    thread: [
      { from: "contact", text: "Kak boleh minta info produknya?", time: "12:40" },
      { from: "admin", text: "Boleh kak, saya kirim ke DM ya", time: "12:50" },
      { from: "contact", text: "Oke siap kak, ditunggu infonya", time: "12:58" },
    ],
  },
  {
    id: 7, account: "catatan.putri", platform: "threads", type: "comment", status: "pending",
    contact: "rara915012", preview: "Yg pntg g spot nya aj", time: "13:30",
    unread: true, assignedTo: null, likes: 3, shares: 0,
    post: { caption: "Rekomendasi tempat healing akhir pekan di sekitar kota", stat: "178 suka - 25 komentar" },
    thread: [{ from: "contact", text: "Yg pntg g spot nya aj", time: "13:30" }],
  },
];

const PLATFORM_STYLE = {
  instagram: { label: "Instagram", chip: "bg-pink-950 text-pink-300 border-pink-800" },
  threads: { label: "Threads", chip: "bg-slate-800 text-slate-300 border-slate-600" },
};

function TypeIcon({ type, className }) {
  return type === "dm" ? <Mail className={className} /> : <MessageCircle className={className} />;
}

function timeAgo(t) {
  return t;
}

export default function UnifiedInboxDashboard() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(CONVERSATIONS[0].id);
  const [reply, setReply] = useState("");
  const [data, setData] = useState(CONVERSATIONS);
  const [showPost, setShowPost] = useState(true);

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

  const pendingCount = data.filter((c) => c.status === "pending").length;
  const repliedTodayCount = data.filter((c) => c.status === "replied").length;
  const unassignedCount = data.filter((c) => !c.assignedTo).length;

  function sendReply() {
    if (!reply.trim() || !selected) return;
    setData((prev) =>
      prev.map((c) =>
        c.id === selected.id
          ? { ...c, status: "replied", unread: false, thread: [...c.thread, { from: "admin", text: reply.trim(), time: "now" }] }
          : c
      )
    );
    setReply("");
  }

  function claim(adminName) {
    if (!selected) return;
    setData((prev) => prev.map((c) => (c.id === selected.id ? { ...c, assignedTo: adminName } : c)));
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-black via-zinc-950 to-orange-950 text-zinc-200 flex text-sm">
      {/* Sidebar */}
      <div className="w-56 shrink-0 bg-gradient-to-b from-zinc-900 to-black border-r border-orange-950 flex flex-col py-5 px-3 gap-1">
        <div className="px-2 mb-6">
          <div className="font-medium text-base bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-transparent">Prof Admin</div>
          <div className="text-zinc-500 text-xs mt-0.5">Kelola jutaan engagement-mu</div>
        </div>
        {[
          { icon: LayoutDashboard, label: "Dashboard" },
          { icon: Inbox, label: "Unified inbox", active: true },
          { icon: Users, label: "Akun" },
          { icon: BarChart3, label: "Laporan" },
          { icon: Settings, label: "Pengaturan" },
        ].map(({ icon: Icon, label, active }) => (
          <div
            key={label}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer ${
              active ? "bg-gradient-to-r from-orange-700 to-orange-950 text-orange-100" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </div>
        ))}

        <div className="mt-auto px-2 pt-4 border-t border-zinc-800">
          <div className="text-zinc-500 text-xs mb-2">Ringkasan hari ini</div>
          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-400">Pending</span>
            <span className="text-amber-400 font-medium">{pendingCount}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-400">Terbalas</span>
            <span className="text-orange-400 font-medium">{repliedTodayCount}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-400">Belum ditugaskan</span>
            <span className="text-zinc-200 font-medium">{unassignedCount}</span>
          </div>
        </div>
      </div>

      {/* Inbox list */}
      <div className="w-80 shrink-0 border-r border-orange-950/40 flex flex-col">
        <div className="p-3 border-b border-zinc-800">
          <div className="relative mb-2.5">
            <Search className="w-4 h-4 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kontak, akun, isi pesan"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-zinc-200 placeholder-zinc-500 outline-none focus:border-orange-700"
            />
          </div>
          <div className="flex gap-1.5 mb-2">
            {[
              { key: "all", label: "Semua" },
              { key: "comment", label: "Komen" },
              { key: "dm", label: "DM" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={`px-2.5 py-1 rounded-full border text-xs ${
                  typeFilter === f.key
                    ? "bg-orange-950 border-orange-800 text-orange-300"
                    : "bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                {f.label}
              </button>
            ))}
            <div className="flex-1" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-full px-2 py-1 text-xs text-zinc-400 outline-none"
            >
              <option value="all">Semua status</option>
              <option value="pending">Pending</option>
              <option value="replied">Terbalas</option>
            </select>
          </div>
          <div className="flex gap-1.5">
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-orange-700"
            >
              <option value="all">Semua akun</option>
              {ACCOUNTS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-28 shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-orange-700"
            >
              <option value="all">Semua platform</option>
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
                className={`px-3 py-3 border-b border-zinc-900 cursor-pointer ${
                  isActive ? "bg-gradient-to-r from-orange-950 to-zinc-900" : "hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs shrink-0">
                    {c.contact.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate ${c.unread ? "text-zinc-100 font-medium" : "text-zinc-300"}`}>
                        {c.contact}
                      </span>
                      <span className="text-zinc-500 text-xs shrink-0">{timeAgo(c.time)}</span>
                    </div>
                    <div className="text-zinc-500 text-xs truncate mb-1.5">via {c.account}</div>
                    <div className={`text-xs truncate ${c.unread ? "text-zinc-300" : "text-zinc-500"}`}>{c.preview}</div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] ${PLATFORM_STYLE[c.platform].chip}`}>
                        {PLATFORM_STYLE[c.platform].label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-zinc-500 text-[11px]">
                        <TypeIcon type={c.type} className="w-3 h-3" />
                        {c.type === "dm" ? "DM" : "Komen"}
                      </span>
                      {c.unread && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 ml-auto" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-zinc-500 text-xs px-4 py-8 text-center">Tidak ada percakapan yang cocok.</div>
          )}
        </div>
      </div>

      {/* Conversation detail */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <div className="text-zinc-100 font-medium">{selected.contact}</div>
                <div className="text-zinc-500 text-xs mt-0.5 flex items-center gap-1.5">
                  <AtSign className="w-3 h-3" /> membalas sebagai {selected.account}
                  <span className={`ml-1 px-1.5 py-0.5 rounded border text-[11px] ${PLATFORM_STYLE[selected.platform].chip}`}>
                    {PLATFORM_STYLE[selected.platform].label}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-zinc-400 text-xs">
                {selected.status === "replied" ? (
                  <span className="inline-flex items-center gap-1 text-orange-400"><CircleCheck className="w-3.5 h-3.5" /> Terbalas</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400"><CircleDot className="w-3.5 h-3.5" /> Pending</span>
                )}
              </div>
            </div>

            <div className="mx-5 mt-4 border border-orange-950/40 bg-zinc-900/60 rounded-xl overflow-hidden shrink-0">
              <button
                onClick={() => setShowPost(!showPost)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-left"
              >
                <span className="flex items-center gap-2 text-zinc-300 text-xs">
                  <ImageIcon className="w-3.5 h-3.5 text-orange-400" /> Postingan asli yang dikomentari
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${showPost ? "rotate-180" : ""}`} />
              </button>
              {showPost && (
                <div className="px-3.5 pb-3.5 flex gap-3">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-orange-700 to-zinc-800 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5 text-orange-200" />
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <div className="text-zinc-300 text-xs mb-1">{selected.post.caption}</div>
                    <div className="text-zinc-500 text-[11px]">{selected.post.stat}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {selected.thread.map((m, i) => (
                <div key={i} className={`max-w-md ${m.from === "admin" ? "self-end" : "self-start"}`}>
                  <div
                    className={`px-3.5 py-2 rounded-2xl text-sm ${
                      m.from === "admin"
                        ? "bg-gradient-to-br from-orange-600 to-orange-900 text-orange-50 rounded-br-sm"
                        : "bg-zinc-800 text-zinc-200 rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                  <div className={`text-[11px] text-zinc-600 mt-1 ${m.from === "admin" ? "text-right" : "text-left"}`}>{m.time}</div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3.5 border-t border-zinc-800">
              <div className="flex gap-2 mb-2 flex-wrap">
                {["Terima kasih ya kak!", "Boleh cek DM ya", "Ditunggu kabarnya"].map((tpl) => (
                  <button
                    key={tpl}
                    onClick={() => setReply(tpl)}
                    className="px-2.5 py-1 rounded-full border border-zinc-800 text-zinc-400 text-xs hover:border-zinc-700 hover:text-zinc-200"
                  >
                    {tpl}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={`Balas ${selected.type === "dm" ? "DM" : "komentar"} ini...`}
                  rows={2}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-500 outline-none focus:border-orange-700 resize-none"
                />
                <button
                  onClick={sendReply}
                  className="h-9 px-3.5 rounded-lg bg-gradient-to-r from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 text-white flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" /> Kirim
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-600">Pilih percakapan di sebelah kiri</div>
        )}
      </div>

      {/* Meta panel */}
      {selected && (
        <div className="w-64 shrink-0 border-l border-orange-950/40 p-4">
          <div className="text-zinc-500 text-xs mb-2">Ditugaskan ke</div>
          <div className="relative mb-5">
            <select
              value={selected.assignedTo || ""}
              onChange={(e) => claim(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-zinc-200 outline-none appearance-none focus:border-orange-700"
            >
              <option value="">Belum ditugaskan</option>
              {ADMINS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="text-zinc-500 text-xs mb-2">Engagement pada konten asal</div>
          <div className="grid grid-cols-2 gap-2 mb-5">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1"><Heart className="w-3.5 h-3.5" /> Suka</div>
              <div className="text-zinc-100 font-medium">{selected.likes}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1"><Share2 className="w-3.5 h-3.5" /> Dibagikan</div>
              <div className="text-zinc-100 font-medium">{selected.shares}</div>
            </div>
          </div>

          <div className="text-zinc-500 text-xs mb-2">Waktu respon</div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-300 text-xs">
              {selected.status === "replied" ? "Sudah dibalas" : "Menunggu balasan"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
