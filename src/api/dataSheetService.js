// api/dataSheetService.js
import sheetsService from "./googleSheetService";
import loginService from "./loginSheetService";
class DataSheetOperations {
  constructor() {
    this.sheetName = "Data";
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
      AKTIVITAS_AO: 26, // Kolom baru di AA
    };
    this.columnNames = [
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
      "AKTIVITAS AO", // Header baru
    ];
    this.dataRange = "A:AA"; // Diperluas sampai AA
    this.lastColumnLetter = "AA";
    this.validKategori = ["Material", "Jasa", "Material & Jasa"];
    // ==== Cache & flag untuk mengurangi request ====
    this._headersEnsured = false;
    this._headersEnsuredAt = 0;
    this._notificationSheetEnsured = false;
    this._notificationSheetEnsuredAt = 0;
    this.ENSURE_TTL = 5 * 60 * 1000; // 5 menit
    this._allDataCache = null;
    this._allDataCacheTime = 0;
    this.ALL_DATA_TTL = 15 * 1000; // 15 detik
  }
  // ============================================================
  // HELPERS
  // ============================================================
  async getUserFilter() {
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
  getNextSequenceForKode(kodeAwal, allData) {
    if (!kodeAwal) return 1;
    const normalized = this.normalizeKodeAwal(kodeAwal);
    let maxSeq = 0;
    const regex = new RegExp(
      `^MT-${this.escapeRegex(normalized)}-(\\d+)$`,
      "i",
    );
    for (const item of allData) {
      const no = (item.no || "").toString().trim();
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
  invalidateAllDataCache() {
    this._allDataCache = null;
    this._allDataCacheTime = 0;
  }
  // ============================================================
  // INIT
  // ============================================================
  async init() {
    await sheetsService.init();
    const now = Date.now();
    if (
      !this._headersEnsured ||
      now - this._headersEnsuredAt > this.ENSURE_TTL
    ) {
      await this.ensureHeaders();
      this._headersEnsured = true;
      this._headersEnsuredAt = now;
    }
    if (
      !this._notificationSheetEnsured ||
      now - this._notificationSheetEnsuredAt > this.ENSURE_TTL
    ) {
      await this.ensureNotificationSheet();
      this._notificationSheetEnsured = true;
      this._notificationSheetEnsuredAt = now;
    }
  }
  async ensureHeaders() {
    try {
      const rawData = await sheetsService.getRawData(this.sheetName, "A:AA");
      if (!Array.isArray(rawData) || rawData.length === 0) {
        await sheetsService.writeData(`${this.sheetName}!A1:AA1`, [
          this.columnNames,
        ]);
        console.log("✅ Headers created for Data sheet");
        return;
      }
      const currentHeaders = rawData[0] || [];
      if (
        String(currentHeaders[this.columns.PROFIL_RISK] ?? "").trim() !==
        "PROFIL RISK"
      ) {
        await sheetsService.updateCell(`${this.sheetName}!Z1`, "PROFIL RISK");
      }
      if (
        String(currentHeaders[this.columns.AKTIVITAS_AO] ?? "").trim() !==
        "AKTIVITAS AO"
      ) {
        await sheetsService.updateCell(`${this.sheetName}!AA1`, "AKTIVITAS AO");
      }
    } catch (error) {
      console.error("Error ensuring headers:", error);
    }
  }
  async ensureNotificationSheet() {
    try {
      const notificationExists =
        await sheetsService.sheetExists("Notification");
      if (!notificationExists) {
        const headers = [
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
        await sheetsService.writeData("Notification!A1:J1", [headers]);
        console.log("✅ Notification sheet created with headers");
      }
    } catch (error) {
      console.error("Error ensuring notification sheet:", error);
    }
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
      const result = await sheetsService.appendData("Notification", [
        newNotification,
      ]);
      if (result.success) {
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
      const rows = programs.map((p) => {
        const tanggalKirim = this.getTanggalSekarang();
        return [
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
        ];
      });
      const result = await sheetsService.appendData("Notification", rows);
      if (!result.success)
        throw new Error("Failed to append notifications batch");
      return { success: true, count: rows.length };
    } catch (error) {
      console.error("Error adding notifications batch:", error);
      return { success: false, message: error.message };
    }
  }
  async getAllNotifications() {
    await this.init();
    try {
      const userFilter = await this.getUserFilter();
      const rawRows = await sheetsService.getRawData("Notification", "A:J");
      if (!rawRows || rawRows.length <= 1) return [];
      let notificationList = [];
      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;
        if (!row[0] && !row[1] && !row[2]) continue;
        notificationList.push({
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
        return notificationList.filter(
          (notif) => notif.bidangPengirim === userFilter.bidangFilter,
        );
      }
      return notificationList;
    } catch (error) {
      console.error("Error getting notifications:", error);
      return [];
    }
  }
  async getUnreadNotifications() {
    const all = await this.getAllNotifications();
    return all.filter((n) => n.status === "UNREAD");
  }
  async markNotificationAsRead(notificationId, readerName) {
    try {
      const all = await sheetsService.getRawData("Notification", "A:J");
      let rowIndex = -1;
      for (let i = 1; i < all.length; i++) {
        if (all[i] && all[i][0] === notificationId) {
          rowIndex = i;
          break;
        }
      }
      if (rowIndex === -1)
        return { success: false, message: "Notification not found" };
      const sheetRow = rowIndex + 1;
      const tanggalBaca = this.getTanggalSekarang();
      await sheetsService.writeData(`Notification!G${sheetRow}:I${sheetRow}`, [
        ["READ", readerName, tanggalBaca],
      ]);
      return { success: true, message: "Notification marked as read" };
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return { success: false, message: error.message };
    }
  }
  async markAllNotificationsAsRead(programNo, readerName) {
    try {
      const all = await sheetsService.getRawData("Notification", "A:J");
      if (!all || all.length <= 1)
        return { success: true, message: "0 notification(s) marked as read" };
      const tanggalBaca = this.getTanggalSekarang();
      let changed = 0;
      for (let i = 1; i < all.length; i++) {
        const row = all[i];
        if (row && row[1] === programNo && row[6] === "UNREAD") {
          row[6] = "READ";
          row[7] = readerName;
          row[8] = tanggalBaca;
          changed++;
        } else if (programNo === "all" && row && row[6] === "UNREAD") {
          row[6] = "READ";
          row[7] = readerName;
          row[8] = tanggalBaca;
          changed++;
        }
      }
      if (changed === 0)
        return { success: true, message: "0 notification(s) marked as read" };
      const gToI = all
        .slice(1)
        .map((row) => [row?.[6] || "", row?.[7] || "", row?.[8] || ""]);
      await sheetsService.writeData(`Notification!G2:I${all.length}`, gToI);
      return {
        success: true,
        message: `${changed} notification(s) marked as read`,
      };
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return { success: false, message: error.message };
    }
  }
  async deleteNotificationsByProgramNo(programNo) {
    try {
      const all = await sheetsService.getRawData("Notification", "A:J");
      if (!all || all.length <= 1)
        return { success: true, message: "0 notification(s) deleted" };
      const kept = [all[0]];
      let deleted = 0;
      for (let i = 1; i < all.length; i++) {
        const row = all[i];
        if (row && row[1] === programNo) {
          deleted++;
        } else {
          kept.push(row);
        }
      }
      if (deleted === 0)
        return { success: true, message: "0 notification(s) deleted" };
      const padded = kept.map((row) => {
        const r = Array(10).fill("");
        for (let c = 0; c < 10; c++) r[c] = row?.[c] ?? "";
        return r;
      });
      while (padded.length < all.length) padded.push(Array(10).fill(""));
      await sheetsService.writeData(`Notification!A1:J${all.length}`, padded);
      return { success: true, message: `${deleted} notification(s) deleted` };
    } catch (error) {
      console.error("Error deleting notifications:", error);
      return { success: false, message: error.message };
    }
  }
  // ============================================================
  // GET ALL DATA
  // ============================================================
  async getAllData(useCache = true) {
    const now = Date.now();
    if (
      useCache &&
      this._allDataCache &&
      now - this._allDataCacheTime < this.ALL_DATA_TTL
    ) {
      return this._allDataCache;
    }
    await this.init();
    try {
      const data = await sheetsService.getAllData(
        this.sheetName,
        this.dataRange,
      );
      const userFilter = await this.getUserFilter();
      let processedData = data.map((row) => {
        const isObj = !Array.isArray(row);
        return {
          no: isObj ? row["NO"] || "" : row[this.columns.NO] || "",
          programKerja: isObj
            ? row["PROGRAM KERJA"] || ""
            : row[this.columns.PROGRAM_KERJA] || "",
          alasanProgram: isObj
            ? row["ALASAN PROGRAM"] || ""
            : row[this.columns.ALASAN_PROGRAM] || "",
          klusterProgram: isObj
            ? row["KLUSTER PROGRAM"] || ""
            : row[this.columns.KLUSTER_PROGRAM] || "",
          oemNonOem: isObj
            ? row["OEM/NON OEM"] || ""
            : row[this.columns.OEM_NON_OEM] || "",
          dasarInputProgram: isObj
            ? row["DASAR INPUT PROGRAM"] || ""
            : row[this.columns.DASAR_INPUT_PROGRAM] || "",
          sasaranRjpp: isObj
            ? row["SASARAN RJPP"] || ""
            : row[this.columns.SASARAN_RJPP] || "",
          sumberAnggaran: isObj
            ? row["SUMBER ANGGARAN"] || ""
            : row[this.columns.SUMBER_ANGGARAN] || "",
          estLevering: isObj
            ? row["EST LEVERING"] || ""
            : row[this.columns.EST_LEVERING] || "",
          levelResikoInherent: isObj
            ? row["LEVEL RESIKO INHERENT"] || ""
            : row[this.columns.LEVEL_RESIKO_INHERENT] || "",
          levelRisikoResidual: isObj
            ? row["LEVEL RISIKO RESIDUAL"] || ""
            : row[this.columns.LEVEL_RISIKO_RESIDUAL] || "",
          sat: isObj ? row["SAT"] || "" : row[this.columns.SAT] || "",
          vol: isObj ? row["VOL"] || "" : row[this.columns.VOL] || "",
          tahun: isObj ? row["TAHUN"] || "" : row[this.columns.TAHUN] || "",
          hargaTotal: isObj
            ? row["HARGA TOTAL"] || ""
            : row[this.columns.HARGA_TOTAL] || "",
          file: isObj ? row["FILE"] || "" : row[this.columns.FILE] || "",
          bidang: isObj ? row["BIDANG"] || "" : row[this.columns.BIDANG] || "",
          kategori: isObj
            ? row["KATEGORI"] || ""
            : row[this.columns.KATEGORI] || "",
          hargaMaterial: isObj
            ? row["HARGA MATERIAL"] || ""
            : row[this.columns.HARGA_MATERIAL] || "",
          hargaJasa: isObj
            ? row["HARGA JASA"] || ""
            : row[this.columns.HARGA_JASA] || "",
          tkdn: isObj ? row["TKDN"] || "" : row[this.columns.TKDN] || "",
          strategisRjpu: isObj
            ? row["STRATEGIS RJPU"] || ""
            : row[this.columns.STRATEGIS_RJPU] || "",
          aset: isObj ? row["ASET"] || "" : row[this.columns.ASET] || "",
          descriptionAset: isObj
            ? row["DESCRIPTION ASET"] || ""
            : row[this.columns.DESCRIPTION_ASET] || "",
          keterangan: isObj
            ? row["KETERANGAN"] || ""
            : row[this.columns.KETERANGAN] || "",
          profilRisk: isObj
            ? row["PROFIL RISK"] || ""
            : row[this.columns.PROFIL_RISK] || "",
          aktivitasAo: isObj
            ? row["AKTIVITAS AO"] || ""
            : row[this.columns.AKTIVITAS_AO] || "",
        };
      });
      let filteredData = processedData.filter(
        (item) =>
          item.programKerja && item.programKerja.toString().trim() !== "",
      );
      if (!userFilter.isAdmin && userFilter.bidangFilter) {
        filteredData = filteredData.filter(
          (item) => item.bidang === userFilter.bidangFilter,
        );
      }
      this._allDataCache = filteredData;
      this._allDataCacheTime = Date.now();
      return filteredData;
    } catch (error) {
      console.error("Error getting all data:", error);
      return [];
    }
  }
  async getRawData() {
    await this.init();
    try {
      return await sheetsService.getRawData(this.sheetName, this.dataRange);
    } catch (error) {
      console.error("Error getting raw data:", error);
      return [];
    }
  }
  // ============================================================
  // GETTERS
  // ============================================================
  async getDataByNo(no) {
    const allData = await this.getAllData();
    const userFilter = await this.getUserFilter();
    const data = allData.find((item) => item.no === no.toString());
    if (data && !userFilter.isAdmin && data.bidang !== userFilter.bidangFilter)
      return null;
    return data;
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
  async getDataByBidang(bidang) {
    const userFilter = await this.getUserFilter();
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
    return allData.filter((item) => item.aset === aset);
  }
  async getDataByTkdn(tkdn) {
    const allData = await this.getAllData();
    return allData.filter((item) => item.tkdn === tkdn);
  }
  async hasAccessToData(no) {
    const userFilter = await this.getUserFilter();
    if (userFilter.isAdmin) return true;
    const data = await this.getDataByNo(no);
    if (!data) return false;
    return data.bidang === userFilter.bidangFilter;
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
    console.log("[RJPU] Target write:", range);
    const result = await sheetsService.writeData(range, rows);
    if (result === false || result?.success === false) {
      throw new Error(result?.message || "Gagal menulis data.");
    }
    return { success: true, range, startRow, endRow, result };
  }
  // Baca nomor semua bidang langsung dari sheet, tanpa cache/filter UI.
  async getProgramNumbersRaw() {
    const raw = await sheetsService.getRawData(this.sheetName, this.dataRange);
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
    await this.init();
    const userFilter = await this.getUserFilter();
    if (!userFilter.isAdmin) {
      if (!data.bidang) data.bidang = userFilter.bidangFilter;
      else if (data.bidang !== userFilter.bidangFilter)
        return { success: false, message: `Access denied` };
    }
    const v = this.validateKategoriHarga(data);
    if (!v.valid) return { success: false, message: v.message };
    const kodeAwal = data.strategisRjpu || "";
    if (!kodeAwal)
      return { success: false, message: "Strategis RJPU wajib dipilih" };
    try {
      const rawData = await this.getProgramNumbersRaw();
      const allData = rawData
        .slice(1)
        .map((row) => ({ no: row?.[this.columns.NO] ?? "" }));
      const nextSeq = this.getNextSequenceForKode(kodeAwal, allData);
      const programId = this.generateProgramId(kodeAwal, nextSeq);
      const newRow = [
        programId,
        data.programKerja || "",
        data.alasanProgram || "",
        data.klusterProgram || "",
        data.oemNonOem || "",
        data.dasarInputProgram || "",
        data.sasaranRjpp || "",
        data.sumberAnggaran || "",
        data.estLevering || "",
        data.levelResikoInherent || "",
        data.levelRisikoResidual || "",
        data.sat || "",
        data.vol || "",
        data.tahun || "",
        v.hargaTotal,
        data.file || "",
        data.bidang || "",
        data.kategori || "",
        v.hargaMaterial || "",
        v.hargaJasa || "",
        data.tkdn || "",
        data.strategisRjpu || "",
        data.aset || "",
        data.descriptionAset || "",
        data.keterangan || "",
        data.profilRisk || "",
        data.aktivitasAo || "", // Tambahan AKTIVITAS AO
      ];
      const result = await this.appendRowsFromColumnA(
        this.sheetName,
        this.lastColumnLetter,
        this.columnNames.length,
        [newRow],
        rawData,
      );
      const currentUser = loginService.getCurrentUser();
      const pengirim = currentUser ? currentUser.nama : "System";
      const bidangPengirim =
        data.bidang || userFilter.bidangFilter || "Unknown";
      await this.addNotification(
        programId,
        data.programKerja,
        pengirim,
        bidangPengirim,
      );
      this.invalidateAllDataCache();
      return {
        success: true,
        message: "Data added successfully",
        no: programId,
        hargaTotal: v.hargaTotal,
        data: result,
      };
    } catch (error) {
      console.error("Error adding data:", error);
      return { success: false, message: error.message };
    }
  }
  // ============================================================
  // UPDATE DATA
  // ============================================================
  async updateData(no, updatedData) {
    await this.init();
    const userFilter = await this.getUserFilter();
    try {
      const allDataRaw = await sheetsService.getRawData(
        this.sheetName,
        this.dataRange,
      );
      let rowIndex = -1;
      for (let i = 1; i < allDataRaw.length; i++) {
        const row = allDataRaw[i];
        if (
          row &&
          row[this.columns.NO] &&
          row[this.columns.NO].toString() === no.toString()
        ) {
          rowIndex = i;
          break;
        }
      }
      if (rowIndex === -1)
        return { success: false, message: `Data with NO ${no} not found` };
      const currentRow = allDataRaw[rowIndex] || [];
      if (
        !userFilter.isAdmin &&
        currentRow[this.columns.BIDANG] !== userFilter.bidangFilter
      ) {
        return { success: false, message: "Access denied" };
      }
      const sheetRow = rowIndex + 1;
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
        kategori: getVal("kategori", this.columns.KATEGORI),
        hargaMaterial: getVal("hargaMaterial", this.columns.HARGA_MATERIAL),
        hargaJasa: getVal("hargaJasa", this.columns.HARGA_JASA),
      };
      const v = this.validateKategoriHarga(mergedData);
      if (!v.valid) return { success: false, message: v.message };
      const updatedRow = [
        no.toString(),
        getVal("programKerja", this.columns.PROGRAM_KERJA),
        getVal("alasanProgram", this.columns.ALASAN_PROGRAM),
        getVal("klusterProgram", this.columns.KLUSTER_PROGRAM),
        getVal("oemNonOem", this.columns.OEM_NON_OEM),
        getVal("dasarInputProgram", this.columns.DASAR_INPUT_PROGRAM),
        getVal("sasaranRjpp", this.columns.SASARAN_RJPP),
        getVal("sumberAnggaran", this.columns.SUMBER_ANGGARAN),
        getVal("estLevering", this.columns.EST_LEVERING),
        getVal("levelResikoInherent", this.columns.LEVEL_RESIKO_INHERENT),
        getVal("levelRisikoResidual", this.columns.LEVEL_RISIKO_RESIDUAL),
        getVal("sat", this.columns.SAT),
        getVal("vol", this.columns.VOL),
        getVal("tahun", this.columns.TAHUN),
        v.hargaTotal,
        getVal("file", this.columns.FILE),
        getVal("bidang", this.columns.BIDANG),
        mergedData.kategori,
        v.hargaMaterial || "",
        v.hargaJasa || "",
        getVal("tkdn", this.columns.TKDN),
        getVal("strategisRjpu", this.columns.STRATEGIS_RJPU),
        getVal("aset", this.columns.ASET),
        getVal("descriptionAset", this.columns.DESCRIPTION_ASET),
        getVal("keterangan", this.columns.KETERANGAN),
        getVal("profilRisk", this.columns.PROFIL_RISK),
        getVal("aktivitasAo", this.columns.AKTIVITAS_AO), // Tambahan AKTIVITAS AO
      ];
      // Range diperluas ke AA
      const range = `${this.sheetName}!A${sheetRow}:AA${sheetRow}`;
      const result = await sheetsService.writeData(range, [updatedRow]);
      if (result === false || result?.success === false) {
        throw new Error(result?.message || "Gagal update program.");
      }
      this.invalidateAllDataCache();
      return {
        success: true,
        message: `Data updated successfully`,
        data: result,
      };
    } catch (error) {
      console.error("Error updating data:", error);
      return { success: false, message: error.message };
    }
  }
  // ============================================================
  // DELETE DATA
  // ============================================================
  async deleteData(no) {
    const userFilter = await this.getUserFilter();
    if (!userFilter.isAdmin)
      return { success: false, message: "Akses ditolak" };
    await this.init();
    try {
      const allDataRaw = await sheetsService.getRawData(
        this.sheetName,
        this.dataRange,
      );
      let rowIndex = -1;
      for (let i = 1; i < allDataRaw.length; i++) {
        const row = allDataRaw[i];
        if (
          row &&
          row[this.columns.NO] &&
          row[this.columns.NO].toString() === no.toString()
        ) {
          rowIndex = i;
          break;
        }
      }
      if (rowIndex === -1) return { success: false, message: `Data not found` };
      await this.deleteNotificationsByProgramNo(no);
      const sheetRow = rowIndex + 1;
      const emptyRow = Array(this.columnNames.length).fill("");
      // Range diperluas ke AA
      await sheetsService.writeData(
        `${this.sheetName}!A${sheetRow}:AA${sheetRow}`,
        [emptyRow],
      );
      await this.renumberData();
      this.invalidateAllDataCache();
      return { success: true, message: `Data deleted successfully` };
    } catch (error) {
      console.error("Error deleting data:", error);
      return { success: false, message: error.message };
    }
  }
  async renumberData() {
    try {
      const allDataRaw = await sheetsService.getRawData(
        this.sheetName,
        this.dataRange,
      );
      if (!allDataRaw || allDataRaw.length <= 1) return true;
      const counters = {};
      const newColumnA = [];
      newColumnA.push([allDataRaw[0]?.[this.columns.NO] || "NO"]);
      for (let i = 1; i < allDataRaw.length; i++) {
        const row = allDataRaw[i];
        const hasData = row && row.some((c) => c && c.toString().trim() !== "");
        if (!hasData) {
          newColumnA.push([row?.[this.columns.NO] || ""]);
          continue;
        }
        const kodeAwal = row[this.columns.STRATEGIS_RJPU];
        if (!kodeAwal) {
          newColumnA.push([row[this.columns.NO] || ""]);
          continue;
        }
        if (!counters[kodeAwal]) counters[kodeAwal] = 1;
        const seq = counters[kodeAwal]++;
        newColumnA.push([this.generateProgramId(kodeAwal, seq)]);
      }
      await sheetsService.writeData(
        `${this.sheetName}!A1:A${newColumnA.length}`,
        newColumnA,
      );
      this.invalidateAllDataCache();
      return true;
    } catch (error) {
      console.error("Error renumbering data:", error);
      return false;
    }
  }
  // ============================================================
  // MOVE TO DROP
  // ============================================================
  async moveToDrop(no, keterangan = "DROP") {
    const userFilter = await this.getUserFilter();
    if (!userFilter.isAdmin)
      return { success: false, message: "Akses ditolak" };
    await this.init();
    try {
      const allDataRaw = await sheetsService.getRawData(
        this.sheetName,
        this.dataRange,
      );
      if (!allDataRaw || allDataRaw.length <= 1)
        return { success: false, message: `No data found` };
      let rowIndex = -1;
      let rowData = null;
      for (let i = 1; i < allDataRaw.length; i++) {
        const row = allDataRaw[i];
        if (
          row &&
          row[this.columns.NO] &&
          row[this.columns.NO].toString() === no.toString()
        ) {
          rowIndex = i;
          rowData = row;
          break;
        }
      }
      if (rowIndex === -1 || !rowData)
        return { success: false, message: `Data not found` };
      const dropDate = this.getTanggalSekarang();
      const dropRow = [
        rowData[this.columns.NO] || "",
        rowData[this.columns.PROGRAM_KERJA] || "",
        rowData[this.columns.ALASAN_PROGRAM] || "",
        rowData[this.columns.KLUSTER_PROGRAM] || "",
        rowData[this.columns.OEM_NON_OEM] || "",
        rowData[this.columns.DASAR_INPUT_PROGRAM] || "",
        rowData[this.columns.SASARAN_RJPP] || "",
        rowData[this.columns.SUMBER_ANGGARAN] || "",
        rowData[this.columns.EST_LEVERING] || "",
        rowData[this.columns.LEVEL_RESIKO_INHERENT] || "",
        rowData[this.columns.LEVEL_RISIKO_RESIDUAL] || "",
        rowData[this.columns.SAT] || "",
        rowData[this.columns.VOL] || "",
        rowData[this.columns.TAHUN] || "",
        rowData[this.columns.HARGA_TOTAL] || "",
        rowData[this.columns.FILE] || "",
        rowData[this.columns.BIDANG] || "",
        rowData[this.columns.KATEGORI] || "",
        rowData[this.columns.HARGA_MATERIAL] || "",
        rowData[this.columns.HARGA_JASA] || "",
        rowData[this.columns.TKDN] || "",
        rowData[this.columns.STRATEGIS_RJPU] || "",
        rowData[this.columns.ASET] || "",
        rowData[this.columns.DESCRIPTION_ASET] || "",
        rowData[this.columns.KETERANGAN] || "",
        dropDate,
        keterangan,
        no.toString(),
        rowData[this.columns.PROFIL_RISK] || "",
        rowData[this.columns.AKTIVITAS_AO] || "", // Tambahan AKTIVITAS AO
      ];
      const dropExists = await sheetsService.sheetExists("Drop");
      if (!dropExists) {
        await sheetsService.writeData("Drop!A1:AD1", [
          [
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
            "DROP DATE",
            "DROP STATUS",
            "ORIGINAL NO",
            "PROFIL RISK",
            "AKTIVITAS AO",
          ],
        ]);
      } else {
        await sheetsService.updateCell("Drop!AC1", "PROFIL RISK");
        await sheetsService.updateCell("Drop!AD1", "AKTIVITAS AO");
      }
      const appendResult = await this.appendRowsFromColumnA("Drop", "AD", 30, [
        dropRow,
      ]);
      if (!appendResult.success)
        return { success: false, message: "Failed to move data to Drop" };
      await this.deleteNotificationsByProgramNo(no);
      const sheetRow = rowIndex + 1;
      const emptyRow = Array(this.columnNames.length).fill("");
      await sheetsService.writeData(
        `${this.sheetName}!A${sheetRow}:AA${sheetRow}`,
        [emptyRow],
      );
      await this.renumberData();
      this.invalidateAllDataCache();
      return { success: true, message: `Data moved to Drop successfully` };
    } catch (error) {
      console.error("Error moving data to Drop:", error);
      return { success: false, message: error.message };
    }
  }
  // ============================================================
  // RESTORE FROM DROP
  // ============================================================
  async restoreFromDrop(originalNo) {
    const userFilter = await this.getUserFilter();
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
      // Baca sampai AD karena Drop sekarang punya tambahan AKTIVITAS AO
      const dropRaw = await sheetsService.getRawData("Drop", "A:AD");
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
      const sourceRow = dropRaw[dropRowIndex];
      const restoredRow = this.columnNames.map((columnName) => {
        const sourceIndex = dropIndex.get(normalizeHeader(columnName));
        return sourceIndex === undefined ? "" : (sourceRow[sourceIndex] ?? "");
      });
      if (!asString(restoredRow[this.columns.PROGRAM_KERJA]))
        throw new Error("PROGRAM KERJA pada data Drop kosong.");
      const bidang = asString(restoredRow[this.columns.BIDANG]);
      if (/^MT-[A-Z0-9-]+-\d+$/i.test(bidang))
        throw new Error("BIDANG di sheet Drop berisi ID program.");
      const dataRaw = await sheetsService.getRawData(this.sheetName, "A:AA");
      if (!Array.isArray(dataRaw) || dataRaw.length === 0)
        throw new Error("Sheet Data tidak memiliki header.");
      const kodeAwal =
        asString(restoredRow[this.columns.STRATEGIS_RJPU]) || "XX";
      const existingData = dataRaw.slice(1).map((row) => ({
        no: Array.isArray(row) ? row[this.columns.NO] : "",
      }));
      const nextSequence = this.getNextSequenceForKode(kodeAwal, existingData);
      const newNo = this.generateProgramId(kodeAwal, nextSequence);
      restoredRow[this.columns.NO] = newNo;
      const targetSheetRow = Math.max(2, dataRaw.length + 1);
      // Tulis sampai AA
      const dataRange = `${this.sheetName}!A${targetSheetRow}:AA${targetSheetRow}`;
      const restoreResult = await sheetsService.writeData(dataRange, [
        restoredRow,
      ]);
      if (restoreResult === false || restoreResult?.success === false) {
        throw new Error(restoreResult?.message || "Gagal restore ke Data.");
      }
      // Hapus baris sumber Drop
      const dropSheetRow = dropRowIndex + 1;
      await sheetsService.writeData(`Drop!A${dropSheetRow}:AD${dropSheetRow}`, [
        Array(30).fill(""),
      ]);
      this.invalidateAllDataCache();
      return {
        success: true,
        message: `Program berhasil direstore dengan NO ${newNo}.`,
        newNo,
        row: targetSheetRow,
      };
    } catch (error) {
      console.error("Error restoring data from Drop:", error);
      this.invalidateAllDataCache();
      return { success: false, message: error.message };
    }
  }
  // ============================================================
  // SEARCH & SUMMARY
  // ============================================================
  async searchData(keyword) {
    const allData = await this.getAllData();
    const lower = keyword.toLowerCase();
    return allData.filter((item) =>
      Object.values(item).some((v) =>
        v.toString().toLowerCase().includes(lower),
      ),
    );
  }
  async getSummaryByYear() {
    const allData = await this.getAllData();
    const summary = {};
    allData.forEach((item) => {
      const t = item.tahun;
      if (!summary[t])
        summary[t] = { totalProgram: 0, totalAnggaran: 0, programList: [] };
      summary[t].totalProgram++;
      summary[t].totalAnggaran += parseFloat(item.hargaTotal) || 0;
      summary[t].programList.push(item.programKerja);
    });
    return summary;
  }
  async getSummaryByKluster() {
    const allData = await this.getAllData();
    const summary = {};
    allData.forEach((item) => {
      const k = item.klusterProgram;
      if (!summary[k])
        summary[k] = { totalProgram: 0, totalAnggaran: 0, programList: [] };
      summary[k].totalProgram++;
      summary[k].totalAnggaran += parseFloat(item.hargaTotal) || 0;
      summary[k].programList.push(item.programKerja);
    });
    return summary;
  }
  async getSummaryBySumberAnggaran() {
    const allData = await this.getAllData();
    const summary = {};
    allData.forEach((item) => {
      const s = item.sumberAnggaran;
      if (!summary[s])
        summary[s] = { totalProgram: 0, totalAnggaran: 0, programList: [] };
      summary[s].totalProgram++;
      summary[s].totalAnggaran += parseFloat(item.hargaTotal) || 0;
      summary[s].programList.push(item.programKerja);
    });
    return summary;
  }
  async getSummaryByBidang() {
    const allData = await this.getAllData();
    const summary = {};
    allData.forEach((item) => {
      const b = item.bidang;
      if (!b) return;
      if (!summary[b])
        summary[b] = { totalProgram: 0, totalAnggaran: 0, programList: [] };
      summary[b].totalProgram++;
      summary[b].totalAnggaran += parseFloat(item.hargaTotal) || 0;
      summary[b].programList.push(item.programKerja);
    });
    return summary;
  }
  async getSummaryByKategori() {
    const allData = await this.getAllData();
    const summary = {};
    allData.forEach((item) => {
      const k = item.kategori || "(Tanpa Kategori)";
      if (!summary[k])
        summary[k] = {
          totalProgram: 0,
          totalAnggaran: 0,
          totalMaterial: 0,
          totalJasa: 0,
          programList: [],
        };
      summary[k].totalProgram++;
      summary[k].totalAnggaran += parseFloat(item.hargaTotal) || 0;
      summary[k].totalMaterial += parseFloat(item.hargaMaterial) || 0;
      summary[k].totalJasa += parseFloat(item.hargaJasa) || 0;
      summary[k].programList.push(item.programKerja);
    });
    return summary;
  }
  async getSummaryByAset() {
    const allData = await this.getAllData();
    const summary = {};
    allData.forEach((item) => {
      const a = item.aset || "(Tanpa Aset)";
      if (!summary[a])
        summary[a] = { totalProgram: 0, totalAnggaran: 0, programList: [] };
      summary[a].totalProgram++;
      summary[a].totalAnggaran += parseFloat(item.hargaTotal) || 0;
      summary[a].programList.push(item.programKerja);
    });
    return summary;
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
    const userFilter = await this.getUserFilter();
    try {
      const rawData = await this.getProgramNumbersRaw();
      const allData = rawData
        .slice(1)
        .map((row) => ({ no: row?.[this.columns.NO] ?? "" }));
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
            allData,
          );
        const seq = counters[normalizedKode]++;
        const programId = this.generateProgramId(kodeAwal, seq);
        rows.push([
          programId,
          item.programKerja || "",
          item.alasanProgram || "",
          item.klusterProgram || "",
          item.oemNonOem || "",
          item.dasarInputProgram || "",
          item.sasaranRjpp || "",
          item.sumberAnggaran || "",
          item.estLevering || "",
          item.levelResikoInherent || "",
          item.levelRisikoResidual || "",
          item.sat || "",
          item.vol || "",
          item.tahun || "",
          v.hargaTotal,
          item.file || "",
          item.bidang || "",
          item.kategori || "",
          v.hargaMaterial || "",
          v.hargaJasa || "",
          item.tkdn || "",
          item.strategisRjpu || "",
          item.aset || "",
          item.descriptionAset || "",
          item.keterangan || "",
          item.profilRisk || "",
          item.aktivitasAo || "", // Aktivitas AO Bulk
        ]);
        addedPrograms.push({
          programId,
          programKerja: item.programKerja,
          bidang: item.bidang || userFilter.bidangFilter,
        });
      }
      const result = await this.appendRowsFromColumnA(
        this.sheetName,
        this.lastColumnLetter,
        this.columnNames.length,
        rows,
        rawData,
      );
      const currentUser = loginService.getCurrentUser();
      const pengirim = currentUser ? currentUser.nama : "System";
      await this.addNotificationsBatch(addedPrograms, pengirim);
      this.invalidateAllDataCache();
      return {
        success: true,
        message: `${dataArray.length} data added`,
        data: result,
      };
    } catch (error) {
      console.error("Error bulk inserting data:", error);
      return { success: false, message: error.message };
    }
  }
  async exportToJSON() {
    const allData = await this.getAllData();
    const userFilter = await this.getUserFilter();
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
    const userFilter = await this.getUserFilter();
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
    const userFilter = await this.getUserFilter();
    const totalPrograms = allData.length;
    const totalBudget = allData.reduce(
      (sum, item) => sum + (parseFloat(item.hargaTotal) || 0),
      0,
    );
    const totalMaterial = allData.reduce(
      (sum, item) => sum + (parseFloat(item.hargaMaterial) || 0),
      0,
    );
    const totalJasa = allData.reduce(
      (sum, item) => sum + (parseFloat(item.hargaJasa) || 0),
      0,
    );
    const years = [
      ...new Set(allData.map((item) => item.tahun).filter(Boolean)),
    ];
    const clusters = [
      ...new Set(allData.map((item) => item.klusterProgram).filter(Boolean)),
    ];
    const bidangs = [
      ...new Set(allData.map((item) => item.bidang).filter(Boolean)),
    ];
    const kategoris = [
      ...new Set(allData.map((item) => item.kategori).filter(Boolean)),
    ];
    const asets = [
      ...new Set(allData.map((item) => item.aset).filter(Boolean)),
    ];
    return {
      success: true,
      statistics: {
        totalPrograms,
        totalBudget,
        totalMaterial,
        totalJasa,
        uniqueYears: years.length,
        uniqueClusters: clusters.length,
        uniqueBidangs: bidangs.length,
        uniqueKategoris: kategoris.length,
        uniqueAsets: asets.length,
        yearsList: years.sort(),
        clustersList: clusters.sort(),
        bidangsList: bidangs.sort(),
        kategorisList: kategoris.sort(),
        asetsList: asets.sort(),
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
