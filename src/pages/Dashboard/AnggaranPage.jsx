import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FiCalendar,
  FiRefreshCw,
  FiSearch,
  FiEdit2,
  FiSave,
  FiX,
  FiAlertCircle,
  FiCheckCircle,
  FiLayers,
  FiPackage,
  FiTool,
  FiActivity,
  FiPlus,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import rjpuAnggaranService from "../../api/rjpuAnggaranSheetService";

const DEFAULT_YEARS = [2027, 2028, 2029, 2030, 2031];
const PAGE_SIZE = 10;
const card = "rounded-2xl border border-slate-200/80 bg-white shadow-sm";
const field =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50";
const secondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50";
const primary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50";
const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const rupiah = (v) => (v == null ? "—" : `Rp ${nf.format(v)}`);
const hasValue = (r) => r.material !== "" || r.jasa !== "";
const sumRows = (rows) =>
  rows.reduce(
    (s, r) => ({
      material: s.material + r.material,
      jasa: s.jasa + r.jasa,
      total: s.total + r.total,
      aki: s.aki + (r.aki ?? 0),
      pending: s.pending + (r.aki == null ? 1 : 0),
    }),
    { material: 0, jasa: 0, total: 0, aki: 0, pending: 0 },
  );

function Status({ rows }) {
  const pending = rows.some((r) => r.aki == null);
  const negative = rows.some((r) => r.aki < 0);
  const [label, style] = !rows.length
    ? ["Belum diinput", "bg-slate-100 text-slate-600"]
    : pending
      ? ["AKI belum lengkap", "bg-amber-50 text-amber-700"]
      : negative
        ? ["AKI negatif", "bg-rose-50 text-rose-700"]
        : ["Terhitung", "bg-emerald-50 text-emerald-700"];
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${style}`}
    >
      {label}
    </span>
  );
}

function Metric({ icon: Icon, title, value, detail }) {
  return (
    <div className={`${card} min-w-0 p-4 sm:p-5`}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <Icon size={19} />
        </span>
        <span className="text-xs font-semibold text-slate-500">{title}</span>
      </div>
      <p className="break-words text-xl font-extrabold tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function Notice({ type = "error", children }) {
  const success = type === "success";
  const Icon = success ? FiCheckCircle : FiAlertCircle;
  return (
    <div
      role={success ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
    >
      <Icon className="mt-0.5 shrink-0" /> <span>{children}</span>
    </div>
  );
}

function AnggaranEditor({ program, existing, onClose, onSaved }) {
  const [rows, setRows] = useState(() => {
    const map = new Map(existing.map((r) => [r.tahun, r]));
    return [...new Set([...DEFAULT_YEARS, ...map.keys()])]
      .sort((a, b) => a - b)
      .map((tahun) => ({
        tahun,
        material: map.has(tahun) ? String(map.get(tahun).material) : "",
        jasa: map.has(tahun) ? String(map.get(tahun).jasa) : "",
      }));
  });
  const [extraYear, setExtraYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const initialYears = useMemo(
    () => new Set(existing.map((r) => r.tahun)),
    [existing],
  );
  const preview = useMemo(() => {
    try {
      const data = rjpuAnggaranService.calculateAKI(
        rows.filter(hasValue).map((r) => ({ ...r, no: program.no })),
      );
      return {
        data,
        byYear: new Map(data.map((r) => [r.tahun, r])),
        error: "",
      };
    } catch (e) {
      return { data: [], byYear: new Map(), error: e.message };
    }
  }, [rows, program.no]);
  const removed = [...initialYears].filter(
    (y) => !rows.some((r) => r.tahun === y && hasValue(r)),
  );
  const totals = sumRows(preview.data);
  const dirty =
    JSON.stringify(
      existing
        .map(({ tahun, material, jasa }) => ({ tahun, material, jasa }))
        .sort((a, b) => a.tahun - b.tahun),
    ) !==
      JSON.stringify(
        preview.data.map(({ tahun, material, jasa }) => ({
          tahun,
          material,
          jasa,
        })),
      ) || Boolean(preview.error);

  function update(year, key, value) {
    setRows((prev) =>
      prev.map((r) => (r.tahun === year ? { ...r, [key]: value } : r)),
    );
    setError("");
  }
  function addYear() {
    try {
      const y = rjpuAnggaranService.normalizeYear(extraYear);
      if (rows.some((r) => r.tahun === y))
        throw new Error("Tahun sudah tersedia");
      setRows((prev) =>
        [...prev, { tahun: y, material: "", jasa: "" }].sort(
          (a, b) => a.tahun - b.tahun,
        ),
      );
      setExtraYear("");
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  function close() {
    if (busy.current) return;
    if (!dirty || window.confirm("Tutup editor tanpa menyimpan perubahan?"))
      onClose();
  }
  async function save(e) {
    e.preventDefault();
    if (busy.current || preview.error) return;
    if (
      removed.length &&
      !window.confirm(`Hapus anggaran tersimpan tahun ${removed.join(", ")}?`)
    )
      return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await rjpuAnggaranService.replaceAnggaran(
        program.no,
        preview.data.map(({ tahun, material, jasa }) => ({
          tahun,
          material,
          jasa,
        })),
      );
      if (!result.success)
        throw new Error(result.message || "Gagal menyimpan anggaran");
      onSaved(program.no, result.data);
    } catch (e) {
      setError(e.message || "Gagal menyimpan anggaran");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <section
      className={`${card} overflow-hidden`}
      aria-labelledby="editor-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:p-6">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-sky-600">
            Editor anggaran · {program.no}
          </p>
          <h2
            id="editor-title"
            className="mt-1 text-lg font-extrabold text-slate-900"
          >
            {program.programKerja}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {program.bidang || "Tanpa bidang"} · {program.kategori || "—"} ·
            Tahun pekerjaan {program.tahun || "—"}
          </p>
        </div>
        <button
          type="button"
          className={secondary}
          onClick={close}
          disabled={saving}
        >
          <FiX /> Tutup
        </button>
      </div>
      <form onSubmit={save} className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Harga material program", program.hargaMaterial],
            ["Harga jasa program", program.hargaJasa],
            ["Harga total program", program.hargaTotal],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 font-bold text-slate-800">
                {typeof value === "number"
                  ? rupiah(value)
                  : String(value || "—")}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs leading-5 text-slate-500">
          Harga di atas berasal dari sheet Data (hanya baca). Masukkan nilai
          rupiah bulat tanpa pemisah ribuan. Dua sel kosong berarti tahun belum
          diinput; masukkan 0 secara eksplisit jika anggaran memang nol. AKI
          dihitung dari total tahun ini dikurangi total tahun berikutnya,
          kecuali total tahun ini nol.
        </p>
        {(error || preview.error) && <Notice>{error || preview.error}</Notice>}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#101b34] text-xs font-semibold text-white">
              <tr>
                {[
                  "Tahun",
                  "Material (Rp)",
                  "Jasa (Rp)",
                  "Total (Rp)",
                  "AKI (Rp)",
                  "Aksi",
                ].map((h) => (
                  <th key={h} className="px-3 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const computed = preview.byYear.get(r.tahun);
                return (
                  <tr key={r.tahun} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-bold text-slate-700">
                      {r.tahun}
                      {r.tahun > DEFAULT_YEARS.at(-1) && (
                        <span className="block text-[10px] font-normal text-slate-400">
                          Tahun tambahan
                        </span>
                      )}
                    </td>
                    {["material", "jasa"].map((k) => (
                      <td key={k} className="px-3 py-2">
                        <input
                          aria-label={`${k} tahun ${r.tahun}`}
                          className={`${field} min-w-[135px] tabular-nums`}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Belum diinput"
                          value={r[k]}
                          disabled={saving}
                          onChange={(e) => update(r.tahun, k, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums">
                      {computed ? nf.format(computed.total) : "—"}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 font-semibold tabular-nums ${computed?.aki < 0 ? "text-rose-600" : computed?.aki == null ? "text-amber-700" : "text-emerald-700"}`}
                    >
                      {!computed
                        ? "—"
                        : computed.aki == null
                          ? "Belum valid"
                          : nf.format(computed.aki)}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        title="Kosongkan tahun"
                        aria-label={`Kosongkan tahun ${r.tahun}`}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                        disabled={saving || !hasValue(r)}
                        onClick={() =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.tahun === r.tahun
                                ? { ...x, material: "", jasa: "" }
                                : x,
                            ),
                          )
                        }
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${field} !w-32`}
            aria-label="Tahun tambahan"
            inputMode="numeric"
            placeholder="Mis. 2032"
            value={extraYear}
            disabled={saving}
            onChange={(e) => setExtraYear(e.target.value)}
          />
          <button
            type="button"
            className={secondary}
            disabled={saving || !extraYear}
            onClick={addYear}
          >
            <FiPlus /> Tambah tahun
          </button>
          <span className="text-xs text-slate-500">
            Tambahkan tahun berikutnya jika diperlukan untuk menghitung AKI
            akhir.
          </span>
        </div>
        {removed.length > 0 && (
          <p className="text-xs text-rose-600">
            Tahun {removed.join(", ")} akan dihapus saat disimpan.
          </p>
        )}
        {totals.pending > 0 && (
          <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            {totals.pending} nilai AKI belum terhitung karena data tahun
            berikutnya tidak tersedia. AKI tersebut akan disimpan kosong.
          </p>
        )}
        {preview.data.some((r) => r.aki < 0) && (
          <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            AKI negatif dipertahankan sesuai rumus. Periksa kenaikan nilai pada
            tahun berikutnya.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs text-slate-500">
              Akumulasi AKI terhitung {totals.pending ? "(parsial)" : ""}
            </p>
            <p className="text-xl font-extrabold text-slate-900 tabular-nums">
              {preview.error ? "—" : rupiah(totals.aki)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={secondary}
              onClick={close}
              disabled={saving}
            >
              Batal
            </button>
            <button
              type="submit"
              className={primary}
              disabled={saving || Boolean(preview.error) || !dirty}
            >
              {saving ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
              {saving ? "Menyimpan..." : "Simpan anggaran"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

export default function RjpuAnggaranPage({ userRole }) {
  const [programs, setPrograms] = useState([]);
  const [anggaran, setAnggaran] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [bidang, setBidang] = useState("");
  const [year, setYear] = useState("2027");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const loadId = useRef(0);
  const editorRef = useRef(null);

  const load = useCallback(async () => {
    const id = ++loadId.current;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const [p, a] = await Promise.all([
        rjpuAnggaranService.getAccessiblePrograms(),
        rjpuAnggaranService.getAllAnggaran(),
      ]);
      if (id !== loadId.current) return;
      setPrograms(p);
      setAnggaran(a);
      setLastUpdated(new Date());
    } catch (e) {
      if (id !== loadId.current) return;
      setError(e.message || "Data anggaran gagal dimuat");
    } finally {
      if (id === loadId.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    return () => {
      loadId.current++;
    };
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [query, bidang, year, status]);
  useEffect(() => {
    if (selected)
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selected]);

  const allByNo = useMemo(() => {
    const map = new Map();
    for (const a of anggaran) {
      if (!map.has(a.no)) map.set(a.no, []);
      map.get(a.no).push(a);
    }
    return map;
  }, [anggaran]);
  const bidangOptions = useMemo(
    () => [...new Set(programs.map((p) => p.bidang).filter(Boolean))].sort(),
    [programs],
  );
  const yearOptions = useMemo(
    () =>
      [...new Set([...DEFAULT_YEARS, ...anggaran.map((a) => a.tahun)])].sort(
        (a, b) => a - b,
      ),
    [anggaran],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return programs
      .map((p) => {
        const all = allByNo.get(p.no) || [];
        const rows = all.filter((r) => r.tahun === Number(year));
        return { ...p, rows, totals: sumRows(rows) };
      })
      .filter((p) => {
        const match =
          !q ||
          `${p.no} ${p.programKerja} ${p.bidang} ${p.kategori}`
            .toLowerCase()
            .includes(q);
        const matchStatus =
          !status ||
          (status === "empty" && !p.rows.length) ||
          (status === "pending" && p.rows.some((r) => r.aki == null)) ||
          (status === "negative" && p.rows.some((r) => r.aki < 0)) ||
          (status === "ready" &&
            p.rows.length > 0 &&
            p.rows.every((r) => r.aki != null && r.aki >= 0));
        return match && (!bidang || p.bidang === bidang) && matchStatus;
      });
  }, [programs, allByNo, query, bidang, year, status]);
  const summary = useMemo(
    () => sumRows(filtered.flatMap((p) => p.rows)),
    [filtered],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const selectedProgram = programs.find((p) => p.no === selected);
  const registered = filtered.filter((p) => p.rows.length).length;

  function handleSaved(no, rows) {
    setAnggaran((prev) => [...prev.filter((r) => r.no !== no), ...rows]);
    setSelected(null);
    setLastUpdated(new Date());
    setMessage(`Anggaran ${no} berhasil disimpan ke Google Sheets.`);
  }
  function openEditor(no) {
    if (selected && selected !== no) return;
    setMessage("");
    setSelected(no);
  }

  return (
    <div className="space-y-5 text-slate-800">
      <section
        className={`${card} flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6`}
      >
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <FiCalendar size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-sky-600">
              RJPU / Budget Planning
            </p>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              Anggaran RJPU Multiyears
            </h1>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Kelola material, jasa, dan penetapan AKI per tahun berdasarkan NO
              program.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] text-slate-400">
            {lastUpdated
              ? `Sinkron ${lastUpdated.toLocaleTimeString("id-ID")}`
              : "Google Sheets"}{" "}
          </span>
          <button
            type="button"
            className={secondary}
            onClick={load}
            disabled={loading || Boolean(selected)}
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </section>
      {error && (
        <Notice>
          {error}{" "}
          {programs.length > 0 &&
            "Data terakhir masih ditampilkan; lakukan refresh sebelum mengedit."}
        </Notice>
      )}
      {message && <Notice type="success">{message}</Notice>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={FiLayers}
          title={`Program · ${year}`}
          value={`${registered} / ${filtered.length}`}
          detail="Program dengan anggaran tahun terpilih"
        />
        <Metric
          icon={FiPackage}
          title="Material"
          value={rupiah(summary.material)}
          detail={`Nilai tahun ${year} sesuai filter`}
        />
        <Metric
          icon={FiTool}
          title="Jasa"
          value={rupiah(summary.jasa)}
          detail={`Nilai tahun ${year} sesuai filter`}
        />
        <Metric
          icon={FiActivity}
          title="AKI Penetapan"
          value={rupiah(summary.aki)}
          detail={
            summary.pending
              ? `${summary.pending} AKI belum lengkap · total parsial`
              : `AKI terhitung tahun ${year}`
          }
        />
      </div>
      {selectedProgram && (
        <div ref={editorRef} className="scroll-mt-24">
          <AnggaranEditor
            key={selectedProgram.no}
            program={selectedProgram}
            existing={allByNo.get(selectedProgram.no) || []}
            onClose={() => setSelected(null)}
            onSaved={handleSaved}
          />
        </div>
      )}
      <section className={`${card} overflow-hidden`}>
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Daftar program kerja
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Anggaran tahun {year} ·{" "}
                {userRole === "Admin"
                  ? "Akses admin"
                  : "Sesuai bidang pengguna"}
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {filtered.length} program
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(210px,2fr)_1fr_1fr_1fr]">
            <label className="relative block">
              <span className="sr-only">Cari program</span>
              <FiSearch className="absolute left-3 top-3.5 text-slate-400" />
              <input
                className={`${field} pl-9`}
                placeholder="Cari NO, program, bidang..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Filter tahun anggaran"
              className={field}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter bidang"
              className={field}
              value={bidang}
              onChange={(e) => setBidang(e.target.value)}
            >
              <option value="">Semua bidang</option>
              {bidangOptions.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
            <select
              aria-label="Filter status"
              className={field}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Semua status</option>
              <option value="empty">Belum diinput</option>
              <option value="pending">AKI belum lengkap</option>
              <option value="negative">AKI negatif</option>
              <option value="ready">Terhitung</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-xs">
            <thead className="bg-[#101b34] text-white">
              <tr>
                {[
                  "NO / Program kerja",
                  "Bidang",
                  "Tahun pekerjaan",
                  "Material",
                  "Jasa",
                  "Total",
                  "AKI",
                  "Status",
                  "Aksi",
                ].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    <FiRefreshCw
                      className="mx-auto mb-2 animate-spin"
                      size={22}
                    />
                    Memuat program dan anggaran...
                  </td>
                </tr>
              ) : !visible.length ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    {error
                      ? "Data gagal dimuat. Klik Refresh."
                      : "Tidak ada program yang sesuai filter."}
                  </td>
                </tr>
              ) : (
                visible.map((p) => (
                  <tr key={p.no} className="hover:bg-slate-50/80">
                    <td className="min-w-[220px] max-w-[360px] px-4 py-3">
                      <p className="font-bold text-sky-700">{p.no}</p>
                      <p className="mt-1 leading-5 text-slate-800">
                        {p.programKerja}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {p.kategori}
                      </p>
                    </td>
                    <td className="px-4 py-3">{p.bidang || "—"}</td>
                    <td className="px-4 py-3">{p.tahun || "—"}</td>
                    {["material", "jasa", "total", "aki"].map((k) => (
                      <td
                        key={k}
                        className={`whitespace-nowrap px-4 py-3 tabular-nums ${k === "aki" && p.totals.aki < 0 ? "text-rose-600 font-semibold" : k === "aki" ? "text-emerald-700 font-semibold" : ""}`}
                      >
                        {!p.rows.length || (k === "aki" && p.totals.pending)
                          ? "—"
                          : nf.format(p.totals[k])}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <Status rows={p.rows} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-2 font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-40"
                        disabled={Boolean(selected) || Boolean(error)}
                        onClick={() => openEditor(p.no)}
                      >
                        <FiEdit2 size={13} />{" "}
                        {allByNo.has(p.no) ? "Edit" : "Input"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && visible.length > 0 && (
              <tfoot className="border-t border-slate-200 bg-slate-50 font-bold text-slate-700">
                <tr>
                  <td colSpan={3} className="px-4 py-3">
                    Total hasil filter (seluruh halaman)
                  </td>
                  {["material", "jasa", "total", "aki"].map((k) => (
                    <td
                      key={k}
                      className="whitespace-nowrap px-4 py-3 tabular-nums"
                    >
                      {nf.format(summary[k])}
                      {k === "aki" && summary.pending ? " *" : ""}
                    </td>
                  ))}
                  <td colSpan={2} className="px-4 py-3 text-[10px] font-normal">
                    {summary.pending ? "* AKI parsial" : ""}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
          <p className="text-xs text-slate-500">
            {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} dari{" "}
            {filtered.length} program
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={secondary}
              aria-label="Halaman sebelumnya"
              disabled={loading || currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <FiChevronLeft />
            </button>
            <span className="text-xs font-semibold">
              {currentPage} / {pages}
            </span>
            <button
              type="button"
              className={secondary}
              aria-label="Halaman berikutnya"
              disabled={loading || currentPage >= pages}
              onClick={() => setPage(currentPage + 1)}
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </section>
      <p className="text-[11px] leading-5 text-slate-400">
        Data program diambil dari sheet Data. Anggaran disimpan hanya pada
        Anggaran_RJPU. Rekap tahun terpilih tidak menjumlahkan saldo lintas
        tahun. Nilai AKI mengikuti rumus service dan bukan konfirmasi
        persetujuan anggaran.
      </p>
    </div>
  );
}
