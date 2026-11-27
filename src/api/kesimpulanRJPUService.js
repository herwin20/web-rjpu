const ALIASES = {
  id: "no",
  nama: "programKerja",
  cluster: "klusterProgram",
  basis: "dasarInputProgram",
  sasaran: "sasaranRjpp",
  sumberAnggaran: "sumberAnggaran",
  estLevering: "estLevering",
  inherent: "levelResikoInherent",
  residual: "levelRisikoResidual",
  tahun: "tahun",
  harga: "hargaTotal",
  bidang: "bidang",
  tkdn: "tkdn",
  strategis: "strategisRjpu",
  status: "keterangan",
  unit: "unit",
  aset: "aset",
};
const clean = (v) => String(v ?? "").trim();
export const normalize = (v) => clean(v).replace(/\s+/g, " ").toLowerCase();
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
const lookup = (obj, value) => {
  const key = Object.keys(obj || {}).find(
    (k) => !k.startsWith("_") && normalize(k) === normalize(value),
  );
  return key === undefined ? undefined : obj[key];
};
export function splitUnits(value) {
  const m = new Map();
  for (const v of Array.isArray(value) ? value : clean(value).split(",")) {
    if (clean(v) && !m.has(normalize(v))) m.set(normalize(v), clean(v));
  }
  return [...m.values()];
}
// Google Sheets UNFORMATTED_VALUE lebih baik. Mendukung format Rp Indonesia dan angka JS.
export function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let s = clean(value)
    .replace(/^Rp\.?\s*/i, "")
    .replace(/\s/g, "");
  if (!s || !/^[+-]?[\d.,]+$/.test(s)) return null;
  if (s.includes(".") && s.includes(",")) {
    s =
      s.lastIndexOf(",") > s.lastIndexOf(".")
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
  } else if (/^[+-]?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  else if (/^[+-]?\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, "");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
const yearValue = (v) => {
  const n = parseNumber(v);
  return Number.isInteger(n) && n >= 1900 && n <= 2200 ? n : null;
};
export function interpolate(points, value) {
  if (!Number.isFinite(value) || !Array.isArray(points) || !points.length)
    return null;
  if (value <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i],
      [x0, y0] = points[i - 1];
    if (value <= x) return y0 + ((y - y0) * (value - x0)) / (x - x0);
  }
  return points[points.length - 1][1];
}
export function mapProgram(program, model) {
  const result = {};
  for (const [k, alias] of Object.entries(ALIASES)) {
    const header =
      model.technical_model.fieldMap[k] ||
      (k === "unit" ? "UNIT" : k === "aset" ? "ASET" : alias);
    const candidates = [alias, header, k];
    const found = candidates.find(
      (key) => own(program, key) && clean(program[key]) !== "",
    );
    result[k] = found ? program[found] : "";
  }
  result.priceUnit = program.satuanHarga ?? program["SATUAN HARGA"] ?? "";
  return result;
}

const CRITERIA = {
  inherentRisk: ["risiko", "Risiko inherent"],
  riskReduction: ["risiko", "Penurunan risiko"],
  clusterPriority: ["strategis", "Prioritas kluster"],
  strategicAlignment: ["strategis", "Keselarasan strategis"],
  basisInput: ["strategis", "Dasar input"],
  timing: ["waktu", "Urgensi tahun"],
  leadTime: ["waktu", "Lead time (bulan)"],
  status: ["waktu", "Status / komitmen"],
};
const GROUPS = {
  risiko: "Risiko & Keandalan",
  strategis: "Strategis & Kebutuhan",
  waktu: "Waktu & Kesiapan",
};
// V2 tidak memuat tier; gunakan ambang V1 sebagai label tampilan sementara, bukan hasil training.
const TIERS = [
  ["P1", 78, "Prioritas Utama"],
  ["P2", 62, "Prioritas Tinggi"],
  ["P3", 48, "Prioritas Sedang"],
  ["P4", 0, "Prioritas Rendah"],
];
export const normalizeUnit = (v) =>
  clean(v)
    .toUpperCase()
    .replace(/[.\s-]/g, "");
export function validateModel(model) {
  const t = model?.technical_model;
  if (
    !t?.weights ||
    !t.lookups ||
    !t.scales ||
    !t.fieldMap ||
    !model.unit_predictions ||
    t.missingPolicy !== "review_no_score"
  )
    throw new Error(
      "Gunakan rjpu_model_v2.json asli dari Colab (technical_model).",
    );
  if (yearValue(model.meta?.forecast_year) === null)
    throw new Error("Tahun forecast model tidak valid.");
  const keys = Object.keys(CRITERIA);
  if (
    Object.keys(t.weights).length !== keys.length ||
    keys.some((k) => !Number.isFinite(t.weights[k]) || t.weights[k] <= 0)
  )
    throw new Error("Bobot MCDA v2 tidak valid.");
  for (const k of [
    "riskLevels",
    "levelsReducedScore",
    "clusters",
    "strategicCodes",
    "basisInput",
    "status",
  ])
    if (!t.lookups[k]) throw new Error(`Lookup ${k} tidak tersedia.`);
  for (const k of ["timingYearOffset", "leadTimeSlackMonths"])
    if (
      !Array.isArray(t.scales[k]) ||
      !t.scales[k].length ||
      t.scales[k].some(
        (p, i) =>
          !Array.isArray(p) ||
          p.length !== 2 ||
          !p.every(Number.isFinite) ||
          (i && p[0] <= t.scales[k][i - 1][0]),
      )
    )
      throw new Error(`Skala ${k} tidak valid.`);
  return model;
}
export function defaultOptions(model) {
  return {
    baseYear: model.meta.forecast_year,
    discountRate: model.economics?.discount_rate ?? null,
    inflationRate: null,
    priceReferenceYear: model.meta.forecast_year,
    priceMode: "rupiah",
    priceBasis: "target",
  };
}
function optionsFor(model, settings = {}) {
  const o = { ...defaultOptions(model), ...settings };
  if (
    yearValue(o.baseYear) === null ||
    yearValue(o.priceReferenceYear) === null
  )
    throw new Error("Tahun analisis/referensi tidak valid.");
  for (const k of ["discountRate", "inflationRate"])
    if (o[k] !== null && (!Number.isFinite(o[k]) || o[k] < 0 || o[k] > 1))
      throw new Error("Diskonto/inflasi harus 0–100% atau kosong.");
  if (
    !["rupiah", "ribu"].includes(o.priceMode) ||
    !["target", "reference"].includes(o.priceBasis)
  )
    throw new Error("Mode harga tidak valid.");
  return o;
}
const finite = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const inputNumber = (v) => {
  if (typeof v === "number") return finite(v);
  const s = clean(v);
  if (!s || !/^[-+]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(s)) return null;
  return finite(Number(s.replace(",", ".")));
};
const fraction = (v) => {
  const n = inputNumber(v);
  return n !== null && n >= 0 && n <= 1 ? n : null;
};
const inputNonnegative = (v) => {
  const n = inputNumber(v);
  return n !== null && n >= 0 ? n : null;
};
const nonnegative = (v) => {
  const n = parseNumber(v);
  return n !== null && n >= 0 ? n : null;
};
const annuity = (r, n) => (r === 0 ? n : (1 - (1 + r) ** -n) / r);
export const ECON_FIELDS = [
  ["MARGIN_RP_KWH", "Margin produksi (Rp/kWh)"],
  ["ANNUAL_REPAIR_COST_RP", "Biaya repair baseline (Rp/tahun)"],
  ["ANNUAL_AVOIDED_REPAIR_RP", "Repair cost yang dihindari (Rp/tahun)"],
  ["ATTRIBUTABLE_FRACTION", "Porsi loss terkait program (0–1)"],
  ["EFFECTIVENESS", "Efektivitas mitigasi (0–1)"],
  ["ANNUAL_EXTRA_OM_RP", "Tambahan O&M (Rp/tahun)"],
  ["LIFETIME_YEARS", "Umur manfaat (tahun)"],
  ["DISCOUNT_RATE", "Diskonto (0–1; kosong = global)"],
  [
    "APPROVED_LOSS_MWH",
    "Loss tahunan baseline tervalidasi (MWh; multi-unit wajib)",
  ],
  ["GAS_RP_MMBTU", "Harga gas (Rp/MMBTU)"],
  ["HSD_RP_LITER", "Harga HSD (Rp/liter)"],
  ["ANNUAL_GAS_SAVING_MMBTU", "Penghematan gas tahunan (MMBTU)"],
  ["ANNUAL_HSD_SAVING_LITER", "Penghematan HSD tahunan (liter)"],
  ["ANNUAL_OTHER_SAVING_RP", "Manfaat lain terverifikasi (Rp/tahun)"],
  ["EVIDENCE", "Sumber data / kajian"],
  ["APPROVED_BY", "Pemeriksa / validator"],
];
// Input per program; tidak mengambil EAL lookup atau exposure multiplier V1.
// Metode reliability: baseline × attribution × effectiveness; repair avoided sudah NET pengurangan.
// Metode efficiency: kuantitas fuel saving yang sudah diproyeksikan setelah program × harga.
// Metode other: manfaat tahunan yang dihitung di luar model dan dapat ditelusuri.
export function calculateEconomics(p, unitRows, o, input = {}) {
  const missing = [],
    notes = [];
  const read = (k, fn = inputNonnegative) => {
    const n = fn(input[k]);
    if (n === null) missing.push(k);
    return n;
  };
  const rawPrice = nonnegative(p.harga),
    year = yearValue(p.tahun),
    offset = year === null ? null : Math.max(0, year - o.baseYear);
  let multiplier = o.priceMode === "ribu" ? 1000 : 1;
  const explicit = normalize(p.priceUnit);
  if (["rupiah", "rp", "idr"].includes(explicit)) multiplier = 1;
  else if (
    ["ribu", "ribu rupiah", "rp ribu", "idr ribu", "rp 000"].includes(explicit)
  )
    multiplier = 1000;
  else if (explicit) {
    multiplier = null;
    notes.push("Satuan harga eksplisit tidak dikenal.");
  }
  const priceRp =
    rawPrice > 0 && multiplier !== null ? rawPrice * multiplier : null;
  if (priceRp === null) missing.push("HARGA TOTAL / SATUAN HARGA");
  if (year === null) missing.push("TAHUN");
  if (year !== null && year < o.baseYear)
    notes.push(
      "Tahun rencana lewat; diasumsikan investasi sekarang untuk skenario.",
    );
  const ownRate = clean(input.DISCOUNT_RATE) !== "";
  const rate = ownRate ? fraction(input.DISCOUNT_RATE) : o.discountRate;
  if (rate === null) missing.push("DISCOUNT_RATE");
  const escalation =
    o.priceBasis === "target"
      ? 1
      : o.inflationRate === null || year === null
        ? null
        : (1 + o.inflationRate) **
          (Math.max(year, o.baseYear) - o.priceReferenceYear);
  if (escalation === null) missing.push("INFLATION_RATE / TAHUN");
  const nominalCost =
    priceRp !== null && escalation !== null ? priceRp * escalation : null;
  const discount =
    rate !== null && offset !== null ? (1 + rate) ** offset : null;
  const pvInvestment =
    nominalCost !== null && discount !== null ? nominalCost / discount : null;
  const method = clean(input.METHOD) || "reliability";
  let lossBaseline = null,
    avoidedMwh = null,
    avoidedRepair = null,
    fuelSaving = null,
    annualBenefit = null;
  const life = read("LIFETIME_YEARS", (v) => {
    const n = inputNumber(v);
    return Number.isInteger(n) && n > 0 && n <= 100 ? n : null;
  });
  const om = read("ANNUAL_EXTRA_OM_RP");
  if (!clean(input.EVIDENCE)) missing.push("EVIDENCE");
  if (!clean(input.APPROVED_BY)) missing.push("APPROVED_BY");
  if (method === "reliability") {
    const manual = clean(input.APPROVED_LOSS_MWH) !== "";
    if (manual) lossBaseline = read("APPROVED_LOSS_MWH");
    else if (
      splitUnits(p.unit)
        .map(normalizeUnit)
        .filter((u, i, a) => u && a.indexOf(u) === i).length === 1 &&
      unitRows.length === 1
    ) {
      lossBaseline = finite(unitRows[0].loss_forecast);
      if (lossBaseline === null) missing.push("APPROVED_LOSS_MWH");
      else
        notes.push(
          "Baseline unit forecast 2026 (atau tahun model); bukan Loss aktual program. Validasi porsi atribusi.",
        );
    } else
      missing.push("APPROVED_LOSS_MWH (multi-unit/Common/tidak terpetakan)");
    const margin = read("MARGIN_RP_KWH"),
      share = read("ATTRIBUTABLE_FRACTION", fraction),
      eff = read("EFFECTIVENESS", fraction);
    const repair = read("ANNUAL_REPAIR_COST_RP");
    avoidedRepair = read("ANNUAL_AVOIDED_REPAIR_RP");
    if (repair !== null && avoidedRepair !== null && avoidedRepair > repair)
      missing.push("Avoided repair melebihi biaya repair baseline");
    if (
      [lossBaseline, margin, share, eff, avoidedRepair].every((v) => v !== null)
    ) {
      avoidedMwh = lossBaseline * share * eff;
      annualBenefit = avoidedMwh * 1000 * margin + avoidedRepair;
    }
  } else if (method === "efficiency") {
    const gas = read("ANNUAL_GAS_SAVING_MMBTU"),
      hsd = read("ANNUAL_HSD_SAVING_LITER");
    const gp = gas === 0 ? 0 : read("GAS_RP_MMBTU"),
      hp = hsd === 0 ? 0 : read("HSD_RP_LITER");
    if ([gas, hsd, gp, hp].every((v) => v !== null)) {
      fuelSaving = gas * gp + hsd * hp;
      annualBenefit = fuelSaving;
    }
  } else if (method === "other") {
    annualBenefit = read("ANNUAL_OTHER_SAVING_RP");
  } else missing.push("METHOD tidak dikenal");
  const ready =
    missing.length === 0 && annualBenefit !== null && pvInvestment !== null;
  const factor = ready ? annuity(rate, life) / discount : null;
  const pvCost = ready ? pvInvestment + om * factor : null;
  const pvBenefit = ready ? annualBenefit * factor : null;
  const npv = ready ? pvBenefit - pvCost : null,
    bcr = ready && pvCost > 0 ? pvBenefit / pvCost : null;
  const payback =
    ready && annualBenefit > om ? nominalCost / (annualBenefit - om) : null;
  return {
    method,
    rawPrice,
    priceRp,
    nominalCost,
    pvInvestment,
    pvCost,
    pvBenefit,
    npv,
    bcr,
    payback,
    life,
    annualBenefit: ready ? annualBenefit : null,
    lossBaseline,
    avoidedMwh: ready ? avoidedMwh : null,
    avoidedRepair: ready ? avoidedRepair : null,
    fuelSaving: ready ? fuelSaving : null,
    economicMissing: missing,
    economicNotes: notes,
    economicState: ready
      ? npv >= 0
        ? "NPV ≥ 0"
        : "NPV negatif"
      : "Data belum lengkap",
  };
}
function evaluateMapped(p, model, o, input) {
  const t = model.technical_model,
    L = t.lookups,
    S = t.scales;
  const risks = Object.keys(L.riskLevels)
    .filter((k) => !k.startsWith("_"))
    .sort((a, b) => L.riskLevels[a].score - L.riskLevels[b].score);
  const inherent =
      risks.find((k) => normalize(k) === normalize(p.inherent)) ?? null,
    residual =
      risks.find((k) => normalize(k) === normalize(p.residual)) ?? null;
  const reduction =
    inherent && residual
      ? risks.indexOf(inherent) - risks.indexOf(residual)
      : null;
  const year = yearValue(p.tahun),
    lead = nonnegative(p.estLevering),
    offset = year === null ? null : Math.max(0, year - o.baseYear);
  const slack = offset !== null && lead !== null ? offset * 12 - lead : null;
  const scores = {
    inherentRisk: inherent ? L.riskLevels[inherent].score : null,
    riskReduction:
      reduction === null
        ? null
        : reduction < 0
          ? 0
          : lookup(L.levelsReducedScore, String(reduction)),
    clusterPriority: lookup(L.clusters, p.cluster)?.score,
    strategicAlignment: lookup(L.strategicCodes, p.strategis),
    basisInput: lookup(L.basisInput, p.basis),
    timing: interpolate(S.timingYearOffset, offset),
    leadTime: interpolate(
      S.leadTimeSlackMonths,
      slack === null ? null : Math.max(0, slack),
    ),
    status: lookup(L.status, p.status),
  };
  const total = Object.values(t.weights).reduce((s, w) => s + w, 0);
  const breakdown = Object.entries(t.weights).map(([id, w]) => {
    const score = finite(scores[id]),
      weight = (w * 100) / total;
    return {
      id,
      group: CRITERIA[id][0],
      label: CRITERIA[id][1],
      weight,
      score,
      contribution: score === null ? null : (score * w) / total,
    };
  });
  const missing = breakdown.filter((c) => c.score === null).map((c) => c.label),
    coverage = breakdown
      .filter((c) => c.score !== null)
      .reduce((s, c) => s + c.weight, 0);
  const finalScore = missing.length
    ? null
    : breakdown.reduce((s, c) => s + c.contribution, 0);
  const mandatory = (t.overrides || []).some((rule) =>
    (rule.any || []).some((c) =>
      own(c, "equals")
        ? normalize(p[c.field]) === normalize(c.equals)
        : (c.in || []).some((v) => normalize(p[c.field]) === normalize(v)),
    ),
  );
  const tier =
    finalScore === null
      ? ["REVIEW", 0, "Kriteria belum lengkap"]
      : TIERS.find((x) => finalScore >= x[1]) || TIERS[3];
  const units = [
    ...new Map(splitUnits(p.unit).map((u) => [normalizeUnit(u), u])).values(),
  ];
  const preds = Object.fromEntries(
    Object.entries(model.unit_predictions).map(([k, v]) => [
      normalizeUnit(k),
      v,
    ]),
  );
  const unitRows = units.map((u) => preds[normalizeUnit(u)]).filter(Boolean);
  const unknownUnits = units.filter((u) => !preds[normalizeUnit(u)]);
  const exposures = unitRows
    .map((u) => u.exposure_index)
    .filter(Number.isFinite);
  const economic = calculateEconomics(p, unitRows, o, input);
  const flags = missing.map((x) => `Kriteria belum valid: ${x}`);
  if (!units.length || unknownUnits.length)
    flags.push(
      `Pemetaan unit belum lengkap: ${unknownUnits.join(", ") || "unit kosong"}`,
    );
  if (reduction !== null && reduction < 0)
    flags.push("Risiko residual lebih tinggi; review.");
  if (slack !== null && slack < 0)
    flags.push("Lead time melebihi waktu menuju tahun rencana.");
  if (economic.priceRp === null) flags.push("Harga belum valid.");
  if (!["ai", "ao"].includes(normalize(p.sumberAnggaran)))
    flags.push("Sumber anggaran belum valid.");
  const groups = Object.entries(GROUPS).map(([id, label]) => {
    const items = breakdown.filter((c) => c.group === id),
      weight = items.reduce((s, c) => s + c.weight, 0),
      contribution = items.some((c) => c.score === null)
        ? null
        : items.reduce((s, c) => s + c.contribution, 0);
    return {
      id,
      label,
      weight,
      contribution,
      score: contribution === null ? null : (100 * contribution) / weight,
    };
  });
  return {
    ...p,
    ...economic,
    id: clean(p.id),
    nama: clean(p.nama),
    year,
    units,
    unitRows,
    unknownUnits,
    exposureIndex: exposures.length ? Math.max(...exposures) : null,
    inherent,
    residual,
    slack,
    breakdown,
    groups,
    missing,
    coverage,
    finalScore,
    tier: tier[0],
    tierName: tier[2],
    mandatory,
    flags,
    needsReview: flags.length > 0,
    economicInput: input,
  };
}
export function evaluateProgram(program, model, settings = {}, input = {}) {
  validateModel(model);
  return evaluateMapped(
    mapProgram(program, model),
    model,
    optionsFor(model, settings),
    input,
  );
}
export function rankPrograms(programs, model, settings = {}, assessments = {}) {
  validateModel(model);
  const o = optionsFor(model, settings),
    active = [],
    excluded = [],
    invalid = [];
  const all = programs
    .map((r, i) => ({ ...mapProgram(r, model), index: i }))
    .filter((p) => clean(p.nama));
  const counts = new Map();
  for (const p of all) {
    const id = normalize(p.id);
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  for (const p of all) {
    const id = normalize(p.id);
    if (!id || counts.get(id) > 1) {
      invalid.push({
        id: p.id,
        nama: p.nama,
        reason: !id
          ? "NO kosong"
          : "NO duplikat — seluruh baris ID ini ditahan",
      });
      continue;
    }
    if (
      (model.technical_model.excludeStatus || [])
        .map(normalize)
        .includes(normalize(p.status))
    ) {
      excluded.push(p);
      continue;
    }
    active.push({
      ...evaluateMapped(
        p,
        model,
        o,
        own(assessments, id) ? assessments[id] : {},
      ),
      rowKey: id,
    });
  }
  // Sama dengan notebook: mandatory dahulu, lalu skor teknis, null terakhir dalam kelompok.
  active.sort(
    (a, b) =>
      Number(b.mandatory) - Number(a.mandatory) ||
      (b.finalScore ?? -1) - (a.finalScore ?? -1) ||
      a.id.localeCompare(b.id, "id", { numeric: true }),
  );
  let rank = 0;
  return {
    rows: active.map((p) => ({
      ...p,
      rank: p.finalScore === null ? null : ++rank,
    })),
    excluded,
    invalid,
    options: o,
  };
}
export function summarize(rows) {
  const counts = { P1: 0, P2: 0, P3: 0, P4: 0, REVIEW: 0 },
    funding = { AI: 0, AO: 0, Lainnya: 0 };
  let total = 0,
    review = 0,
    mandatory = 0,
    economic = 0,
    missingCost = 0;
  for (const r of rows) {
    counts[r.tier]++;
    review += Number(r.needsReview);
    mandatory += Number(r.mandatory);
    economic += Number(r.npv !== null);
    const cost = r.nominalCost ?? r.priceRp;
    if (cost === null) missingCost++;
    else {
      total += cost;
      const s = clean(r.sumberAnggaran).toUpperCase();
      funding[own(funding, s) ? s : "Lainnya"] += cost;
    }
  }
  return {
    count: rows.length,
    counts,
    funding,
    total,
    review,
    mandatory,
    economic,
    missingCost,
  };
}
let modelPromise;
class KesimpulanRjpuService {
  async loadModel(force = false) {
    if (!modelPromise || force)
      modelPromise = fetch(
        `${import.meta.env.BASE_URL}models/rjpu_model_v2.json`,
        { cache: "no-store" },
      )
        .then((r) => {
          if (!r.ok) throw new Error(`Model v2 gagal dimuat (${r.status}).`);
          return r.json();
        })
        .then(validateModel)
        .catch((e) => {
          modelPromise = null;
          throw e;
        });
    return modelPromise;
  }
  async loadPrograms() {
    const { default: dataSheet } = await import("./dataSheetService");
    const user = await dataSheet.getUserFilter();
    if (!user?.isAdmin && !clean(user?.bidangFilter))
      throw new Error("Akses tidak tersedia. Login ulang.");
    const data = await dataSheet.getAllData(false);
    if (!Array.isArray(data)) throw new Error("Format data RJPU tidak valid.");
    return user.isAdmin
      ? data
      : data.filter((p) => p.bidang === user.bidangFilter);
  }
  rank(programs, model, settings, assessments) {
    return rankPrograms(programs, model, settings, assessments);
  }
}
export default new KesimpulanRjpuService();
