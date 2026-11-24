// components/ProgramTimeline.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FiSearch,
  FiRefreshCw,
  FiX,
  FiCalendar,
  FiFolder,
  FiDollarSign,
  FiClock,
  FiMinimize2,
  FiMaximize2,
  FiExternalLink,
  FiFilter,
  FiInbox,
  FiAlertCircle,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import dataSheet from "../../api/dataSheetService";

// ==================== Konstanta & Helper ====================
const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const BULAN_SINGKAT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Mendukung data lama yang berisi nama bulan
const BULAN_MAP = {
  januari: 1,
  jan: 1,
  februari: 2,
  feb: 2,
  maret: 3,
  mar: 3,
  april: 4,
  apr: 4,
  mei: 5,
  juni: 6,
  jun: 6,
  juli: 7,
  jul: 7,
  agustus: 8,
  agu: 8,
  agt: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  oktober: 10,
  okt: 10,
  oct: 10,
  november: 11,
  nov: 11,
  desember: 12,
  des: 12,
  dec: 12,
};

// EST Levering = bulan ke-N sejak Januari tahun program.
// 1-12 = Jan-Des tahun program; >12 melompat ke tahun berikutnya (13 = Jan tahun+1).
const parseLevering = (value) => {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (BULAN_MAP[s]) return BULAN_MAP[s];
  const num = parseFloat(s.replace(",", "."));
  if (Number.isFinite(num) && num >= 1) return Math.round(num);
  return null;
};

const getSchedule = (program) => {
  const year = parseInt(String(program.tahun ?? "").trim(), 10);
  const m = parseLevering(program.estLevering);
  if (!year || !m) return null;
  const offset = Math.floor((m - 1) / 12);
  return { year: year + offset, month: ((m - 1) % 12) + 1, rolled: offset > 0 };
};

const formatCurrency = (amount) => {
  if (!amount || amount === "0") return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCurrencyShort = (amount) => {
  const num = parseFloat(amount) || 0;
  if (num === 0) return "Rp 0";
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)}M`;
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(1)}JT`;
  if (num >= 1_000) return `Rp ${(num / 1_000).toFixed(1)}RB`;
  return formatCurrency(num);
};

const STATUS_STYLE = {
  "Belum Dimulai": {
    bar: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600",
  },
  "On Progress": { bar: "bg-sky-500", badge: "bg-sky-100 text-sky-700" },
  Diskusi: { bar: "bg-violet-500", badge: "bg-violet-100 text-violet-700" },
  Lanjut: { bar: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-700" },
  Ditunda: { bar: "bg-amber-500", badge: "bg-amber-100 text-amber-700" },
  Selesai: { bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  Drop: { bar: "bg-red-500", badge: "bg-red-100 text-red-700" },
};
const DEFAULT_STATUS_STYLE = {
  bar: "bg-gray-300",
  badge: "bg-gray-100 text-gray-600",
};
const getStatusStyle = (status) => STATUS_STYLE[status] || DEFAULT_STATUS_STYLE;

const KATEGORI_BADGE = {
  Material: "bg-blue-100 text-blue-700",
  Jasa: "bg-purple-100 text-purple-700",
  "Material & Jasa": "bg-orange-100 text-orange-700",
};

const sortByNo = (a, b) =>
  String(a.no || "").localeCompare(String(b.no || ""), "id", { numeric: true });

const sumHarga = (list) =>
  list.reduce((sum, p) => sum + (parseFloat(p.hargaTotal) || 0), 0);

// ==================== Komponen kecil ====================
const TimelineTable = ({
  items,
  year,
  currentYear,
  currentMonth,
  compact,
  onSelect,
}) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200">
    <table className="w-full min-w-[1050px] table-fixed border-separate border-spacing-0 text-xs">
      <colgroup>
        <col style={{ width: 290 }} />
        {MONTHS.map((m) => (
          <col key={m} />
        ))}
      </colgroup>
      <thead>
        <tr className="bg-slate-100 text-slate-500">
          <th
            rowSpan={2}
            className="sticky left-0 z-20 bg-slate-100 px-4 text-left border-b border-r border-slate-200"
          >
            Program Kerja
          </th>
          {[1, 2, 3, 4].map((q) => (
            <th
              key={q}
              colSpan={3}
              className="py-2 border-b border-r border-slate-200 font-semibold"
            >
              Q{q}
            </th>
          ))}
        </tr>
        <tr>
          {MONTHS.map((m) => {
            const current = year === currentYear && m === currentMonth;
            return (
              <th
                key={m}
                className={`py-2 border-b border-r border-slate-200 ${current ? "bg-sky-100 text-sky-700" : "bg-slate-50 text-slate-600"}`}
              >
                {BULAN_SINGKAT[m - 1]}
                <span className="block text-[10px] font-normal">
                  {items.filter((p) => p._sched.month === m).length}
                </span>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {items.map((p, i) => (
          <tr key={`${p.no}-${i}`} className="group">
            <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-b border-r border-slate-200 px-3">
              <button
                type="button"
                onClick={() => onSelect(p)}
                title={p.programKerja}
                className={`block w-full text-left ${compact ? "py-2" : "py-3"}`}
              >
                {!compact && (
                  <span className="block truncate text-[10px] text-slate-400">
                    {p.no}
                  </span>
                )}
                <span className="block truncate font-medium text-slate-800 group-hover:text-sky-700">
                  {p.programKerja}
                </span>
              </button>
            </td>
            {MONTHS.map((m) => {
              const current = year === currentYear && m === currentMonth;
              return (
                <td
                  key={m}
                  className={`border-b border-r border-slate-100 text-center ${current ? "bg-sky-50" : i % 2 ? "bg-slate-50/60" : "bg-white"}`}
                >
                  {p._sched.month === m && (
                    <button
                      type="button"
                      onClick={() => onSelect(p)}
                      title={`${p.programKerja} — ${BULAN[m - 1]} ${year} — ${p.keterangan || "Belum Ada Status"}`}
                      aria-label={`${p.programKerja}, ${BULAN[m - 1]} ${year}`}
                      className={`mx-auto block h-4 w-4 rotate-45 rounded-[3px] ${getStatusStyle(p.keterangan).bar} hover:scale-125 transition-transform focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2`}
                    />
                  )}
                </td>
              );
            })}
          </tr>
        ))}
        {!items.length && (
          <tr>
            <td colSpan={13} className="py-8 text-center text-slate-400">
              Tidak ada program terjadwal
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const SkeletonTimeline = () => (
  <div className="space-y-4 animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-28 bg-gray-200 rounded-[22px]" />
      ))}
    </div>
    <div className="h-16 bg-gray-200 rounded-[22px]" />
    <div className="space-y-2">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="h-8 bg-gray-200 rounded-lg" />
      ))}
    </div>
  </div>
);

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

// ==================== Halaman utama ====================
const ProgramTimeline = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterBidang, setFilterBidang] = useState("all");
  const [filterKluster, setFilterKluster] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [compact, setCompact] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(null);

  const yearInitRef = useRef(false);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const loadPrograms = async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const data = await dataSheet.getAllData(!force);
      setPrograms(Array.isArray(data) ? data : []);
    } catch (e) {
      setError("Gagal memuat data: " + e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  // Default: langsung ke tahun berjalan bila ada jadwal di tahun itu
  useEffect(() => {
    if (yearInitRef.current || programs.length === 0) return;
    yearInitRef.current = true;
    const hasCurrent = programs.some((p) => {
      const s = getSchedule(p);
      return s && s.year === currentYear;
    });
    if (hasCurrent) setSelectedYear(currentYear);
  }, [programs, currentYear]);

  // Opsi filter
  const bidangOptions = useMemo(
    () =>
      [
        ...new Set(
          programs.map((p) => String(p.bidang || "").trim()).filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b, "id")),
    [programs],
  );
  const klusterOptions = useMemo(
    () =>
      [
        ...new Set(
          programs
            .map((p) => String(p.klusterProgram || "").trim())
            .filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b, "id")),
    [programs],
  );
  const statusOptions = useMemo(
    () => [
      ...new Set([
        ...Object.keys(STATUS_STYLE),
        ...programs
          .map((p) => String(p.keterangan || "").trim())
          .filter(Boolean),
      ]),
    ],
    [programs],
  );

  // Terapkan filter
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return programs.filter((p) => {
      if (
        filterBidang !== "all" &&
        String(p.bidang || "").trim() !== filterBidang
      )
        return false;
      if (
        filterKluster !== "all" &&
        String(p.klusterProgram || "").trim() !== filterKluster
      )
        return false;
      if (
        filterStatus !== "all" &&
        String(p.keterangan || "").trim() !== filterStatus
      )
        return false;
      if (term) {
        const hay = [
          p.no,
          p.programKerja,
          p.bidang,
          p.klusterProgram,
          p.aset,
          p.strategisRjpu,
          p.keterangan,
        ]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [programs, searchTerm, filterBidang, filterKluster, filterStatus]);

  // Kelompokkan: tahun -> bulan -> program
  const { byYear, unscheduled, yearList } = useMemo(() => {
    const byYear = {};
    const unscheduled = [];
    for (const p of filtered) {
      const s = getSchedule(p);
      if (!s) {
        unscheduled.push(p);
        continue;
      }
      if (!byYear[s.year]) byYear[s.year] = {};
      if (!byYear[s.year][s.month]) byYear[s.year][s.month] = [];
      byYear[s.year][s.month].push({ ...p, _sched: s });
    }
    for (const y of Object.keys(byYear)) {
      for (const m of Object.keys(byYear[y])) byYear[y][m].sort(sortByNo);
    }
    unscheduled.sort(sortByNo);

    const years = new Set(Object.keys(byYear).map(Number));
    for (const p of unscheduled) {
      const y = parseInt(String(p.tahun ?? "").trim(), 10);
      if (y) years.add(y);
    }
    return {
      byYear,
      unscheduled,
      yearList: [...years].sort((a, b) => a - b),
    };
  }, [filtered]);

  const visibleYears = selectedYear === "all" ? yearList : [selectedYear];

  const visibleUnscheduled = useMemo(
    () =>
      selectedYear === "all"
        ? unscheduled
        : unscheduled.filter(
            (p) => parseInt(String(p.tahun ?? "").trim(), 10) === selectedYear,
          ),
    [unscheduled, selectedYear],
  );

  // Statistik sesuai cakupan tampilan
  const stats = useMemo(() => {
    let scheduledCount = 0;
    let total = 0;
    for (const y of visibleYears) {
      for (const m of MONTHS) {
        const items = byYear[y]?.[m] || [];
        scheduledCount += items.length;
        total += sumHarga(items);
      }
    }
    total += sumHarga(visibleUnscheduled);
    return {
      scheduledCount,
      unscheduledCount: visibleUnscheduled.length,
      total,
      programCount: scheduledCount + visibleUnscheduled.length,
    };
  }, [byYear, visibleYears, visibleUnscheduled]);

  const hasActiveFilter =
    searchTerm ||
    filterBidang !== "all" ||
    filterKluster !== "all" ||
    filterStatus !== "all";

  const resetFilters = () => {
    setSearchTerm("");
    setFilterBidang("all");
    setFilterKluster("all");
    setFilterStatus("all");
  };

  const selectClass =
    "px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-400";

  const detailSched = selectedProgram ? getSchedule(selectedProgram) : null;

  // ==================== Render ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] p-0 text-slate-800">
        <SkeletonTimeline />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-0 text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-6 rounded-[26px] bg-[#101b34] px-5 py-6 md:px-7 md:py-7 shadow-[0_16px_38px_rgba(16,27,52,.13)]">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Timeline Program
          </h1>
          <p className="text-slate-300 mt-1">
            Jadwal target levering per bulan dan tahun • Klik penanda untuk
            detail
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setCompact((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white border border-white/20 rounded-2xl hover:bg-white/20 transition-all"
          >
            {compact ? <FiMaximize2 size={16} /> : <FiMinimize2 size={16} />}
            <span className="hidden sm:inline">
              {compact ? "Tampilkan Nomor" : "Sembunyikan Nomor"}
            </span>
          </button>
          <button
            onClick={() => loadPrograms(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white border border-white/20 rounded-2xl hover:bg-white/20 transition-all disabled:opacity-50"
          >
            <FiRefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline">Muat Ulang</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      {/* Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Program",
            value: stats.programCount,
            hint:
              selectedYear === "all" ? "Semua tahun" : `Tahun ${selectedYear}`,
            icon: FiFolder,
            iconBg: "from-sky-500 to-blue-600",
            valueColor: "text-sky-700",
          },
          {
            label: "Terjadwal",
            value: stats.scheduledCount,
            hint: "Punya estimasi levering",
            icon: FiCalendar,
            iconBg: "from-indigo-500 to-violet-600",
            valueColor: "text-purple-600",
          },
          {
            label: "Belum Dijadwalkan",
            value: stats.unscheduledCount,
            hint: "EST Levering kosong",
            icon: FiClock,
            iconBg: "from-amber-500 to-orange-500",
            valueColor: "text-orange-600",
          },
          {
            label: "Total Anggaran",
            value: formatCurrencyShort(stats.total),
            hint: "Material + Jasa",
            icon: FiDollarSign,
            iconBg: "from-[#0f766e] to-[#0d9488]",
            valueColor: "text-emerald-600",
          },
        ].map((c) => (
          <motion.div
            key={c.label}
            whileHover={{ y: -4 }}
            className="relative bg-white rounded-[22px] border border-slate-200/80 shadow-[0_4px_24px_rgba(15,23,42,0.035)] overflow-hidden"
          >
            <div className="p-3 md:p-4">
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`p-3 rounded-2xl bg-gradient-to-br ${c.iconBg} shadow-lg`}
                >
                  <c.icon className="text-white text-xl" />
                </div>
                <div
                  className={`text-xl md:text-2xl font-bold text-right ${c.valueColor}`}
                >
                  {c.value}
                </div>
              </div>
              <h3 className="text-slate-700 font-semibold mb-1">{c.label}</h3>
              <p className="text-xs text-slate-400">{c.hint}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(15,23,42,0.035)] border border-slate-200/80 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari program, bidang, aset, strategi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
            />
          </div>
          <select
            value={filterBidang}
            onChange={(e) => setFilterBidang(e.target.value)}
            className={selectClass}
          >
            <option value="all">Semua Bidang</option>
            {bidangOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={filterKluster}
            onChange={(e) => setFilterKluster(e.target.value)}
            className={selectClass}
          >
            <option value="all">Semua Kluster</option>
            {klusterOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={selectClass}
          >
            <option value="all">Semua Status</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Pilih tahun */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-xs font-semibold text-slate-500 mr-1">
            Tahun:
          </span>
          <button
            onClick={() => setSelectedYear("all")}
            className={`px-3.5 py-1.5 text-sm rounded-xl border transition ${
              selectedYear === "all"
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Semua
          </button>
          {yearList.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3.5 py-1.5 text-sm rounded-xl border transition ${
                selectedYear === y
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Legenda status */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-xs text-slate-500">
          <span className="font-semibold">Warna penanda levering:</span>
          {Object.entries(STATUS_STYLE).map(([name, s]) => (
            <span key={name} className="inline-flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${s.bar}`} />
              {name}
            </span>
          ))}
        </div>

        {hasActiveFilter && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
            <FiFilter size={14} />
            <span>Ditemukan {filtered.length} program</span>
            <button
              onClick={resetFilters}
              className="text-sky-700 hover:underline"
            >
              Hapus filter
            </button>
          </div>
        )}
      </div>

      {/* Timeline per tahun */}
      {programs.length === 0 ? (
        <div className="bg-white rounded-[22px] p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiInbox className="text-3xl text-slate-400" />
          </div>
          <p className="text-slate-500">Belum ada data program</p>
        </div>
      ) : stats.programCount === 0 ? (
        <div className="bg-white rounded-[22px] p-12 text-center">
          <p className="text-slate-500">
            Tidak ada program yang cocok dengan filter
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {visibleYears.map((year) => {
            const yearItems = MONTHS.flatMap((m) => byYear[year]?.[m] || []);
            return (
              <motion.section
                key={year}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(15,23,42,0.035)] border border-slate-200/80 p-4 md:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1e4f91] to-[#2563eb] flex items-center justify-center shadow">
                      <FiCalendar className="text-white text-lg" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {year}
                        {year === currentYear && (
                          <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                            tahun berjalan
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-slate-400">
                        {yearItems.length} program terjadwal
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-600">
                      {formatCurrencyShort(sumHarga(yearItems))}
                    </div>
                    <div className="text-xs text-slate-400">Total anggaran</div>
                  </div>
                </div>

                <TimelineTable
                  items={yearItems}
                  year={year}
                  currentYear={currentYear}
                  currentMonth={currentMonth}
                  compact={compact}
                  onSelect={setSelectedProgram}
                />
              </motion.section>
            );
          })}

          {/* Belum dijadwalkan */}
          {visibleUnscheduled.length > 0 && (
            <section className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(15,23,42,0.035)] border border-slate-200/80 p-4 md:p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow">
                  <FiClock className="text-white text-lg" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Belum Dijadwalkan
                  </h2>
                  <p className="text-xs text-slate-400">
                    {visibleUnscheduled.length} program belum punya EST Levering
                    atau tahun
                  </p>
                </div>
              </div>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {visibleUnscheduled.map((p, i) => (
                  <button
                    key={`${p.no}-${i}`}
                    type="button"
                    onClick={() => setSelectedProgram(p)}
                    title={p.programKerja}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${getStatusStyle(p.keterangan).bar}`}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                      {p.programKerja}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {p.tahun || "—"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modal detail */}
      <AnimatePresence>
        {selectedProgram && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-[22px] max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-[#1e4f91] to-[#2563eb] px-6 py-4 flex justify-between items-center z-10">
                <h2 className="text-lg font-bold text-white">Detail Program</h2>
                <button
                  onClick={() => setSelectedProgram(null)}
                  className="p-1 hover:bg-white/20 rounded-lg transition text-white"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <div className="text-xs text-slate-400">
                    {selectedProgram.no}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
                    {selectedProgram.programKerja}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg ${getStatusStyle(selectedProgram.keterangan).badge}`}
                    >
                      {selectedProgram.keterangan || "Belum Ada Status"}
                    </span>
                    {selectedProgram.kategori && (
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg ${
                          KATEGORI_BADGE[selectedProgram.kategori] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {selectedProgram.kategori}
                      </span>
                    )}
                    {selectedProgram.bidang && (
                      <span className="inline-flex px-2.5 py-1 text-xs rounded-lg bg-slate-100 text-slate-700">
                        {selectedProgram.bidang}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-sky-50 rounded-2xl p-3">
                    <div className="text-xs font-semibold text-sky-600 uppercase tracking-wider">
                      Estimasi Levering
                    </div>
                    <div className="font-bold text-sky-900 mt-1">
                      {detailSched
                        ? `${BULAN[detailSched.month - 1]} ${detailSched.year}`
                        : "Belum dijadwalkan"}
                    </div>
                    {selectedProgram.estLevering && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        Input: bulan ke-{selectedProgram.estLevering} dari tahun{" "}
                        {selectedProgram.tahun || "-"}
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Tahun Program
                    </div>
                    <div className="font-semibold text-slate-800 mt-1">
                      {selectedProgram.tahun || "-"}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Harga Material
                    </div>
                    <div className="font-bold text-blue-600 mt-1">
                      {parseFloat(selectedProgram.hargaMaterial) > 0
                        ? formatCurrency(selectedProgram.hargaMaterial)
                        : "-"}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Harga Jasa
                    </div>
                    <div className="font-bold text-purple-600 mt-1">
                      {parseFloat(selectedProgram.hargaJasa) > 0
                        ? formatCurrency(selectedProgram.hargaJasa)
                        : "-"}
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-3 sm:col-span-2">
                    <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                      Harga Total
                    </div>
                    <div className="font-bold text-emerald-700 mt-1 text-xl">
                      {formatCurrency(selectedProgram.hargaTotal)}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Kluster Program
                    </div>
                    <div className="text-sm text-slate-700 mt-1">
                      {selectedProgram.klusterProgram || "-"}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Strategis RJPU
                    </div>
                    <div className="text-sm text-slate-700 mt-1">
                      {selectedProgram.strategisRjpu || "-"}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 sm:col-span-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Aset
                    </div>
                    <div className="text-sm text-slate-700 mt-1">
                      {selectedProgram.aset || "-"}
                    </div>
                    {selectedProgram.descriptionAset && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {selectedProgram.descriptionAset}
                      </div>
                    )}
                  </div>
                </div>

                {selectedProgram.alasanProgram && (
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Alasan Program
                    </div>
                    <p className="text-sm text-slate-600 mt-1 p-3 bg-sky-50 rounded-2xl">
                      {selectedProgram.alasanProgram}
                    </p>
                  </div>
                )}

                {selectedProgram.file && (
                  <a
                    href={selectedProgram.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-sky-700 hover:text-sky-800"
                  >
                    <FiExternalLink size={15} /> Buka file program
                  </a>
                )}
              </div>

              <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end">
                <button
                  onClick={() => setSelectedProgram(null)}
                  className="px-4 py-2 border border-slate-200 rounded-2xl hover:bg-slate-50 transition"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProgramTimeline;
