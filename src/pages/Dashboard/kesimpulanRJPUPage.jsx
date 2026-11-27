// src/pages/Dashboard/KesimpulanRJPU.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FiRefreshCw,
  FiDownload,
  FiSearch,
  FiInfo,
  FiX,
  FiAlertTriangle,
  FiChevronLeft,
  FiChevronRight,
  FiTrendingUp,
  FiCheckCircle,
  FiBarChart2,
  FiFilter,
  FiEye,
} from "react-icons/fi";
import service, {
  defaultOptions,
  normalize,
  normalizeUnit,
  summarize,
  ECON_FIELDS,
} from "../../api/kesimpulanRJPUService";

const money = (v) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(v);
const num = (v, d = 2) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("id-ID", {
        maximumFractionDigits: d,
        minimumFractionDigits: d,
      });
const shortMoney = (v) =>
  v == null
    ? "—"
    : Math.abs(v) >= 1e9
      ? `Rp ${num(v / 1e9, 1)} Miliar`
      : Math.abs(v) >= 1e6
        ? `Rp ${num(v / 1e6, 1)} Juta`
        : money(v);
const tiers = {
  REVIEW: "bg-slate-100 text-slate-700 ring-slate-300",
  P1: "bg-rose-100 text-rose-800 ring-rose-200",
  P2: "bg-amber-100 text-amber-800 ring-amber-200",
  P3: "bg-sky-100 text-sky-800 ring-sky-200",
  P4: "bg-slate-100 text-slate-700 ring-slate-200",
};
const scoreBars = {
  P1: "bg-rose-600",
  P2: "bg-amber-500",
  P3: "bg-sky-600",
  P4: "bg-slate-500",
};
const sourceStyles = {
  AI: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  AO: "bg-teal-100 text-teal-800 ring-teal-200",
};
const statusStyles = {
  selesai: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  "on progress": "bg-sky-100 text-sky-800 ring-sky-200",
  diskusi: "bg-violet-100 text-violet-800 ring-violet-200",
  lanjut: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  ditunda: "bg-amber-100 text-amber-800 ring-amber-200",
  drop: "bg-rose-100 text-rose-800 ring-rose-200",
};
const neutral = "bg-slate-100 text-slate-700 ring-slate-200";
const badge = (label, style = neutral, title) => (
  <span
    title={title}
    className={`inline-flex max-w-[190px] items-center rounded-lg px-2 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}
  >
    {label}
  </span>
);
const statusShort = (v) => {
  const s = String(v || "").trim();
  if (!s) return "Belum ada status";
  const type = s.match(/KETERANGAN JENIS PROGRAM\s*:\s*([^|]+)/i)?.[1]?.trim();
  const missing = /tahun\s*\/\s*harga belum tersedia/i.test(s);
  if (type || missing)
    return [type, missing ? "Tahun/harga belum tersedia" : null]
      .filter(Boolean)
      .join(" · ");
  return s.length > 45 ? s.slice(0, 42) + "…" : s;
};
const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50";
const cardClass = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const optionValues = (rows, key) =>
  [
    ...new Set(rows.map((r) => String(r[key] ?? "").trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
function Filter({ label, value, onChange, options }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      <select
        className={fieldClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Semua</option>
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    </label>
  );
}
function Stat({ label, value, sub, color = "text-slate-900" }) {
  return (
    <div className={cardClass}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-2 break-words text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

const methods = {
  reliability: "Keandalan / avoided loss",
  efficiency: "Efisiensi bahan bakar",
  other: "Manfaat lain terverifikasi",
};
const commonFields = [
  "ANNUAL_EXTRA_OM_RP",
  "LIFETIME_YEARS",
  "DISCOUNT_RATE",
  "EVIDENCE",
  "APPROVED_BY",
];
const methodFields = {
  reliability: [
    "APPROVED_LOSS_MWH",
    "MARGIN_RP_KWH",
    "ATTRIBUTABLE_FRACTION",
    "EFFECTIVENESS",
    "ANNUAL_REPAIR_COST_RP",
    "ANNUAL_AVOIDED_REPAIR_RP",
  ],
  efficiency: [
    "ANNUAL_GAS_SAVING_MMBTU",
    "GAS_RP_MMBTU",
    "ANNUAL_HSD_SAVING_LITER",
    "HSD_RP_LITER",
  ],
  other: ["ANNUAL_OTHER_SAVING_RP"],
};
const inputLabel = Object.fromEntries(ECON_FIELDS);
function Detail({ row, model, onClose, onSave }) {
  const [draft, setDraft] = useState(() => ({
    ...row.economicInput,
    METHOD: row.method,
  }));
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const fields = [...(methodFields[draft.METHOD] || []), ...commonFields];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Detail RJPU"
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <header className="flex justify-between gap-4 border-b pb-4">
          <div>
            <p className="text-xs text-slate-500">
              {row.id} · {row.units.join(", ") || "Unit belum diisi"} ·{" "}
              {row.year ?? "Tahun kosong"} ·{" "}
              {row.sumberAnggaran || "Anggaran belum diisi"}
            </p>
            <h2 className="text-xl font-bold">{row.nama}</h2>
            <div className="mt-2 flex gap-2">
              {badge(row.tier, tiers[row.tier])}
              {row.mandatory &&
                badge(
                  "Wajib review regulasi/K3",
                  "bg-rose-100 text-rose-800 ring-rose-200",
                )}
            </div>
          </div>
          <button
            className={buttonClass}
            onClick={onClose}
            aria-label="Tutup"
            autoFocus
          >
            <FiX />
          </button>
        </header>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Skor teknis" value={num(row.finalScore)} />
          <Stat
            label="Kelengkapan kriteria"
            value={num(row.coverage, 1) + "%"}
          />
          <Stat label="Exposure tertinggi" value={num(row.exposureIndex)} />
          <Stat label="PV investasi" value={shortMoney(row.pvInvestment)} />
        </div>
        <h3 className="mb-2 mt-5 font-bold">Kontribusi kelompok</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {row.groups.map((g) => (
            <div key={g.id} className="rounded-xl border p-3">
              <div className="text-sm">{g.label}</div>
              <strong>
                {num(g.contribution)} / {num(g.weight)}
              </strong>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-sky-600"
                  style={{ width: `${g.score ?? 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <h3 className="mb-2 mt-5 font-bold">Perhitungan MCDA (8 kriteria)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                {["Kriteria", "Bobot (%)", "Skor", "Kontribusi"].map((x) => (
                  <th className="p-2" key={x}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {row.breakdown.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="p-2">{c.label}</td>
                  <td className="p-2">{num(c.weight)}</td>
                  <td className="p-2">{num(c.score)}</td>
                  <td className="p-2">{num(c.contribution)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Risiko: {row.inherent ?? "Belum valid"} →{" "}
          {row.residual ?? "Belum valid"}. Tidak ada imputasi risiko, penalti
          atau override skor minimum; mandatory ditinjau terpisah.
        </p>
        <h3 className="mb-2 mt-5 font-bold">
          Historis & forecast unit {model.meta.forecast_year}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                {[
                  "Unit",
                  "Historis laporan/tahun",
                  "Historis MWh/tahun",
                  "Forecast laporan",
                  "Referensi Loss MWh",
                  "Exposure",
                ].map((x) => (
                  <th className="p-2" key={x}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {row.unitRows.map((u) => (
                <tr key={u.unit} className="border-b">
                  <td className="p-2">{u.unit}</td>
                  <td className="p-2">{num(u.historical_mean_events)}</td>
                  <td className="p-2">{num(u.historical_mean_loss_mwh)}</td>
                  <td className="p-2">{num(u.events_forecast)}</td>
                  <td className="p-2">{num(u.loss_forecast)}</td>
                  <td className="p-2">{num(u.exposure_index)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!row.unitRows.length && (
            <p className="p-3 text-sm text-slate-500">
              Unit tidak terpetakan dalam model.
            </p>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Exposure maksimum untuk multi-unit; Loss MWh tidak dijumlah otomatis.
          Referensi model bukan kerugian yang pasti dapat dihindari program.
        </p>
        <h3 className="mb-2 mt-5 font-bold">Assessment ekonomi per program</h3>
        <label className="block text-xs font-semibold">
          Metode manfaat
          <select
            className={fieldClass}
            value={draft.METHOD}
            onChange={(e) =>
              setDraft((d) => ({ ...d, METHOD: e.target.value }))
            }
          >
            {Object.entries(methods).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((k) => (
            <label key={k} className="text-xs font-semibold text-slate-600">
              {inputLabel[k]}
              <input
                className={fieldClass}
                type={
                  ["EVIDENCE", "APPROVED_BY"].includes(k) ? "text" : "number"
                }
                min={0}
                step={k === "LIFETIME_YEARS" ? 1 : "any"}
                max={
                  [
                    "DISCOUNT_RATE",
                    "ATTRIBUTABLE_FRACTION",
                    "EFFECTIVENESS",
                  ].includes(k)
                    ? 1
                    : undefined
                }
                value={draft[k] ?? ""}
                placeholder="Belum tersedia"
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [k]: e.target.value }))
                }
              />
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Angka 0 hanya jika benar-benar nol. Fraksi 0,8 ditulis 0.8. Untuk
          single-unit, baseline kosong memakai referensi forecast;
          multi-unit/Common harus memasukkan baseline MWh tervalidasi. Biaya
          repair yang dihindari harus sudah memperhitungkan efektivitas. Metode
          efisiensi memakai jumlah penghematan sesudah program, bukan total
          konsumsi. Isi sumber dan pemeriksa; aplikasi tidak memverifikasi
          otorisasi pemeriksa.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-bold text-white"
            onClick={() => onSave(row.rowKey, draft)}
          >
            Terapkan & hitung ulang
          </button>
          <button
            className={buttonClass}
            onClick={() => {
              setDraft({ METHOD: "reliability" });
              onSave(row.rowKey, {});
            }}
          >
            Kosongkan assessment
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Assessment hanya disimpan selama halaman aktif; gunakan Export
          Assessment JSON untuk menyimpan dan Import untuk memuat kembali. Tidak
          mengubah Google Sheets.
        </p>
        <h3 className="mb-2 mt-5 font-bold">
          Hasil ekonomi — input yang telah diterapkan
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {[
            ["Harga sumber", money(row.rawPrice)],
            ["Harga Rp", money(row.priceRp)],
            ["Nominal tahun rencana", money(row.nominalCost)],
            ["PV investasi", money(row.pvInvestment)],
            ["PV biaya total (termasuk O&M)", money(row.pvCost)],
            ["PV manfaat", money(row.pvBenefit)],
            ["NPV", money(row.npv)],
            ["BCR", num(row.bcr)],
            [
              "Payback sederhana",
              row.payback == null ? "—" : num(row.payback) + " tahun",
            ],
            ["Umur manfaat", row.life == null ? "—" : row.life + " tahun"],
            ["Manfaat tahunan", money(row.annualBenefit)],
            ["Avoided Loss MWh/tahun", num(row.avoidedMwh)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{k}</p>
              <p className="break-words text-sm font-bold">{v}</p>
            </div>
          ))}
        </div>
        {row.economicMissing.length > 0 && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <strong>Ekonomi belum lengkap:</strong>{" "}
            {row.economicMissing.join(" · ")}
          </div>
        )}
        {[...row.flags, ...row.economicNotes].length > 0 && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            {[...row.flags, ...row.economicNotes].map((f, i) => (
              <p key={i}>{f}</p>
            ))}
          </div>
        )}
        <h3 className="mt-4 font-semibold">Keterangan asli</h3>
        <p className="whitespace-pre-wrap break-words text-sm">
          {row.status || "—"}
        </p>
      </section>
    </div>
  );
}
function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadCsv(rows, model, options) {
  const head = [
    "Rank",
    "NO",
    "Program",
    "Sumber Anggaran",
    "Unit",
    "Bidang",
    "Tahun",
    "Harga Rp",
    "PV Investasi",
    "PV Biaya Total",
    "PV Manfaat",
    "NPV",
    "BCR",
    "Payback",
    "Skor Teknis",
    "Coverage %",
    "Tier",
    "Mandatory",
    "Exposure Max",
    "Forecast Year",
    "Status",
    "Review",
    "Economic Missing",
    "Model",
    "Base Year",
    "Basis Harga",
    "Satuan Harga",
  ];
  const safe = (v) => {
    let s = v == null ? "" : String(v);
    if (typeof v === "string" && /^\s*[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const body = rows.map((r) => [
    r.rank,
    r.id,
    r.nama,
    r.sumberAnggaran,
    r.units.join(", "),
    r.bidang,
    r.year,
    r.priceRp,
    r.pvInvestment,
    r.pvCost,
    r.pvBenefit,
    r.npv,
    r.bcr,
    r.payback,
    r.finalScore,
    r.coverage,
    r.tier,
    r.mandatory ? "Ya" : "Tidak",
    r.exposureIndex,
    model.meta.forecast_year,
    r.status,
    r.flags.join(" | "),
    r.economicMissing.join(" | "),
    model.meta.version,
    options.baseYear,
    options.priceBasis,
    options.priceMode,
  ]);
  download(
    "kesimpulan-rjpu-v2.csv",
    "\uFEFF" + [head, ...body].map((x) => x.map(safe).join(",")).join("\r\n"),
    "text/csv;charset=utf-8;",
  );
}
const initialFilters = {
  unit: "",
  source: "",
  year: "",
  tier: "",
  bidang: "",
  review: "",
  economic: "",
};
const KesimpulanRJPU = ({ userRole }) => {
  const [model, setModel] = useState(null),
    [programs, setPrograms] = useState([]),
    [settings, setSettings] = useState(null),
    [assessments, setAssessments] = useState({});
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [lastSync, setLastSync] = useState(null),
    [autoRefresh, setAutoRefresh] = useState(true),
    [importMessage, setImportMessage] = useState("");
  const [search, setSearch] = useState(""),
    [filters, setFilters] = useState(initialFilters),
    [page, setPage] = useState(1),
    [perPage, setPerPage] = useState(25),
    [detailKey, setDetailKey] = useState(null);
  const request = useRef(0),
    busy = useRef(false),
    lastAttempt = useRef(0),
    fileInput = useRef(null);
  const refresh = useCallback(
    async ({ forceModel = false, quiet = false } = {}) => {
      if (busy.current) return;
      busy.current = true;
      lastAttempt.current = Date.now();
      const id = ++request.current;
      if (!quiet) setLoading(true);
      try {
        const [m, data] = await Promise.all([
          service.loadModel(forceModel),
          service.loadPrograms(),
        ]);
        if (id !== request.current) return;
        setModel(m);
        setSettings((old) => old || defaultOptions(m));
        setPrograms(data);
        setLastSync(new Date());
        setError(
          data.length
            ? ""
            : "Tidak ada data yang dikembalikan. Periksa akses atau koneksi Google Sheets.",
        );
      } catch (e) {
        if (id === request.current) setError(e.message || "Gagal memuat data.");
      } finally {
        if (id === request.current) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [],
  );
  useEffect(() => {
    request.current++;
    busy.current = false;
    setPrograms([]);
    setModel(null);
    setSettings(null);
    setAssessments({});
    setLastSync(null);
    setDetailKey(null);
    setError("");
    refresh({ forceModel: true });
    return () => {
      request.current++;
      busy.current = false;
    };
  }, [refresh, userRole]);
  useEffect(() => {
    if (!autoRefresh) return;
    const run = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastAttempt.current >= 55000
      )
        refresh({ quiet: true });
    };
    const timer = setInterval(run, 60000);
    window.addEventListener("focus", run);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", run);
    };
  }, [autoRefresh, refresh]);
  const analysis = useMemo(() => {
    if (!model || !settings)
      return { rows: [], excluded: [], invalid: [], error: "" };
    try {
      return {
        ...service.rank(programs, model, settings, assessments),
        error: "",
      };
    } catch (e) {
      return { rows: [], excluded: [], invalid: [], error: e.message };
    }
  }, [programs, model, settings, assessments]);
  const rows = analysis.rows;
  const units = useMemo(
    () =>
      [
        ...new Map(
          rows.flatMap((r) => r.units).map((u) => [normalizeUnit(u), u]),
        ).values(),
      ].sort((a, b) => a.localeCompare(b, "id", { numeric: true })),
    [rows],
  );
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const q = normalize(search);
        return (
          (!q ||
            normalize(
              [
                r.id,
                r.nama,
                r.bidang,
                r.unit,
                r.aset,
                r.status,
                r.cluster,
              ].join(" "),
            ).includes(q)) &&
          (!filters.unit ||
            r.units.some(
              (u) => normalizeUnit(u) === normalizeUnit(filters.unit),
            )) &&
          (!filters.source ||
            normalize(r.sumberAnggaran) === normalize(filters.source)) &&
          (!filters.year || String(r.year ?? "") === filters.year) &&
          (!filters.tier || r.tier === filters.tier) &&
          (!filters.bidang || r.bidang === filters.bidang) &&
          (!filters.review ||
            (filters.review === "mandatory"
              ? r.mandatory
              : filters.review === "review"
                ? r.needsReview
                : !r.needsReview)) &&
          (!filters.economic || r.economicState === filters.economic)
        );
      }),
    [rows, search, filters],
  );
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage)),
    currentPage = Math.min(page, pageCount),
    visible = filtered.slice(
      (currentPage - 1) * perPage,
      currentPage * perPage,
    ),
    detail = rows.find((r) => r.rowKey === detailKey);
  const closeDetail = useCallback(() => setDetailKey(null), []);
  const changeFilter = (key, value) => {
    setFilters((old) => ({ ...old, [key]: value }));
    setPage(1);
  };
  const changeSetting = (key, value) => {
    setSettings((old) => ({ ...old, [key]: value }));
    setPage(1);
  };
  const saveAssessment = (id, data) =>
    setAssessments((old) => ({ ...old, [id]: data }));
  const exportAssessments = () =>
    download(
      "rjpu-economic-assessments.json",
      JSON.stringify(
        {
          version: 2,
          assessments: Object.fromEntries(
            rows
              .filter((r) =>
                Object.prototype.hasOwnProperty.call(assessments, r.rowKey),
              )
              .map((r) => [r.rowKey, assessments[r.rowKey]]),
          ),
        },
        null,
        2,
      ),
      "application/json",
    );
  const importAssessments = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      if (f.size > 5e6) throw new Error("File lebih dari 5 MB.");
      const obj = JSON.parse(await f.text());
      if (
        obj.version !== 2 ||
        !obj.assessments ||
        typeof obj.assessments !== "object" ||
        Array.isArray(obj.assessments)
      )
        throw new Error("Format assessment tidak valid.");
      const allowed = new Set(rows.map((r) => r.rowKey)),
        keys = new Set(["METHOD", ...ECON_FIELDS.map((x) => x[0])]);
      const accepted = Object.fromEntries(
        Object.entries(obj.assessments)
          .filter(
            ([id, v]) =>
              allowed.has(id) &&
              v &&
              typeof v === "object" &&
              !Array.isArray(v),
          )
          .map(([id, v]) => [
            id,
            Object.fromEntries(
              Object.entries(v).filter(
                ([k, x]) =>
                  keys.has(k) &&
                  (typeof x === "string" || typeof x === "number"),
              ),
            ),
          ]),
      );
      setAssessments((old) => ({ ...old, ...accepted }));
      setImportMessage(
        `${Object.keys(accepted).length} assessment dimuat; NO di luar data aktif diabaikan.`,
      );
    } catch (err) {
      setImportMessage(err.message);
    }
  };
  return (
    <main className="min-h-screen space-y-5 bg-slate-50 p-3 text-slate-800 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
            RJPU · Decision Support
          </p>
          <h1 className="text-3xl font-bold">Kesimpulan RJPU</h1>
          <p className="text-sm text-slate-500">
            MCDA teknis + Historical Exposure + Economic Assessment · v
            {model?.meta.version || "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={buttonClass}
            disabled={loading}
            onClick={() => refresh({ forceModel: true })}
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            data
          </button>
          <button
            className={buttonClass}
            disabled={
              !filtered.length ||
              !settings ||
              loading ||
              !!error ||
              !!analysis.error
            }
            onClick={() => downloadCsv(filtered, model, settings)}
          >
            <FiDownload /> Export CSV
          </button>
        </div>
      </header>
      <div className="flex flex-wrap justify-between text-xs text-slate-500">
        <span>
          {lastSync ? lastSync.toLocaleString("id-ID") : "Belum sinkron"} ·{" "}
          {programs.length} baris dalam akses Anda
        </span>
        <label>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />{" "}
          Refresh otomatis 60 detik
        </label>
      </div>
      {(error || analysis.error) && (
        <div
          role="alert"
          className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error || analysis.error}{" "}
          {error && rows.length ? "Data tampil mungkin belum terbaru." : ""}
        </div>
      )}
      {model && settings && (
        <section className={cardClass}>
          <div className="flex flex-wrap justify-between gap-2">
            <h2 className="font-bold">Parameter perhitungan</h2>
            <button
              className={buttonClass}
              onClick={() => setSettings(defaultOptions(model))}
            >
              Reset parameter
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <label className="text-xs font-semibold">
              Tahun analisis
              <input
                className={fieldClass}
                type="number"
                min="1900"
                max="2200"
                value={settings.baseYear ?? ""}
                onChange={(e) =>
                  changeSetting(
                    "baseYear",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            </label>
            <label className="text-xs font-semibold">
              Diskonto global (%)
              <input
                className={fieldClass}
                type="number"
                min="0"
                max="100"
                step="any"
                value={
                  settings.discountRate == null
                    ? ""
                    : Number((settings.discountRate * 100).toFixed(8))
                }
                onChange={(e) =>
                  changeSetting(
                    "discountRate",
                    e.target.value === "" ? null : Number(e.target.value) / 100,
                  )
                }
                placeholder="Belum tersedia"
              />
            </label>
            <label className="text-xs font-semibold">
              Satuan harga
              <select
                className={fieldClass}
                value={settings.priceMode}
                onChange={(e) => changeSetting("priceMode", e.target.value)}
              >
                <option value="rupiah">Rupiah</option>
                <option value="ribu">Ribu rupiah</option>
              </select>
            </label>
            <label className="text-xs font-semibold">
              Basis harga
              <select
                className={fieldClass}
                value={settings.priceBasis}
                onChange={(e) => changeSetting("priceBasis", e.target.value)}
              >
                <option value="target">Harga tahun program</option>
                <option value="reference">Harga referensi</option>
              </select>
            </label>
            {settings.priceBasis === "reference" && (
              <>
                <label className="text-xs font-semibold">
                  Tahun harga referensi
                  <input
                    className={fieldClass}
                    type="number"
                    value={settings.priceReferenceYear ?? ""}
                    onChange={(e) =>
                      changeSetting(
                        "priceReferenceYear",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  />
                </label>
                <label className="text-xs font-semibold">
                  Inflasi (%)
                  <input
                    className={fieldClass}
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={
                      settings.inflationRate == null
                        ? ""
                        : Number((settings.inflationRate * 100).toFixed(8))
                    }
                    onChange={(e) =>
                      changeSetting(
                        "inflationRate",
                        e.target.value === ""
                          ? null
                          : Number(e.target.value) / 100,
                      )
                    }
                  />
                </label>
              </>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Default rupiah, harga tahun program, tanpa asumsi diskonto/inflasi.
            Skor teknis mengikuti rumus notebook bila tahun analisis ={" "}
            {model.meta.forecast_year} dan input numerik valid. Ambang P1–P4
            memakai V1 sebagai label sementara.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={importAssessments}
            />
            <button
              className={buttonClass}
              disabled={!rows.length}
              onClick={() => fileInput.current?.click()}
            >
              Import Assessment JSON
            </button>
            <button
              className={buttonClass}
              disabled={!Object.keys(assessments).length}
              onClick={exportAssessments}
            >
              Export Assessment JSON
            </button>
          </div>
          {importMessage && <p className="mt-2 text-xs">{importMessage}</p>}
          <p className="mt-2 text-xs text-amber-700">
            Simpan assessment ke JSON sebelum menutup halaman. Tidak ada
            penulisan ke database.
          </p>
        </section>
      )}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Program aktif (filter)"
          value={summary.count}
          sub={`${analysis.excluded.length} selesai/drop · ${analysis.invalid.length} identitas ditahan`}
        />
        <Stat
          label="P1 – Prioritas Utama"
          value={summary.counts.P1}
          sub={`${summary.mandatory} wajib review`}
          color="text-rose-700"
        />
        <Stat
          label="Kebutuhan biaya diketahui"
          value={shortMoney(summary.total)}
          sub={`${summary.missingCost} tanpa harga; bukan pagu`}
        />
        <Stat
          label="Ekonomi terhitung"
          value={`${summary.economic}/${summary.count}`}
          sub={`${summary.counts.REVIEW} tanpa skor teknis`}
          color="text-sky-700"
        />
      </section>
      <section className="grid gap-3 lg:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 font-bold">Distribusi prioritas</h2>
          {Object.entries(summary.counts).map(([k, v]) => (
            <div key={k} className="mb-3 flex items-center gap-2">
              <div className="w-20">{badge(k, tiers[k])}</div>
              <div className="h-3 flex-1 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-sky-600"
                  style={{
                    width: `${summary.count ? (100 * v) / summary.count : 0}%`,
                  }}
                />
              </div>
              <strong className="w-10 text-right text-sm">{v}</strong>
            </div>
          ))}
        </div>
        <div className={cardClass}>
          <h2 className="mb-3 font-bold">Kebutuhan anggaran</h2>
          {Object.entries(summary.funding).map(([k, v]) => (
            <div key={k} className="mb-4">
              <div className="flex justify-between gap-2">
                {badge(k, sourceStyles[k])}
                <strong className="text-sm">{money(v)}</strong>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-teal-600"
                  style={{
                    width: `${summary.total ? (100 * v) / summary.total : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-500">
            Program multi-unit dihitung satu kali.
          </p>
        </div>
      </section>
      <section className={cardClass}>
        <div className="flex justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">Prioritas Pelaksanaan RJPU</h2>
            <p className="mt-1 text-xs text-slate-500">
              P1 → P2 → P3 → P4, skor teknis tertinggi terlebih dahulu. REVIEW
              tanpa rank.
            </p>
          </div>
          <button
            className={buttonClass}
            onClick={() => {
              setFilters(initialFilters);
              setSearch("");
              setPage(1);
            }}
          >
            Reset filter
          </button>
        </div>
        {summary.mandatory > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <span>
              <strong>
                {summary.mandatory} program wajib review regulasi/K3
              </strong>{" "}
              dalam filter aktif. Kewajiban tetap ditinjau terpisah, termasuk
              program tanpa skor.
            </span>
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                setFilters({ ...initialFilters, review: "mandatory" });
                setSearch("");
                setPage(1);
              }}
            >
              Lihat program wajib
            </button>
          </div>
        )}
        <input
          className={`${fieldClass} mt-3`}
          placeholder="Cari NO, program, aset, unit..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <Filter
            label="Unit"
            value={filters.unit}
            onChange={(v) => changeFilter("unit", v)}
            options={units}
          />
          <Filter
            label="Anggaran"
            value={filters.source}
            onChange={(v) => changeFilter("source", v)}
            options={optionValues(rows, "sumberAnggaran")}
          />
          <Filter
            label="Tahun"
            value={filters.year}
            onChange={(v) => changeFilter("year", v)}
            options={optionValues(rows, "year")}
          />
          <Filter
            label="Prioritas"
            value={filters.tier}
            onChange={(v) => changeFilter("tier", v)}
            options={Object.keys(tiers)}
          />
          <Filter
            label="Bidang"
            value={filters.bidang}
            onChange={(v) => changeFilter("bidang", v)}
            options={optionValues(rows, "bidang")}
          />
          <Filter
            label="Review"
            value={filters.review}
            onChange={(v) => changeFilter("review", v)}
            options={[
              { value: "mandatory", label: "Wajib regulasi/K3" },
              { value: "review", label: "Perlu review" },
              { value: "clean", label: "Tanpa flag" },
            ]}
          />
          <Filter
            label="Ekonomi"
            value={filters.economic}
            onChange={(v) => changeFilter("economic", v)}
            options={["Data belum lengkap", "NPV ≥ 0", "NPV negatif"]}
          />
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                {[
                  "Rank",
                  "Program / Unit",
                  "AI/AO",
                  "Tahun",
                  "Harga Total",
                  "Skor Teknis ↓",
                  "Prioritas",
                  "Detail",
                ].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="whitespace-nowrap px-3 py-3 font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!visible.length ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500">
                    {loading
                      ? "Memuat data..."
                      : "Tidak ada program sesuai filter."}
                  </td>
                </tr>
              ) : (
                visible.map((r) => (
                  <tr
                    key={r.rowKey}
                    className="border-b border-slate-100 align-top hover:bg-slate-50 last:border-b-0"
                  >
                    <td className="px-3 py-3 font-bold tabular-nums">
                      {r.rank ?? "—"}
                    </td>
                    <td className="min-w-[240px] max-w-[440px] px-3 py-3">
                      <p className="text-xs text-slate-500">
                        {r.id} · {r.bidang || "Bidang belum diisi"}
                      </p>
                      <strong className="block break-words leading-relaxed">
                        {r.nama}
                      </strong>
                      <p className="mt-1 break-words text-xs text-slate-600">
                        Unit: {r.units.join(", ") || "—"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {badge(
                          statusShort(r.status),
                          statusStyles[normalize(r.status)],
                          r.status,
                        )}
                        {r.mandatory &&
                          badge(
                            "Wajib regulasi/K3",
                            "bg-rose-100 text-rose-800 ring-rose-200",
                          )}
                        {r.needsReview &&
                          badge(
                            `Review (${r.flags.length})`,
                            "bg-amber-100 text-amber-800 ring-amber-200",
                            r.flags.join(" · "),
                          )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {badge(
                        r.sumberAnggaran || "—",
                        sourceStyles[r.sumberAnggaran?.toUpperCase()],
                      )}
                    </td>
                    <td className="px-3 py-3 tabular-nums">{r.year ?? "—"}</td>
                    <td
                      className="whitespace-nowrap px-3 py-3 font-medium tabular-nums"
                      title={money(r.nominalCost ?? r.priceRp)}
                    >
                      {shortMoney(r.nominalCost ?? r.priceRp)}
                    </td>
                    <td className="min-w-[100px] px-3 py-3">
                      {Number.isFinite(r.finalScore) ? (
                        <>
                          <span className="text-base font-bold tabular-nums">
                            {num(r.finalScore)}
                          </span>
                          <span className="ml-1 text-xs text-slate-400">
                            /100
                          </span>
                          <div
                            className="mt-1.5 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"
                            aria-hidden="true"
                          >
                            <div
                              className={`h-full rounded-full ${scoreBars[r.tier] || "bg-slate-400"}`}
                              style={{
                                width: `${Math.min(100, Math.max(0, r.finalScore))}%`,
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500">
                          Belum lengkap
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {badge(r.tier, tiers[r.tier], r.tierName)}
                      <p className="mt-1 text-xs text-slate-500">
                        {r.tierName}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        className={buttonClass}
                        title="Detail teknis, historis, dan ekonomi"
                        onClick={() => setDetailKey(r.rowKey)}
                      >
                        <FiEye /> Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span>
            {filtered.length} dari {rows.length} program · rank global dalam
            data akses Anda (P1–P4, skor tertinggi; REVIEW terakhir)
          </span>
          <div className="flex items-center gap-2">
            <select
              aria-label="Baris per halaman"
              className="rounded border p-2"
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}/hal
                </option>
              ))}
            </select>
            <button
              className={buttonClass}
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Sebelumnya"
            >
              <FiChevronLeft />
            </button>
            {currentPage}/{pageCount}
            <button
              className={buttonClass}
              disabled={currentPage >= pageCount}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Berikutnya"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </section>
      {model && (
        <details className={cardClass}>
          <summary className="cursor-pointer font-bold">
            Historis &amp; prediksi unit — {model.meta.forecast_year}
          </summary>
          <p className="mb-3 text-xs text-slate-500">
            Periode {model.meta.history_from}–{model.meta.history_to}.{" "}
            {model.provisional_deployment_methods?.events} /{" "}
            {model.provisional_deployment_methods?.loss}. Snapshot offline,
            bukan prediksi tahun analisis baru.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100">
                <tr>
                  {[
                    "Unit",
                    "Forecast laporan gangguan",
                    "Referensi Loss MWh",
                    "Exposure index",
                  ].map((h) => (
                    <th key={h} className="p-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.values(model.unit_predictions)
                  .filter(
                    (u) =>
                      units.some(
                        (x) => normalizeUnit(x) === normalizeUnit(u.unit),
                      ) &&
                      (!filters.unit ||
                        normalizeUnit(filters.unit) === normalizeUnit(u.unit)),
                  )
                  .sort((a, b) => b.exposure_index - a.exposure_index)
                  .map((u) => (
                    <tr key={u.unit} className="border-b">
                      <td className="p-2 font-semibold">{u.unit}</td>
                      <td className="p-2">{num(u.events_forecast)}</td>
                      <td className="p-2">{num(u.loss_forecast)}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 rounded bg-slate-100">
                            <div
                              className="h-full rounded bg-sky-600"
                              style={{ width: `${u.exposure_index}%` }}
                            />
                          </div>
                          {num(u.exposure_index)}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-amber-700">
            Paparan unit tidak masuk skor MCDA dan bukan PoF; kehilangan
            produksi dapat tumpang tindih. Forecast tetap hingga model Python
            diperbarui.
          </p>
        </details>
      )}
      {analysis.invalid.length > 0 && (
        <section className={cardClass}>
          <h2 className="font-bold text-amber-800">
            Review identitas program ({analysis.invalid.length})
          </h2>
          {analysis.invalid.map((x, i) => (
            <p className="mt-1 text-xs" key={i}>
              {x.id || "NO kosong"} · {x.nama} — {x.reason}
            </p>
          ))}
        </section>
      )}
      <section className={cardClass}>
        <h2 className="font-bold">Kesimpulan perencanaan</h2>
        <p className="mt-2 text-sm">
          Pada filter aktif: {summary.counts.P1} P1, {summary.counts.P2} P2,{" "}
          {summary.counts.REVIEW} REVIEW tanpa skor. {summary.mandatory} program
          wajib ditinjau. {summary.economic} program memiliki proyeksi ekonomi
          berdasarkan assessment yang diterapkan. Ekonomi ditampilkan terpisah,
          tidak mengubah skor teknis v2. Tidak ada EAL asumsi atau optimasi pagu
          otomatis.
        </p>
      </section>
      {detail && model && (
        <Detail
          key={detail.rowKey}
          row={detail}
          model={model}
          onClose={closeDetail}
          onSave={saveAssessment}
        />
      )}
    </main>
  );
};
export default KesimpulanRJPU;
