// api/dataSheetService.js  (VERSI OPTIMASI)
import sheetsService from "./googleSheetService";
import loginService from "./loginSheetService";

// ============================================================
// KONSTANTA
// ============================================================
const SHEET_DATA = "Data";
const SHEET_NOTIF = "Notification";
const SHEET_DROP = "Drop";
const SNAPSHOT_KEY = "rjpu:data:snapshot";

const COLUMN_NAMES = [
  "NO",
  "PROGRAM KERJA",
  "ALASAN PROGRAM",
  "KLUSTER PROGRAM",
  "OEM/NON OEM",
  "DASAR INPUT PROGRAM",
  "SASARAN RJPP",
  "SUMBER ANGGARAN",
  "EST LEVERING",
  "LEVEL RESIKO INHERENT",
  "LEVEL RISIKO RESIDUAL",
  "SAT",
  "VOL",
  "TAHUN",
  "HARGA TOTAL",
  "FILE",
  "BIDANG",
  "KATEGORI",
  "HARGA MATERIAL",
  "HARGA JASA",
  "TKDN",
  "STRATEGIS RJPU",
  "ASET",
  "DESCRIPTION ASET",
  "KETERANGAN",
  "PROFIL RISK",
  "AKTIVITAS AO",
  "UNIT",
];

// Urutan key sama persis dengan urutan kolom A..AB
const FIELD_KEYS = [
  "no",
  "programKerja",
  "alasanProgram",
  "klusterProgram",
  "oemNonOem",
  "dasarInputProgram",
  "sasaranRjpp",
  "sumberAnggaran",
  "estLevering",
  "levelResikoInherent",
  "levelRisikoResidual",
  "sat",
  "vol",
  "tahun",
  "hargaTotal",
  "file",
  "bidang",
  "kategori",
  "hargaMaterial",
  "hargaJasa",
  "tkdn",
  "strategisRjpu",
  "aset",
  "descriptionAset",
  "keterangan",
  "profilRisk",
  "aktivitasAo",
  "unit",
];

// Sheet Drop = 25 kolom pertama Data + 6 kolom tambahan (total 31, A..AE)
const DROP_HEADERS = [
  ...COLUMN_NAMES.slice(0, 25),
  "DROP DATE",
  "DROP STATUS",
  "ORIGINAL NO",
  "PROFIL RISK",
  "AKTIVITAS AO",
  "UNIT",
];

const NOTIF_HEADERS = [
  "ID_NOTIF",
  "PROGRAM_NO",
  "PROGRAM_KERJA",
  "PENGIRIM",
  "BIDANG_PENGIRIM",
  "TANGGAL_KIRIM",
  "STATUS",
  "DIBACA_OLEH",
  "TANGGAL_BACA",
  "CATATAN",
];

const num = (v) => parseFloat(v) || 0;
const MAX_ASETS = 10;
const splitAsets = (value) => [
  ...new Set(
    (Array.isArray(value) ? value : String(value ?? "").split(","))
      .map((x) => String(x).trim())
      .filter(Boolean),
  ),
];
const normalizeAsets = (value) => {
  const names = splitAsets(value);
  if (names.length > MAX_ASETS)
    throw new Error("Maksimal 10 aset per program.");
  return names.join(", ");
};

class DataSheetOperations {
  constructor() {
    this.sheetName = SHEET_DATA;
    this.columns = {
      NO: 0,
      PROGRAM_KERJA: 1,
      ALASAN_PROGRAM: 2,
      KLUSTER_PROGRAM: 3,
      OEM_NON_OEM: 4,
      DASAR_INPUT_PROGRAM: 5,
      SASARAN_RJPP: 6,
      SUMBER_ANGGARAN: 7,
      EST_LEVERING: 8,
      LEVEL_RESIKO_INHERENT: 9,
      LEVEL_RISIKO_RESIDUAL: 10,
      SAT: 11,
      VOL: 12,
      TAHUN: 13,
      HARGA_TOTAL: 14,
      FILE: 15,
      BIDANG: 16,
      KATEGORI: 17,
      HARGA_MATERIAL: 18,
      HARGA_JASA: 19,
      TKDN: 20,
      STRATEGIS_RJPU: 21,
      ASET: 22,
      DESCRIPTION_ASET: 23,
      KETERANGAN: 24,
      PROFIL_RISK: 25,
      AKTIVITAS_AO: 26,
      UNIT: 27,
    };
    this.columnNames = COLUMN_NAMES;
    this.dataRange = "A:AB";
    this.lastColumnLetter = "AB";
    this.validKategori = ["Material", "Jasa", "Material & Jasa"];

    // ==== Opsi ====
    // Renumber otomatis setelah delete/drop mahal (baca+tulis seluruh sheet) dan
    // mengubah ID program lain (PROGRAM_NO di sheet Notification jadi tidak sinkron).
    // ID sudah unik karena getNextSequenceForKode memakai nilai max. Default: mati.
    this.AUTO_RENUMBER = false;

    // ==== Init / ensure ====
    this._initPromise = null;
    this._initAt = 0;
    this.ENSURE_TTL = 5 * 60 * 1000; // 5 menit
    this._dropEnsured = false;

    // ==== Cache mentah (satu sumber kebenaran) ====
    this._raw = { data: null, time: 0, inflight: null, version: 0 };
    this._notif = { data: null, time: 0, inflight: null, version: 0 };
    this.RAW_TTL = 60 * 1000; // 60 detik
    this.NOTIF_TTL = 15 * 1000; // 15 detik

    // ==== Hasil parse (dibangun ulang hanya jika raw berubah) ====
    this._parsed = [];
    this._noMap = new Map();
    this._blobs = [];
    this._parsedVersion = -1;

    this._snapshotMeta = "";
  }

  // ============================================================
  // HELPERS
  // ============================================================
  // Sinkron (tidak ada await di dalamnya). Pemanggil yang memakai `await` tetap jalan.
  getUserFilter() {
    try {
      const isLoggedIn = loginService.checkAuth();
      if (!isLoggedIn) {
        return {
          isAdmin: false,
          bidangFilter: null,
          message: "User not logged in",
        };
      }
      const currentUser = loginService.getCurrentUser();
      const isAdmin = currentUser && currentUser.role === "Admin";
      if (isAdmin) {
        return {
          isAdmin: true,
          bidangFilter: null,
          message: "Admin has full access",
        };
      }
      return {
        isAdmin: false,
        bidangFilter: currentUser ? currentUser.nama : null,
        message: `User filtered by bidang: ${
          currentUser ? currentUser.nama : "unknown"
        }`,
      };
    } catch (error) {
      console.error("Error getting user filter:", error);
      return {
        isAdmin: false,
        bidangFilter: null,
        message: "Error getting user filter",
      };
    }
  }

  escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  normalizeKodeAwal(kodeAwal) {
    if (!kodeAwal) return "";
    return kodeAwal
      .toString()
      .trim()
      .toUpperCase()
      .replace(/^([A-Z])-/, "$1");
  }

  generateProgramId(kodeAwal, urutan) {
    if (!kodeAwal) return `MT-XX-${String(urutan).padStart(3, "0")}`;
    const normalized = this.normalizeKodeAwal(kodeAwal);
    return `MT-${normalized}-${String(urutan).padStart(3, "0")}`;
  }

  // allData boleh berupa array objek {no} ATAU array baris mentah (kolom A = no)
  getNextSequenceForKode(kodeAwal, allData) {
    if (!kodeAwal) return 1;
    const normalized = this.normalizeKodeAwal(kodeAwal);
    let maxSeq = 0;
    const regex = new RegExp(
      `^MT-${this.escapeRegex(normalized)}-(\\d+)$`,
      "i",
    );
    for (const item of allData) {
      const rawNo = Array.isArray(item) ? item[0] : item?.no;
      const no = (rawNo || "").toString().trim();
      const match = no.match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
    return maxSeq + 1;
  }

  validateKategoriHarga(data) {
    const kategori = data.kategori || "";
    if (!this.validKategori.includes(kategori)) {
      return {
        valid: false,
        message:
          "Kategori wajib dipilih (Material, Jasa, atau Material & Jasa)",
      };
    }
    const hM = parseFloat(data.hargaMaterial) || 0;
    const hJ = parseFloat(data.hargaJasa) || 0;
    if (kategori === "Material" && hM <= 0) {
      return {
        valid: false,
        message: "Harga Material wajib diisi > 0 untuk kategori Material",
      };
    }
    if (kategori === "Jasa" && hJ <= 0) {
      return {
        valid: false,
        message: "Harga Jasa wajib diisi > 0 untuk kategori Jasa",
      };
    }
    if (kategori === "Material & Jasa" && (hM <= 0 || hJ <= 0)) {
      return {
        valid: false,
        message: "Harga Material dan Harga Jasa wajib diisi > 0",
      };
    }
    return {
      valid: true,
      hargaMaterial: hM,
      hargaJasa: hJ,
      hargaTotal: hM + hJ,
    };
  }

  // Bangun satu baris A..AB dari objek data (dipakai addData & bulkInsert)
  buildRow(no, d, v) {
    return [
      no,
      d.programKerja || "",
      d.alasanProgram || "",
      d.klusterProgram || "",
      d.oemNonOem || "",
      d.dasarInputProgram || "",
      d.sasaranRjpp || "",
      d.sumberAnggaran || "",
      d.estLevering || "",
      d.levelResikoInherent || "",
      d.levelRisikoResidual || "",
      d.sat || "",
      d.vol || "",
      d.tahun || "",
      v.hargaTotal,
      d.file || "",
      d.bidang || "",
      d.kategori || "",
      v.hargaMaterial || "",
      v.hargaJasa || "",
      d.tkdn || "",
      d.strategisRjpu || "",
      normalizeAsets(d.aset),
      d.descriptionAset || "",
      d.keterangan || "",
      d.profilRisk || "",
      d.aktivitasAo || "",
      String(d.unit || "").trim(),
    ];
  }

  assertWrite(result, fallbackMessage) {
    if (result === false || result?.success === false) {
      throw new Error(result?.message || fallbackMessage);
    }
  }

  // ============================================================
  // CACHE
  // ============================================================
  // Baca dengan TTL + dedupe request paralel.
  async cachedRead(slot, loader, ttl, force = false) {
    if (!force && slot.data && Date.now() - slot.time < ttl) return slot.data;

    if (slot.inflight) {
      if (!force) return slot.inflight;
      try {
        await slot.inflight;
      } catch (_) {
        /* abaikan, lanjut baca ulang */
      }
    }

    const p = (async () => {
      const data = await loader();
      slot.data = Array.isArray(data) ? data : [];
      slot.time = Date.now();
      slot.version++;
      return slot.data;
    })();
    slot.inflight = p;
    try {
      return await p;
    } finally {
      if (slot.inflight === p) slot.inflight = null;
    }
  }

  getSheetRaw(force = false) {
    return this.cachedRead(
      this._raw,
      async () => {
        await this.init();
        return sheetsService.getRawData(SHEET_DATA, this.dataRange);
      },
      this.RAW_TTL,
      force,
    );
  }

  getNotifRaw(force = false) {
    return this.cachedRead(
      this._notif,
      async () => {
        await this.init();
        return sheetsService.getRawData(SHEET_NOTIF, "A:J");
      },
      this.NOTIF_TTL,
      force,
    );
  }

  invalidateAllDataCache() {
    this._raw.time = 0;
  }

  invalidateNotificationCache() {
    this._notif.time = 0;
  }

  // Panggil saat logout / ganti akun
  clearCache() {
    this._raw = { data: null, time: 0, inflight: null, version: 0 };
    this._notif = { data: null, time: 0, inflight: null, version: 0 };
    this._parsed = [];
    this._noMap = new Map();
    this._blobs = [];
    this._parsedVersion = -1;
    this._snapshotMeta = "";
    try {
      if (typeof sessionStorage !== "undefined")
        sessionStorage.removeItem(SNAPSHOT_KEY);
    } catch (_) {
      /* abaikan */
    }
  }

  // Pemanasan cache (mis. dipanggil setelah login)
  prefetch() {
    return this.getAllData();
  }

  refresh() {
    return this.getAllData(false);
  }

  // Tambah baris ke cache setelah append sukses (hanya jika cache = array yang sama)
  _applyAppend(rawRef, rows) {
    if (this._raw.data === rawRef) {
      for (const r of rows) rawRef.push(r);
      this._raw.version++;
    } else {
      this.invalidateAllDataCache();
    }
  }

  _patchRawRow(rowIndex, row) {
    if (this._raw.data && rowIndex >= 0 && rowIndex < this._raw.data.length) {
      this._raw.data[rowIndex] = row;
      this._raw.version++;
    } else {
      this.invalidateAllDataCache();
    }
  }

  // Parse sekali per versi raw: objek, index NO (Map), dan blob pencarian
  _ensureParsed(raw) {
    if (this._parsedVersion === this._raw.version) return;
    const parsed = [];
    const noMap = new Map();
    const blobs = [];
    const C = this.columns;
    for (let i = 1; i < raw.length; i++) {
      const row = raw[i];
      if (!row) continue;
      if (!String(row[C.PROGRAM_KERJA] ?? "").trim()) continue;
      const o = {};
      for (let k = 0; k < FIELD_KEYS.length; k++)
        o[FIELD_KEYS[k]] = row[k] || "";
      parsed.push(o);
      if (o.no) noMap.set(String(o.no), o);
      blobs.push(Object.values(o).join("\u0001").toLowerCase());
    }
    this._parsed = parsed;
    this._noMap = noMap;
    this._blobs = blobs;
    this._parsedVersion = this._raw.version;
  }

  // ---- Snapshot sessionStorage untuk first paint instan ----
  _snapshotUserKey() {
    try {
      const u = loginService.getCurrentUser();
      return u ? `${u.role || ""}|${u.nama || ""}` : "anon";
    } catch (_) {
      return "anon";
    }
  }

  _saveSnapshot(list) {
    if (typeof sessionStorage === "undefined") return;
    const key = this._snapshotUserKey();
    const meta = `${this._raw.version}|${key}`;
    if (this._snapshotMeta === meta) return;
    this._snapshotMeta = meta;
    setTimeout(() => {
      try {
        sessionStorage.setItem(
          SNAPSHOT_KEY,
          JSON.stringify({ user: key, ts: Date.now(), data: list }),
        );
      } catch (_) {
        /* quota penuh / diblokir: abaikan */
      }
    }, 0);
  }

  // Sinkron. Pakai untuk menampilkan data lama dulu sambil getAllData() jalan.
  getSnapshotSync() {
    try {
      if (typeof sessionStorage === "undefined") return null;
      const s = JSON.parse(sessionStorage.getItem(SNAPSHOT_KEY) || "null");
      if (s && s.user === this._snapshotUserKey() && Array.isArray(s.data))
        return s.data;
    } catch (_) {
      /* abaikan */
    }
    return null;
  }

  // ============================================================
  // INIT
  // ============================================================
  init() {
    const now = Date.now();
    if (this._initPromise && now - this._initAt < this.ENSURE_TTL) {
      return this._initPromise;
    }
    this._initAt = now;
    this._initPromise = (async () => {
      await sheetsService.init();
      await Promise.all([this.ensureHeaders(), this.ensureNotificationSheet()]);
    })().catch((e) => {
      this._initPromise = null;
      throw e;
    });
    return this._initPromise;
  }

  async ensureHeaders() {
    try {
      // Cukup baca baris 1, bukan seluruh sheet
      const rawData = await sheetsService.getRawData(SHEET_DATA, "A1:AB1");
      if (
        !Array.isArray(rawData) ||
        rawData.length === 0 ||
        !rawData[0] ||
        rawData[0].length === 0
      ) {
        await sheetsService.writeData(`${SHEET_DATA}!A1:AB1`, [COLUMN_NAMES]);
        console.log("✅ Headers created for Data sheet");
        return;
      }
      const currentHeaders = rawData[0] || [];
      if (
        String(currentHeaders[this.columns.PROFIL_RISK] ?? "").trim() !==
        "PROFIL RISK"
      ) {
        await sheetsService.updateCell(`${SHEET_DATA}!Z1`, "PROFIL RISK");
      }
      if (
        String(currentHeaders[this.columns.AKTIVITAS_AO] ?? "").trim() !==
        "AKTIVITAS AO"
      ) {
        await sheetsService.updateCell(`${SHEET_DATA}!AA1`, "AKTIVITAS AO");
      }
      if (String(currentHeaders[this.columns.UNIT] ?? "").trim() !== "UNIT") {
        await sheetsService.updateCell(`${SHEET_DATA}!AB1`, "UNIT");
      }
    } catch (error) {
      console.error("Error ensuring headers:", error);
    }
  }

  async ensureNotificationSheet() {
    try {
      const exists = await sheetsService.sheetExists(SHEET_NOTIF);
      if (!exists) {
        await sheetsService.writeData(`${SHEET_NOTIF}!A1:J1`, [NOTIF_HEADERS]);
        console.log("✅ Notification sheet created with headers");
      }
    } catch (error) {
      console.error("Error ensuring notification sheet:", error);
    }
  }

  // Sheet Drop: dicek sekali per sesi (bukan tiap moveToDrop)
  async ensureDropSheet() {
    if (this._dropEnsured) return;
    const exists = await sheetsService.sheetExists(SHEET_DROP);
    if (!exists) {
      await sheetsService.writeData(`${SHEET_DROP}!A1:AE1`, [DROP_HEADERS]);
    } else {
      const hdr = await sheetsService.getRawData(SHEET_DROP, "A1:AE1");
      const h = (hdr && hdr[0]) || [];
      if (String(h[28] ?? "").trim() !== "PROFIL RISK")
        await sheetsService.updateCell(`${SHEET_DROP}!AC1`, "PROFIL RISK");
      if (String(h[29] ?? "").trim() !== "AKTIVITAS AO")
        await sheetsService.updateCell(`${SHEET_DROP}!AD1`, "AKTIVITAS AO");
      if (String(h[30] ?? "").trim() !== "UNIT")
        await sheetsService.updateCell(`${SHEET_DROP}!AE1`, "UNIT");
    }
    this._dropEnsured = true;
  }

  // ============================================================
  // NOTIFICATION
  // ============================================================
  generateNotificationId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `NOTIF-${timestamp}-${random}`;
  }

  getTanggalSekarang() {
    return new Date().toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  // Tambah baris notifikasi ke cache (jika cache ada) agar tidak perlu fetch ulang
  _notifAppendToCache(rows) {
    if (this._notif.data) {
      for (const r of rows) this._notif.data.push(r);
      this._notif.version++;
    }
  }

  async addNotification(programNo, programKerja, pengirim, bidangPengirim) {
    try {
      const notificationId = this.generateNotificationId();
      const tanggalKirim = this.getTanggalSekarang();
      const newNotification = [
        notificationId,
        programNo,
        programKerja,
        pengirim,
        bidangPengirim,
        tanggalKirim,
        "UNREAD",
        "",
        "",
        "",
      ];
      const result = await sheetsService.appendData(SHEET_NOTIF, [
        newNotification,
      ]);
      if (result.success) {
        this._notifAppendToCache([newNotification]);
        return {
          success: true,
          notificationId,
          message: "Notification created",
        };
      }
      throw new Error("Failed to append notification");
    } catch (error) {
      console.error("Error adding notification:", error);
      return { success: false, message: error.message };
    }
  }

  async addNotificationsBatch(programs, pengirim) {
    if (!Array.isArray(programs) || programs.length === 0) {
      return { success: true, message: "No notifications to add" };
    }
    try {
      const tanggalKirim = this.getTanggalSekarang();
      const rows = programs.map((p) => [
        this.generateNotificationId(),
        p.programId || p.programNo || "",
        p.programKerja || "",
        pengirim,
        p.bidang || p.bidangPengirim || "",
        tanggalKirim,
        "UNREAD",
        "",
        "",
        "",
      ]);
      const result = await sheetsService.appendData(SHEET_NOTIF, rows);
      if (!result.success)
        throw new Error("Failed to append notifications batch");
      this._notifAppendToCache(rows);
      return { success: true, count: rows.length };
    } catch (error) {
      console.error("Error adding notifications batch:", error);
      return { success: false, message: error.message };
    }
  }

  async getAllNotifications() {
    try {
      const userFilter = this.getUserFilter();
      const rawRows = await this.getNotifRaw();
      if (!rawRows || rawRows.length <= 1) return [];

      const list = [];
      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;
        if (!row[0] && !row[1] && !row[2]) continue;
        list.push({
          idNotif: row[0] || "",
          programNo: row[1] || "",
          programKerja: row[2] || "",
          pengirim: row[3] || "",
          bidangPengirim: row[4] || "",
          tanggalKirim: row[5] || "",
          status: row[6] || "UNREAD",
          dibacaOleh: row[7] || "",
          tanggalBaca: row[8] || "",
          catatan: row[9] || "",
        });
      }
      if (!userFilter.isAdmin) {
        return list.filter(
          (notif) => notif.bidangPengirim === userFilter.bidangFilter,
        );
      }
      return list;
    } catch (error) {
      console.error("Error getting notifications:", error);
      return [];
    }
  }

  async getUnreadNotifications() {
    const all = await this.getAllNotifications();
    return all.filter((n) => n.status === "UNREAD");
  }

  // Cari baris notifikasi: pakai cache, verifikasi 1 sel, fallback baca penuh
  async locateNotifRow(notificationId) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const all = await this.getNotifRaw(attempt === 1);
      let idx = -1;
      for (let i = 1; i < all.length; i++) {
        if (all[i] && all[i][0] === notificationId) {
          idx = i;
          break;
        }
      }
      if (idx === -1) {
        if (attempt === 0) continue;
        return null;
      }
      if (attempt === 1) return { rowIndex: idx, sheetRow: idx + 1 };
      const chk = await sheetsService.getRawData(
        SHEET_NOTIF,
        `A${idx + 1}:A${idx + 1}`,
      );
      if (chk && chk[0] && chk[0][0] === notificationId)
        return { rowIndex: idx, sheetRow: idx + 1 };
    }
    return null;
  }

  async markNotificationAsRead(notificationId, readerName) {
    try {
      const loc = await this.locateNotifRow(notificationId);
      if (!loc) return { success: false, message: "Notification not found" };

      const tanggalBaca = this.getTanggalSekarang();
      const result = await sheetsService.writeData(
        `${SHEET_NOTIF}!G${loc.sheetRow}:I${loc.sheetRow}`,
        [["READ", readerName, tanggalBaca]],
      );
      this.assertWrite(result, "Gagal menandai notifikasi.");

      const row = this._notif.data && this._notif.data[loc.rowIndex];
      if (row) {
        row[6] = "READ";
        row[7] = readerName;
        row[8] = tanggalBaca;
        this._notif.version++;
      }
      return { success: true, message: "Notification marked as read" };
    } catch (error) {
      this.invalidateNotificationCache();
      console.error("Error marking notification as read:", error);
      return { success: false, message: error.message };
    }
  }

  async markAllNotificationsAsRead(programNo, readerName) {
    try {
      // Fresh read: operasi ini menulis blok G:I, jangan pakai data basi
      const all = await this.getNotifRaw(true);
      if (!all || all.length <= 1)
        return { success: true, message: "0 notification(s) marked as read" };

      const tanggalBaca = this.getTanggalSekarang();
      let changed = 0;
      let first = -1;
      let last = -1;
      for (let i = 1; i < all.length; i++) {
        const row = all[i];
        if (
          row &&
          row[6] === "UNREAD" &&
          (programNo === "all" || row[1] === programNo)
        ) {
          row[6] = "READ";
          row[7] = readerName;
          row[8] = tanggalBaca;
          changed++;
          if (first === -1) first = i;
          last = i;
        }
      }
      if (changed === 0)
        return { success: true, message: "0 notification(s) marked as read" };

      // Tulis hanya rentang yang berubah (bukan seluruh sheet)
      const block = [];
      for (let i = first; i <= last; i++) {
        const row = all[i];
        block.push([row?.[6] || "", row?.[7] || "", row?.[8] || ""]);
      }
      const result = await sheetsService.writeData(
        `${SHEET_NOTIF}!G${first + 1}:I${last + 1}`,
        block,
      );
      this.assertWrite(result, "Gagal menandai notifikasi.");
      this._notif.version++;

      return {
        success: true,
        message: `${changed} notification(s) marked as read`,
      };
    } catch (error) {
      this.invalidateNotificationCache();
      console.error("Error marking all notifications as read:", error);
      return { success: false, message: error.message };
    }
  }

  async deleteNotificationsByProgramNo(programNo) {
    try {
      // Early exit tanpa request jika cache segar tidak punya notifikasi program ini
      const c = this._notif;
      if (c.data && Date.now() - c.time < this.NOTIF_TTL) {
        const has = c.data.some((r, i) => i > 0 && r && r[1] === programNo);
        if (!has)
          return { success: true, message: "0 notification(s) deleted" };
      }

      const all = await this.getNotifRaw(true);
      if (!all || all.length <= 1)
        return { success: true, message: "0 notification(s) deleted" };

      const kept = [all[0]];
      let deleted = 0;
      for (let i = 1; i < all.length; i++) {
        const row = all[i];
        if (row && row[1] === programNo) deleted++;
        else kept.push(row);
      }
      if (deleted === 0)
        return { success: true, message: "0 notification(s) deleted" };

      const padded = kept.map((row) => {
        const r = Array(10).fill("");
        for (let c2 = 0; c2 < 10; c2++) r[c2] = row?.[c2] ?? "";
        return r;
      });
      while (padded.length < all.length) padded.push(Array(10).fill(""));

      const result = await sheetsService.writeData(
        `${SHEET_NOTIF}!A1:J${all.length}`,
        padded,
      );
      this.assertWrite(result, "Gagal menghapus notifikasi.");

      this._notif.data = padded;
      this._notif.version++;
      return { success: true, message: `${deleted} notification(s) deleted` };
    } catch (error) {
      this.invalidateNotificationCache();
      console.error("Error deleting notifications:", error);
      return { success: false, message: error.message };
    }
  }

  // ============================================================
  // GET ALL DATA
  // ============================================================
  async getAllData(useCache = true) {
    try {
      const raw = await this.getSheetRaw(!useCache);
      this._ensureParsed(raw);

      const f = this.getUserFilter();
      const result =
        !f.isAdmin && f.bidangFilter
          ? this._parsed.filter((x) => x.bidang === f.bidangFilter)
          : this._parsed.slice();

      this._saveSnapshot(result);
      return result;
    } catch (error) {
      console.error("Error getting all data:", error);
      return [];
    }
  }

  async getRawData() {
    try {
      return await this.getSheetRaw();
    } catch (error) {
      console.error("Error getting raw data:", error);
      return [];
    }
  }

  // ============================================================
  // GETTERS
  // ============================================================
  async getDataByNo(no) {
    await this.getAllData(); // pastikan index terbangun
    const item = this._noMap.get(String(no));
    if (!item) return undefined;
    const f = this.getUserFilter();
    if (!f.isAdmin && f.bidangFilter && item.bidang !== f.bidangFilter)
      return null;
    return item;
  }

  async getDataByYear(tahun) {
    const allData = await this.getAllData();
    return allData.filter((item) => item.tahun === tahun.toString());
  }

  async getDataByKluster(kluster) {
    const allData = await this.getAllData();
    return allData.filter((item) => item.klusterProgram === kluster);
  }

  async getDataBySumberAnggaran(sumber) {
    const allData = await this.getAllData();
    return allData.filter((item) => item.sumberAnggaran === sumber);
  }

  async getDataByUnit(unit) {
    const allData = await this.getAllData();
    const target = String(unit ?? "")
      .trim()
      .toUpperCase();
    return allData.filter(
      (item) =>
        String(item.unit ?? "")
          .trim()
          .toUpperCase() === target,
    );
  }

  async getDataByBidang(bidang) {
    const userFilter = this.getUserFilter();
    if (!userFilter.isAdmin && bidang !== userFilter.bidangFilter) return [];
    const allData = await this.getAllData();
    return allData.filter((item) => item.bidang === bidang);
  }

  async getDataByKategori(kategori) {
    const allData = await this.getAllData();
    return allData.filter((item) => item.kategori === kategori);
  }

  async getDataByAset(aset) {
    const allData = await this.getAllData();
    return allData.filter((item) =>
      splitAsets(item.aset).includes(String(aset).trim()),
    );
  }

  async getDataByTkdn(tkdn) {
    const allData = await this.getAllData();
    return allData.filter((item) => item.tkdn === tkdn);
  }

  async hasAccessToData(no) {
    const userFilter = this.getUserFilter();
    if (userFilter.isAdmin) return true;
    const data = await this.getDataByNo(no);
    if (!data) return false;
    return data.bidang === userFilter.bidangFilter;
  }

  // ============================================================
  // LOCATE ROW (cache + verifikasi 1 baris, fallback baca penuh)
  // ============================================================
  async locateProgramRow(no) {
    const target = String(no);
    const C = this.columns;
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await this.getSheetRaw(attempt === 1);
      let idx = -1;
      for (let i = 1; i < raw.length; i++) {
        const r = raw[i];
        if (r && r[C.NO] && r[C.NO].toString() === target) {
          idx = i;
          break;
        }
      }
      if (idx === -1) {
        if (attempt === 0) continue; // mungkin cache basi -> coba baca fresh
        return null;
      }
      // Hasil baca penuh barusan sudah fresh
      if (attempt === 1)
        return { rowIndex: idx, sheetRow: idx + 1, row: raw[idx] || [] };

      // Dari cache: verifikasi dengan membaca HANYA baris itu
      const fresh = await sheetsService.getRawData(
        SHEET_DATA,
        `A${idx + 1}:AB${idx + 1}`,
      );
      const row = fresh && fresh[0];
      if (row && String(row[C.NO] ?? "") === target)
        return { rowIndex: idx, sheetRow: idx + 1, row };
      // verifikasi gagal -> loop ke attempt 1 (baca fresh)
    }
    return null;
  }

  // ============================================================
  // ADD DATA
  // ============================================================
  // Penulisan eksplisit dari kolom A, tanpa deteksi tabel append.
  async appendRowsFromColumnA(sheetName, lastColumn, width, rows, raw = null) {
    if (
      !Array.isArray(rows) ||
      !rows.length ||
      rows.some((row) => !Array.isArray(row) || row.length !== width)
    ) {
      throw new Error("Jumlah baris atau kolom tidak sesuai.");
    }
    const existing =
      raw ?? (await sheetsService.getRawData(sheetName, `A:${lastColumn}`));
    if (
      !Array.isArray(existing) ||
      !existing.length ||
      String(existing[0]?.[0] ?? "")
        .trim()
        .toUpperCase() !== "NO"
    ) {
      throw new Error(`Header NO tidak ditemukan di ${sheetName}!A1.`);
    }
    const startRow = Math.max(2, existing.length + 1);
    const endRow = startRow + rows.length - 1;
    const range = `${sheetName}!A${startRow}:${lastColumn}${endRow}`;
    const result = await sheetsService.writeData(range, rows);
    this.assertWrite(result, "Gagal menulis data.");
    return { success: true, range, startRow, endRow, result };
  }

  // Baca fresh (tanpa cache) agar penomoran ID tidak bentrok, lalu cache ikut diperbarui.
  async getProgramNumbersRaw() {
    const raw = await this.getSheetRaw(true);
    if (
      !Array.isArray(raw) ||
      !raw.length ||
      String(raw[0]?.[0] ?? "")
        .trim()
        .toUpperCase() !== "NO"
    ) {
      throw new Error("Header NO tidak ditemukan di Data!A1.");
    }
    return raw;
  }

  async addData(data) {
    try {
      await this.init();

      // FIX: Tambahkan await
      const userFilter = await this.getUserFilter();

      // Validasi autentikasi
      if (!loginService.checkAuth()) {
        return {
          success: false,
          message: "Sesi login berakhir. Silakan login kembali.",
        };
      }

      console.log("[addData] User Filter:", userFilter);
      console.log("[addData] Bidang Input:", data.bidang);

      // Validasi hak akses bidang
      if (!userFilter.isAdmin) {
        const allowedBidang = String(userFilter.bidangFilter || "").trim();

        const inputBidang = String(data.bidang || "").trim();

        if (!allowedBidang) {
          return {
            success: false,
            message: "Bidang pengguna tidak ditemukan.",
          };
        }

        if (!inputBidang) {
          data.bidang = allowedBidang;
        } else if (inputBidang.toLowerCase() !== allowedBidang.toLowerCase()) {
          return {
            success: false,
            message: `Access denied. Anda hanya dapat menambahkan program bidang ${allowedBidang}.`,
          };
        } else {
          data.bidang = allowedBidang;
        }
      }

      // Validasi kategori dan harga
      const v = this.validateKategoriHarga(data);

      if (!v.valid) {
        return {
          success: false,
          message: v.message,
        };
      }

      // Validasi Strategis RJPU
      const kodeAwal = data.strategisRjpu || "";

      if (!kodeAwal) {
        return {
          success: false,
          message: "Strategis RJPU wajib dipilih",
        };
      }

      // Generate nomor program
      const rawData = await this.getProgramNumbersRaw();

      const nextSeq = this.getNextSequenceForKode(kodeAwal, rawData);

      const programId = this.generateProgramId(kodeAwal, nextSeq);

      // Susun data sesuai mapping A:AB
      const newRow = this.buildRow(programId, data, v);

      if (newRow.length !== COLUMN_NAMES.length) {
        throw new Error("Jumlah kolom program tidak sesuai.");
      }

      // Simpan mulai dari kolom A
      const result = await this.appendRowsFromColumnA(
        SHEET_DATA,
        this.lastColumnLetter,
        COLUMN_NAMES.length,
        [newRow],
        rawData,
      );

      if (result?.success === false) {
        throw new Error(result.message || "Gagal menyimpan program.");
      }

      // Update cache
      this._applyAppend(rawData, [newRow]);

      // Informasi pengguna
      const currentUser = loginService.getCurrentUser();

      const pengirim = currentUser ? currentUser.nama : "System";

      const bidangPengirim =
        data.bidang || userFilter.bidangFilter || "Unknown";

      // Kirim notifikasi tanpa menunggu proses selesai
      Promise.resolve(
        this.addNotification(
          programId,
          data.programKerja,
          pengirim,
          bidangPengirim,
        ),
      ).catch((error) => {
        console.error("Gagal mengirim notifikasi:", error);
      });

      return {
        success: true,
        message: "Data added successfully",
        no: programId,
        hargaTotal: v.hargaTotal,
        data: result,
      };
    } catch (error) {
      this.invalidateAllDataCache();

      console.error("Error adding data:", error);

      return {
        success: false,
        message: error.message,
      };
    }
  }

  // ============================================================
  // UPDATE DATA
  // ============================================================
  async updateData(no, updatedData) {
    await this.init();
    const userFilter = this.getUserFilter();
    const C = this.columns;

    try {
      const loc = await this.locateProgramRow(no);
      if (!loc)
        return { success: false, message: `Data with NO ${no} not found` };

      const currentRow = loc.row;
      if (
        !userFilter.isAdmin &&
        currentRow[C.BIDANG] !== userFilter.bidangFilter
      ) {
        return { success: false, message: "Access denied" };
      }
      if (
        !userFilter.isAdmin &&
        updatedData.bidang &&
        updatedData.bidang !== userFilter.bidangFilter
      ) {
        return { success: false, message: "Access denied" };
      }

      const getVal = (key, colIndex) =>
        updatedData[key] !== undefined
          ? updatedData[key]
          : currentRow[colIndex] || "";

      const mergedData = {
        kategori: getVal("kategori", C.KATEGORI),
        hargaMaterial: getVal("hargaMaterial", C.HARGA_MATERIAL),
        hargaJasa: getVal("hargaJasa", C.HARGA_JASA),
      };
      const v = this.validateKategoriHarga(mergedData);
      if (!v.valid) return { success: false, message: v.message };

      const updatedRow = FIELD_KEYS.map((key, idx) => {
        switch (idx) {
          case C.NO:
            return no.toString();
          case C.HARGA_TOTAL:
            return v.hargaTotal;
          case C.KATEGORI:
            return mergedData.kategori;
          case C.HARGA_MATERIAL:
            return v.hargaMaterial || "";
          case C.HARGA_JASA:
            return v.hargaJasa || "";
          case C.ASET:
            return updatedData.aset === undefined
              ? currentRow[C.ASET] || ""
              : normalizeAsets(updatedData.aset);
          case C.UNIT:
            return String(getVal("unit", C.UNIT)).trim();
          default:
            return getVal(key, idx);
        }
      });

      const range = `${SHEET_DATA}!A${loc.sheetRow}:AB${loc.sheetRow}`;
      const result = await sheetsService.writeData(range, [updatedRow]);
      this.assertWrite(result, "Gagal update program.");

      this._patchRawRow(loc.rowIndex, updatedRow);

      return {
        success: true,
        message: `Data updated successfully`,
        data: result,
      };
    } catch (error) {
      this.invalidateAllDataCache();
      console.error("Error updating data:", error);
      return { success: false, message: error.message };
    }
  }

  // ============================================================
  // DELETE DATA
  // ============================================================
  async deleteData(no) {
    const userFilter = this.getUserFilter();
    if (!userFilter.isAdmin)
      return { success: false, message: "Akses ditolak" };
    await this.init();

    try {
      const loc = await this.locateProgramRow(no);
      if (!loc) return { success: false, message: `Data not found` };

      const emptyRow = Array(COLUMN_NAMES.length).fill("");
      const [, writeResult] = await Promise.all([
        this.deleteNotificationsByProgramNo(no),
        sheetsService.writeData(
          `${SHEET_DATA}!A${loc.sheetRow}:AB${loc.sheetRow}`,
          [emptyRow],
        ),
      ]);
      this.assertWrite(writeResult, "Gagal menghapus data.");
      this._patchRawRow(loc.rowIndex, emptyRow);

      if (this.AUTO_RENUMBER) await this.renumberData();

      return { success: true, message: `Data deleted successfully` };
    } catch (error) {
      this.invalidateAllDataCache();
      console.error("Error deleting data:", error);
      return { success: false, message: error.message };
    }
  }

  // Manual / opsional. Hanya menulis rentang kolom A yang benar-benar berubah.
  async renumberData() {
    try {
      const raw = await this.getSheetRaw(true);
      if (!raw || raw.length <= 1) return true;

      const C = this.columns;
      const counters = {};
      const newA = []; // newA[i-1] untuk baris raw[i]
      let first = -1;
      let last = -1;

      for (let i = 1; i < raw.length; i++) {
        const row = raw[i] || [];
        const cur = row[C.NO] || "";
        let next = cur;
        const hasData = row.some((c) => c && c.toString().trim() !== "");
        if (hasData) {
          const kodeAwal = row[C.STRATEGIS_RJPU];
          if (kodeAwal) {
            counters[kodeAwal] = (counters[kodeAwal] || 0) + 1;
            next = this.generateProgramId(kodeAwal, counters[kodeAwal]);
          }
        }
        newA.push([next]);
        if (String(next) !== String(cur)) {
          if (first === -1) first = i;
          last = i;
        }
      }
      if (first === -1) return true; // tidak ada perubahan

      const slice = newA.slice(first - 1, last);
      const result = await sheetsService.writeData(
        `${SHEET_DATA}!A${first + 1}:A${last + 1}`,
        slice,
      );
      this.assertWrite(result, "Gagal renumber.");

      for (let i = first; i <= last; i++) {
        if (!raw[i]) raw[i] = [];
        raw[i][C.NO] = newA[i - 1][0];
      }
      this._raw.version++;
      return true;
    } catch (error) {
      this.invalidateAllDataCache();
      console.error("Error renumbering data:", error);
      return false;
    }
  }

  // ============================================================
  // MOVE TO DROP
  // ============================================================
  async moveToDrop(no, keterangan = "DROP") {
    const userFilter = this.getUserFilter();
    if (!userFilter.isAdmin)
      return { success: false, message: "Akses ditolak" };
    await this.init();

    try {
      const loc = await this.locateProgramRow(no);
      if (!loc) return { success: false, message: `Data not found` };

      const C = this.columns;
      const rowData = loc.row;
      const dropDate = this.getTanggalSekarang();

      const dropRow = [];
      for (let i = 0; i < 25; i++) dropRow.push(rowData[i] || "");
      dropRow.push(
        dropDate,
        keterangan,
        no.toString(),
        rowData[C.PROFIL_RISK] || "",
        rowData[C.AKTIVITAS_AO] || "",
        rowData[C.UNIT] || "",
      );

      await this.ensureDropSheet();
      await this.appendRowsFromColumnA(SHEET_DROP, "AE", DROP_HEADERS.length, [
        dropRow,
      ]);

      const emptyRow = Array(COLUMN_NAMES.length).fill("");
      const [, writeResult] = await Promise.all([
        this.deleteNotificationsByProgramNo(no),
        sheetsService.writeData(
          `${SHEET_DATA}!A${loc.sheetRow}:AB${loc.sheetRow}`,
          [emptyRow],
        ),
      ]);
      this.assertWrite(writeResult, "Gagal mengosongkan baris sumber.");
      this._patchRawRow(loc.rowIndex, emptyRow);

      if (this.AUTO_RENUMBER) await this.renumberData();

      return { success: true, message: `Data moved to Drop successfully` };
    } catch (error) {
      this.invalidateAllDataCache();
      console.error("Error moving data to Drop:", error);
      return { success: false, message: error.message };
    }
  }

  // ============================================================
  // RESTORE FROM DROP
  // ============================================================
  async restoreFromDrop(originalNo) {
    const userFilter = this.getUserFilter();
    if (!userFilter.isAdmin)
      return { success: false, message: "Akses ditolak" };
    await this.init();

    const normalizeHeader = (value) =>
      String(value ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();
    const asString = (value) => String(value ?? "").trim();
    const equals = (a, b) => asString(a) === asString(b);

    try {
      const target = asString(originalNo);
      if (!target) throw new Error("NO program belum dipilih.");

      await this.ensureDropSheet();
      // Baca sheet Drop & Data paralel
      const [dropRaw, dataRaw] = await Promise.all([
        sheetsService.getRawData(SHEET_DROP, "A:AE"),
        this.getSheetRaw(true),
      ]);

      if (!Array.isArray(dropRaw) || dropRaw.length <= 1)
        throw new Error("Sheet Drop kosong.");

      const dropHeaders = dropRaw[0] || [];
      const dropIndex = new Map(
        dropHeaders.map((name, i) => [normalizeHeader(name), i]),
      );
      const noIndex = dropIndex.get("NO");
      const originalIndex = dropIndex.get("ORIGINAL NO");
      if (noIndex === undefined)
        throw new Error("Kolom NO tidak ditemukan di sheet Drop.");

      const dropRowIndex = dropRaw.findIndex((row, i) => {
        if (i === 0 || !Array.isArray(row)) return false;
        return (
          (originalIndex !== undefined && equals(row[originalIndex], target)) ||
          equals(row[noIndex], target)
        );
      });
      if (dropRowIndex === -1)
        throw new Error(`Data dengan NO ${target} tidak ditemukan di Drop.`);

      const C = this.columns;
      const sourceRow = dropRaw[dropRowIndex];
      const restoredRow = COLUMN_NAMES.map((columnName) => {
        const sourceIndex = dropIndex.get(normalizeHeader(columnName));
        return sourceIndex === undefined ? "" : (sourceRow[sourceIndex] ?? "");
      });

      if (!asString(restoredRow[C.PROGRAM_KERJA]))
        throw new Error("PROGRAM KERJA pada data Drop kosong.");

      const bidang = asString(restoredRow[C.BIDANG]);
      if (/^MT-[A-Z0-9-]+-\d+$/i.test(bidang))
        throw new Error("BIDANG di sheet Drop berisi ID program.");

      if (!Array.isArray(dataRaw) || dataRaw.length === 0)
        throw new Error("Sheet Data tidak memiliki header.");

      const kodeAwal = asString(restoredRow[C.STRATEGIS_RJPU]) || "XX";
      const nextSequence = this.getNextSequenceForKode(kodeAwal, dataRaw);
      const newNo = this.generateProgramId(kodeAwal, nextSequence);
      restoredRow[C.NO] = newNo;

      const targetSheetRow = Math.max(2, dataRaw.length + 1);
      const restoreResult = await sheetsService.writeData(
        `${SHEET_DATA}!A${targetSheetRow}:AB${targetSheetRow}`,
        [restoredRow],
      );
      this.assertWrite(restoreResult, "Gagal restore ke Data.");
      this._applyAppend(dataRaw, [restoredRow]);

      // Kosongkan baris sumber di Drop
      const dropSheetRow = dropRowIndex + 1;
      await sheetsService.writeData(
        `${SHEET_DROP}!A${dropSheetRow}:AE${dropSheetRow}`,
        [Array(DROP_HEADERS.length).fill("")],
      );

      return {
        success: true,
        message: `Program berhasil direstore dengan NO ${newNo}.`,
        newNo,
        row: targetSheetRow,
      };
    } catch (error) {
      this.invalidateAllDataCache();
      console.error("Error restoring data from Drop:", error);
      return { success: false, message: error.message };
    }
  }

  // ============================================================
  // SEARCH & SUMMARY
  // ============================================================
  async searchData(keyword) {
    await this.getAllData(); // pastikan _parsed & _blobs terbangun
    const lower = String(keyword ?? "").toLowerCase();
    const f = this.getUserFilter();
    const restrict = !f.isAdmin && f.bidangFilter;
    const out = [];
    for (let i = 0; i < this._parsed.length; i++) {
      const item = this._parsed[i];
      if (restrict && item.bidang !== f.bidangFilter) continue;
      if (this._blobs[i].includes(lower)) out.push(item);
    }
    return out;
  }

  async _summarize(getKey, withMaterialJasa = false) {
    const allData = await this.getAllData();
    const summary = {};
    for (const item of allData) {
      const k = getKey(item);
      if (k === null) continue;
      let s = summary[k];
      if (!s) {
        s = summary[k] = withMaterialJasa
          ? {
              totalProgram: 0,
              totalAnggaran: 0,
              totalMaterial: 0,
              totalJasa: 0,
              programList: [],
            }
          : { totalProgram: 0, totalAnggaran: 0, programList: [] };
      }
      s.totalProgram++;
      s.totalAnggaran += num(item.hargaTotal);
      if (withMaterialJasa) {
        s.totalMaterial += num(item.hargaMaterial);
        s.totalJasa += num(item.hargaJasa);
      }
      s.programList.push(item.programKerja);
    }
    return summary;
  }

  getSummaryByYear() {
    return this._summarize((i) => i.tahun);
  }

  getSummaryByKluster() {
    return this._summarize((i) => i.klusterProgram);
  }

  getSummaryBySumberAnggaran() {
    return this._summarize((i) => i.sumberAnggaran);
  }

  getSummaryByBidang() {
    return this._summarize((i) => (i.bidang ? i.bidang : null));
  }

  getSummaryByKategori() {
    return this._summarize((i) => i.kategori || "(Tanpa Kategori)", true);
  }

  getSummaryByAset() {
    return this._summarize((i) => i.aset || "(Tanpa Aset)");
  }

  async getFileLink(no) {
    const data = await this.getDataByNo(no);
    if (data && data.file)
      return {
        success: true,
        fileLink: data.file,
        programKerja: data.programKerja,
      };
    return { success: false, message: `No file found` };
  }

  async updateFileLink(no, driveFileLink) {
    return await this.updateData(no, { file: driveFileLink });
  }

  async updateBidang(no, bidang) {
    return await this.updateData(no, { bidang });
  }

  async updateKeterangan(no, keterangan) {
    return await this.updateData(no, { keterangan });
  }

  async updateKategori(no, kategori) {
    return await this.updateData(no, { kategori });
  }

  async updateTkdn(no, tkdn) {
    return await this.updateData(no, { tkdn });
  }

  async updateStrategisRjpu(no, strategisRjpu) {
    return await this.updateData(no, { strategisRjpu });
  }

  async updateAset(no, aset) {
    return await this.updateData(no, { aset });
  }

  async updateDescriptionAset(no, descriptionAset) {
    return await this.updateData(no, { descriptionAset });
  }

  async updateProfilRisk(no, profilRisk) {
    return await this.updateData(no, { profilRisk });
  }

  // ============================================================
  // BULK INSERT
  // ============================================================
  async bulkInsert(dataArray) {
    await this.init();
    const userFilter = this.getUserFilter();

    try {
      const rawData = await this.getProgramNumbersRaw();
      const counters = {};
      const rows = [];
      const addedPrograms = [];

      for (let i = 0; i < dataArray.length; i++) {
        const item = dataArray[i];

        if (!userFilter.isAdmin) {
          if (!item.bidang) item.bidang = userFilter.bidangFilter;
          else if (item.bidang !== userFilter.bidangFilter)
            return { success: false, message: `Access denied baris ${i + 1}` };
        }

        const v = this.validateKategoriHarga(item);
        if (!v.valid)
          return { success: false, message: `Baris ${i + 1}: ${v.message}` };

        const kodeAwal = item.strategisRjpu;
        if (!kodeAwal)
          return {
            success: false,
            message: `Baris ${i + 1}: Strategis RJPU wajib diisi`,
          };

        const normalizedKode = this.normalizeKodeAwal(kodeAwal);
        if (!counters[normalizedKode])
          counters[normalizedKode] = this.getNextSequenceForKode(
            kodeAwal,
            rawData,
          );
        const seq = counters[normalizedKode]++;
        const programId = this.generateProgramId(kodeAwal, seq);

        rows.push(this.buildRow(programId, item, v));
        addedPrograms.push({
          programId,
          programKerja: item.programKerja,
          bidang: item.bidang || userFilter.bidangFilter,
        });
      }

      const result = await this.appendRowsFromColumnA(
        SHEET_DATA,
        this.lastColumnLetter,
        COLUMN_NAMES.length,
        rows,
        rawData,
      );
      this._applyAppend(rawData, rows);

      const currentUser = loginService.getCurrentUser();
      const pengirim = currentUser ? currentUser.nama : "System";
      // Fire-and-forget
      this.addNotificationsBatch(addedPrograms, pengirim);

      return {
        success: true,
        message: `${dataArray.length} data added`,
        data: result,
      };
    } catch (error) {
      this.invalidateAllDataCache();
      console.error("Error bulk inserting data:", error);
      return { success: false, message: error.message };
    }
  }

  // ============================================================
  // EXPORT / PAGINATION / STATS
  // ============================================================
  async exportToJSON() {
    const allData = await this.getAllData();
    const userFilter = this.getUserFilter();
    return {
      success: true,
      data: allData,
      total: allData.length,
      exportDate: new Date().toISOString(),
      userInfo: {
        role: userFilter.isAdmin ? "Admin" : "User",
        bidang: userFilter.bidangFilter,
      },
    };
  }

  async getPaginatedData(page = 1, limit = 10) {
    const allData = await this.getAllData();
    const start = (page - 1) * limit;
    const end = start + limit;
    return {
      success: true,
      data: allData.slice(start, end),
      currentPage: page,
      totalPages: Math.ceil(allData.length / limit),
      totalItems: allData.length,
      limit,
    };
  }

  async getUserDataAccessInfo() {
    const userFilter = this.getUserFilter();
    const allData = await this.getAllData();
    return {
      isAdmin: userFilter.isAdmin,
      bidang: userFilter.bidangFilter,
      totalDataAccessible: allData.length,
      dataList: allData.map((item) => ({
        no: item.no,
        programKerja: item.programKerja,
        bidang: item.bidang,
      })),
    };
  }

  async getStatistics() {
    const allData = await this.getAllData();
    const userFilter = this.getUserFilter();

    let totalBudget = 0;
    let totalMaterial = 0;
    let totalJasa = 0;
    const years = new Set();
    const clusters = new Set();
    const bidangs = new Set();
    const kategoris = new Set();
    const asets = new Set();

    for (const item of allData) {
      totalBudget += num(item.hargaTotal);
      totalMaterial += num(item.hargaMaterial);
      totalJasa += num(item.hargaJasa);
      if (item.tahun) years.add(item.tahun);
      if (item.klusterProgram) clusters.add(item.klusterProgram);
      if (item.bidang) bidangs.add(item.bidang);
      if (item.kategori) kategoris.add(item.kategori);
      for (const aset of splitAsets(item.aset)) asets.add(aset);
    }

    return {
      success: true,
      statistics: {
        totalPrograms: allData.length,
        totalBudget,
        totalMaterial,
        totalJasa,
        uniqueYears: years.size,
        uniqueClusters: clusters.size,
        uniqueBidangs: bidangs.size,
        uniqueKategoris: kategoris.size,
        uniqueAsets: asets.size,
        yearsList: [...years].sort(),
        clustersList: [...clusters].sort(),
        bidangsList: [...bidangs].sort(),
        kategorisList: [...kategoris].sort(),
        asetsList: [...asets].sort(),
      },
      userInfo: {
        role: userFilter.isAdmin ? "Admin" : "User",
        bidang: userFilter.bidangFilter,
      },
    };
  }

  validateData(data) {
    const errors = [];
    if (!data.programKerja || data.programKerja.trim() === "")
      errors.push("Program Kerja is required");
    if (!data.tahun || data.tahun.trim() === "")
      errors.push("Tahun is required");
    if (data.hargaTotal && isNaN(parseFloat(data.hargaTotal)))
      errors.push("Harga Total must be a number");
    if (data.vol && isNaN(parseFloat(data.vol)))
      errors.push("VOL must be a number");
    if (data.tkdn && isNaN(parseFloat(data.tkdn)))
      errors.push("TKDN must be a number");
    const kv = this.validateKategoriHarga(data);
    if (!kv.valid) errors.push(kv.message);
    return { isValid: errors.length === 0, errors };
  }
}

const dataSheetOperations = new DataSheetOperations();
export default dataSheetOperations;
