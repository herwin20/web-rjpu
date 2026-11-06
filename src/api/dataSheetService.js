// DataSheetOperations.js
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
    ];
    this.dataRange = "A:Y";
    this.lastColumnLetter = "Y";
    this.validKategori = ["Material", "Jasa", "Material & Jasa"];
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
        message: `User filtered by bidang: ${currentUser ? currentUser.nama : "unknown"}`,
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
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

  // Validasi kategori + harga. Return { valid, message, hargaMaterial, hargaJasa, hargaTotal }
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

  // ============================================================
  // INIT
  // ============================================================
  async init() {
    await sheetsService.init();
    await this.ensureHeaders();
    await this.ensureNotificationSheet();
  }

  async ensureHeaders() {
    try {
      const rawData = await sheetsService.getRawData(
        this.sheetName,
        this.dataRange,
      );

      if (rawData.length === 0) {
        await sheetsService.writeData(`${this.sheetName}!A1:Y1`, [
          this.columnNames,
        ]);
        console.log("✅ Headers created for Data sheet");
        return;
      }

      const currentHeaders = rawData[0] || [];
      if (currentHeaders.length < this.columnNames.length) {
        console.log(
          `🔄 Migrating headers from ${currentHeaders.length} to ${this.columnNames.length} columns...`,
        );
        await sheetsService.writeData(`${this.sheetName}!A1:Y1`, [
          this.columnNames,
        ]);
        console.log("✅ Headers migrated successfully");
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

  async addNotification(programNo, programKerja, pengirim, bidangPengirim) {
    try {
      const notificationId = this.generateNotificationId();
      const tanggalKirim = new Date().toLocaleString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
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
          message: "Notification created successfully",
        };
      }
      throw new Error("Failed to append notification");
    } catch (error) {
      console.error("Error adding notification:", error);
      return { success: false, message: error.message };
    }
  }

  async getAllNotifications() {
    await this.ensureNotificationSheet();
    try {
      const userFilter = await this.getUserFilter();
      const notifications = await sheetsService.getAllData(
        "Notification",
        "A:J",
      );
      if (!notifications || notifications.length === 0) return [];

      let notificationList = [];
      const firstRow = notifications[0];
      const isHeaderRow =
        Array.isArray(firstRow) &&
        (firstRow[0] === "ID_NOTIF" ||
          firstRow[0]?.toString().toUpperCase() === "ID_NOTIF");
      const startIndex = isHeaderRow ? 1 : 0;

      for (let i = startIndex; i < notifications.length; i++) {
        const row = notifications[i];
        if (!row || row.length === 0) continue;
        if (Array.isArray(row)) {
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
        } else if (typeof row === "object") {
          notificationList.push({
            idNotif: row.ID_NOTIF || row.idNotif || row[0] || "",
            programNo: row.PROGRAM_NO || row.programNo || row[1] || "",
            programKerja: row.PROGRAM_KERJA || row.programKerja || row[2] || "",
            pengirim: row.PENGIRIM || row.pengirim || row[3] || "",
            bidangPengirim:
              row.BIDANG_PENGIRIM || row.bidangPengirim || row[4] || "",
            tanggalKirim: row.TANGGAL_KIRIM || row.tanggalKirim || row[5] || "",
            status: row.STATUS || row.status || row[6] || "UNREAD",
            dibacaOleh: row.DIBACA_OLEH || row.dibacaOleh || row[7] || "",
            tanggalBaca: row.TANGGAL_BACA || row.tanggalBaca || row[8] || "",
            catatan: row.CATATAN || row.catatan || row[9] || "",
          });
        }
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
      const tanggalBaca = new Date().toLocaleString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      await sheetsService.updateCell(`Notification!G${sheetRow}`, "READ");
      await sheetsService.updateCell(`Notification!H${sheetRow}`, readerName);
      await sheetsService.updateCell(`Notification!I${sheetRow}`, tanggalBaca);
      return { success: true, message: "Notification marked as read" };
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return { success: false, message: error.message };
    }
  }

  async markAllNotificationsAsRead(programNo, readerName) {
    try {
      const all = await sheetsService.getRawData("Notification", "A:J");
      const updates = [];
      for (let i = 1; i < all.length; i++) {
        const row = all[i];
        if (row && row[1] === programNo && row[6] === "UNREAD") {
          updates.push({ row: i + 1 });
        }
      }
      const tanggalBaca = new Date().toLocaleString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      for (const u of updates) {
        await sheetsService.updateCell(`Notification!G${u.row}`, "READ");
        await sheetsService.updateCell(`Notification!H${u.row}`, readerName);
        await sheetsService.updateCell(`Notification!I${u.row}`, tanggalBaca);
      }
      return {
        success: true,
        message: `${updates.length} notification(s) marked as read`,
      };
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return { success: false, message: error.message };
    }
  }

  async deleteNotificationsByProgramNo(programNo) {
    try {
      const all = await sheetsService.getRawData("Notification", "A:J");
      const toDelete = [];
      for (let i = 1; i < all.length; i++) {
        if (all[i] && all[i][1] === programNo) toDelete.push(i);
      }
      for (let i = toDelete.length - 1; i >= 0; i--) {
        const sheetRow = toDelete[i] + 1;
        await sheetsService.writeData(
          `Notification!A${sheetRow}:J${sheetRow}`,
          [Array(10).fill("")],
        );
      }
      return {
        success: true,
        message: `${toDelete.length} notification(s) deleted`,
      };
    } catch (error) {
      console.error("Error deleting notifications:", error);
      return { success: false, message: error.message };
    }
  }

  // ============================================================
  // GET ALL DATA
  // ============================================================
  async getAllData() {
    await this.init();

    try {
      const data = await sheetsService.getAllData(
        this.sheetName,
        this.dataRange,
      );
      const userFilter = await this.getUserFilter();

      const isObjectFormat =
        data.length > 0 &&
        !Array.isArray(data[0]) &&
        typeof data[0] === "object";
      const isArrayFormat = data.length > 0 && Array.isArray(data[0]);

      let processedData = [];

      if (isObjectFormat) {
        processedData = data.map((row) => ({
          no: row["NO"] || "",
          programKerja: row["PROGRAM KERJA"] || "",
          alasanProgram: row["ALASAN PROGRAM"] || "",
          klusterProgram: row["KLUSTER PROGRAM"] || "",
          oemNonOem: row["OEM/NON OEM"] || "",
          dasarInputProgram: row["DASAR INPUT PROGRAM"] || "",
          sasaranRjpp: row["SASARAN RJPP"] || "",
          sumberAnggaran: row["SUMBER ANGGARAN"] || "",
          estLevering: row["EST LEVERING"] || "",
          levelResikoInherent: row["LEVEL RESIKO INHERENT"] || "",
          levelRisikoResidual: row["LEVEL RISIKO RESIDUAL"] || "",
          sat: row["SAT"] || "",
          vol: row["VOL"] || "",
          tahun: row["TAHUN"] || "",
          hargaTotal: row["HARGA TOTAL"] || "",
          file: row["FILE"] || "",
          bidang: row["BIDANG"] || "",
          kategori: row["KATEGORI"] || "",
          hargaMaterial: row["HARGA MATERIAL"] || "",
          hargaJasa: row["HARGA JASA"] || "",
          tkdn: row["TKDN"] || "",
          strategisRjpu: row["STRATEGIS RJPU"] || "",
          aset: row["ASET"] || "",
          descriptionAset: row["DESCRIPTION ASET"] || "",
          keterangan: row["KETERANGAN"] || "",
        }));
      } else if (isArrayFormat) {
        processedData = data.map((row) => ({
          no: row[this.columns.NO] || "",
          programKerja: row[this.columns.PROGRAM_KERJA] || "",
          alasanProgram: row[this.columns.ALASAN_PROGRAM] || "",
          klusterProgram: row[this.columns.KLUSTER_PROGRAM] || "",
          oemNonOem: row[this.columns.OEM_NON_OEM] || "",
          dasarInputProgram: row[this.columns.DASAR_INPUT_PROGRAM] || "",
          sasaranRjpp: row[this.columns.SASARAN_RJPP] || "",
          sumberAnggaran: row[this.columns.SUMBER_ANGGARAN] || "",
          estLevering: row[this.columns.EST_LEVERING] || "",
          levelResikoInherent: row[this.columns.LEVEL_RESIKO_INHERENT] || "",
          levelRisikoResidual: row[this.columns.LEVEL_RISIKO_RESIDUAL] || "",
          sat: row[this.columns.SAT] || "",
          vol: row[this.columns.VOL] || "",
          tahun: row[this.columns.TAHUN] || "",
          hargaTotal: row[this.columns.HARGA_TOTAL] || "",
          file: row[this.columns.FILE] || "",
          bidang: row[this.columns.BIDANG] || "",
          kategori: row[this.columns.KATEGORI] || "",
          hargaMaterial: row[this.columns.HARGA_MATERIAL] || "",
          hargaJasa: row[this.columns.HARGA_JASA] || "",
          tkdn: row[this.columns.TKDN] || "",
          strategisRjpu: row[this.columns.STRATEGIS_RJPU] || "",
          aset: row[this.columns.ASET] || "",
          descriptionAset: row[this.columns.DESCRIPTION_ASET] || "",
          keterangan: row[this.columns.KETERANGAN] || "",
        }));
      } else {
        processedData = data.map((row) => {
          if (row && typeof row === "object" && !Array.isArray(row)) {
            return {
              no: row.NO || "",
              programKerja: row["PROGRAM KERJA"] || row.programKerja || "",
              alasanProgram: row["ALASAN PROGRAM"] || row.alasanProgram || "",
              klusterProgram:
                row["KLUSTER PROGRAM"] || row.klusterProgram || "",
              oemNonOem: row["OEM/NON OEM"] || row.oemNonOem || "",
              dasarInputProgram:
                row["DASAR INPUT PROGRAM"] || row.dasarInputProgram || "",
              sasaranRjpp: row["SASARAN RJPP"] || row.sasaranRjpp || "",
              sumberAnggaran:
                row["SUMBER ANGGARAN"] || row.sumberAnggaran || "",
              estLevering: row["EST LEVERING"] || row.estLevering || "",
              levelResikoInherent:
                row["LEVEL RESIKO INHERENT"] || row.levelResikoInherent || "",
              levelRisikoResidual:
                row["LEVEL RISIKO RESIDUAL"] || row.levelRisikoResidual || "",
              sat: row.SAT || row.sat || "",
              vol: row.VOL || row.vol || "",
              tahun: row.TAHUN || row.tahun || "",
              hargaTotal: row["HARGA TOTAL"] || row.hargaTotal || "",
              file: row.FILE || row.file || "",
              bidang: row.BIDANG || row.bidang || "",
              kategori: row.KATEGORI || row.kategori || "",
              hargaMaterial: row["HARGA MATERIAL"] || row.hargaMaterial || "",
              hargaJasa: row["HARGA JASA"] || row.hargaJasa || "",
              tkdn: row.TKDN || row.tkdn || "",
              strategisRjpu: row["STRATEGIS RJPU"] || row.strategisRjpu || "",
              aset: row.ASET || row.aset || "",
              descriptionAset:
                row["DESCRIPTION ASET"] || row.descriptionAset || "",
              keterangan: row.KETERANGAN || row.keterangan || "",
            };
          }
          return {};
        });
      }

      let filteredData = processedData.filter(
        (item) =>
          item.programKerja && item.programKerja.toString().trim() !== "",
      );

      if (!userFilter.isAdmin && userFilter.bidangFilter) {
        filteredData = filteredData.filter(
          (item) => item.bidang === userFilter.bidangFilter,
        );
      }

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
    if (
      data &&
      !userFilter.isAdmin &&
      data.bidang !== userFilter.bidangFilter
    ) {
      console.warn(
        `User ${userFilter.bidangFilter} attempted to access data from bidang ${data.bidang}`,
      );
      return null;
    }
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
    if (!userFilter.isAdmin && bidang !== userFilter.bidangFilter) {
      console.warn(
        `User ${userFilter.bidangFilter} cannot filter by bidang ${bidang}`,
      );
      return [];
    }
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
  async addData(data) {
    await this.init();
    const userFilter = await this.getUserFilter();

    if (!userFilter.isAdmin) {
      if (!data.bidang) {
        data.bidang = userFilter.bidangFilter;
      } else if (data.bidang !== userFilter.bidangFilter) {
        return {
          success: false,
          message: `Access denied: You can only add data for bidang '${userFilter.bidangFilter}'`,
        };
      }
    }

    // Validasi kategori & harga
    const v = this.validateKategoriHarga(data);
    if (!v.valid) {
      return { success: false, message: v.message };
    }

    // Validasi strategi
    const kodeAwal = data.strategisRjpu || "";
    if (!kodeAwal) {
      return {
        success: false,
        message: "Strategis RJPU wajib dipilih",
      };
    }

    try {
      const allData = await this.getAllData();
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
      ];

      const rowCount = await sheetsService.getRowCount(this.sheetName);
      const startRow = rowCount + 2;
      const range = `${this.sheetName}!A${startRow}:Y${startRow}`;
      const result = await sheetsService.writeData(range, [newRow]);

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
    const hasAccess = await this.hasAccessToData(no);
    const userFilter = await this.getUserFilter();

    if (!hasAccess && !userFilter.isAdmin) {
      return {
        success: false,
        message: "Access denied: You can only update data from your bidang",
      };
    }

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
      if (rowIndex === -1)
        return { success: false, message: `Data with NO ${no} not found` };

      const sheetRow = rowIndex + 1;
      const currentRow = allDataRaw[rowIndex] || [];

      if (
        !userFilter.isAdmin &&
        updatedData.bidang &&
        updatedData.bidang !== userFilter.bidangFilter
      ) {
        return {
          success: false,
          message: "Access denied: You cannot change the bidang field",
        };
      }

      const getVal = (key, colIndex) =>
        updatedData[key] !== undefined
          ? updatedData[key]
          : currentRow[colIndex] || "";

      // Gabungkan kategori & harga dari current atau updated
      const mergedData = {
        kategori: getVal("kategori", this.columns.KATEGORI),
        hargaMaterial: getVal("hargaMaterial", this.columns.HARGA_MATERIAL),
        hargaJasa: getVal("hargaJasa", this.columns.HARGA_JASA),
      };

      const v = this.validateKategoriHarga(mergedData);
      if (!v.valid) {
        return { success: false, message: v.message };
      }

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
      ];

      const range = `${this.sheetName}!A${sheetRow}:Y${sheetRow}`;
      const result = await sheetsService.writeData(range, [updatedRow]);
      return {
        success: true,
        message: `Data with NO ${no} updated successfully`,
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
    const hasAccess = await this.hasAccessToData(no);
    const userFilter = await this.getUserFilter();

    if (!hasAccess && !userFilter.isAdmin) {
      return {
        success: false,
        message: "Access denied: You can only delete data from your bidang",
      };
    }

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
      if (rowIndex === -1)
        return { success: false, message: `Data with NO ${no} not found` };

      await this.deleteNotificationsByProgramNo(no);

      const sheetRow = rowIndex + 1;
      const emptyRow = Array(this.columnNames.length).fill("");
      await sheetsService.writeData(
        `${this.sheetName}!A${sheetRow}:Y${sheetRow}`,
        [emptyRow],
      );

      await this.renumberData();
      return {
        success: true,
        message: `Data with NO ${no} deleted successfully`,
      };
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
      const updates = [];

      for (let i = 1; i < allDataRaw.length; i++) {
        const row = allDataRaw[i];
        const hasData = row && row.some((c) => c && c.toString().trim() !== "");
        if (!hasData) continue;

        const kodeAwal = row[this.columns.STRATEGIS_RJPU];
        if (!kodeAwal) continue;

        if (!counters[kodeAwal]) counters[kodeAwal] = 1;
        const seq = counters[kodeAwal]++;
        const newId = this.generateProgramId(kodeAwal, seq);
        const currentId = row[this.columns.NO];

        if (currentId !== newId) {
          updates.push({ rowIndex: i, newId });
        }
      }

      for (const u of updates) {
        await sheetsService.updateCell(
          `${this.sheetName}!A${u.rowIndex + 1}`,
          u.newId,
        );
      }
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
    const hasAccess = await this.hasAccessToData(no);
    const userFilter = await this.getUserFilter();

    if (!hasAccess && !userFilter.isAdmin) {
      return {
        success: false,
        message: "Access denied: You can only move data from your bidang",
      };
    }

    await this.init();

    try {
      const allDataRaw = await sheetsService.getRawData(
        this.sheetName,
        this.dataRange,
      );
      if (!allDataRaw || allDataRaw.length <= 1) {
        return { success: false, message: `No data found in sheet` };
      }

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
      if (rowIndex === -1 || !rowData) {
        return {
          success: false,
          message: `Data with NO ${no} not found in sheet`,
        };
      }

      const dropDate = new Date().toLocaleString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

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
      ];

      const dropExists = await sheetsService.sheetExists("Drop");
      if (!dropExists) {
        await sheetsService.writeData("Drop!A1:AB1", [
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
          ],
        ]);
      }

      const appendResult = await sheetsService.appendData("Drop", [dropRow]);
      if (!appendResult.success) {
        return {
          success: false,
          message: "Failed to move data to Drop sheet",
        };
      }

      await this.deleteNotificationsByProgramNo(no);

      const sheetRow = rowIndex + 1;
      const emptyRow = Array(this.columnNames.length).fill("");
      await sheetsService.writeData(
        `${this.sheetName}!A${sheetRow}:Y${sheetRow}`,
        [emptyRow],
      );

      await this.renumberData();
      return {
        success: true,
        message: `Data with NO ${no} moved to Drop sheet successfully`,
      };
    } catch (error) {
      console.error("Error moving data to Drop:", error);
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
    return {
      success: false,
      message: `No file found for program with NO ${no}`,
    };
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

  // ============================================================
  // BULK INSERT
  // ============================================================
  async bulkInsert(dataArray) {
    await this.init();
    const userFilter = await this.getUserFilter();

    try {
      const allData = await this.getAllData();
      const counters = {};
      const rows = [];
      const addedPrograms = [];

      for (let i = 0; i < dataArray.length; i++) {
        const item = dataArray[i];

        if (!userFilter.isAdmin) {
          if (!item.bidang) item.bidang = userFilter.bidangFilter;
          else if (item.bidang !== userFilter.bidangFilter) {
            return {
              success: false,
              message: `Access denied untuk baris ${i + 1}`,
            };
          }
        }

        const v = this.validateKategoriHarga(item);
        if (!v.valid) {
          return { success: false, message: `Baris ${i + 1}: ${v.message}` };
        }

        const kodeAwal = item.strategisRjpu;
        if (!kodeAwal) {
          return {
            success: false,
            message: `Baris ${i + 1}: Strategis RJPU wajib diisi`,
          };
        }

        if (!counters[kodeAwal])
          counters[kodeAwal] = this.getNextSequenceForKode(kodeAwal, allData);
        const seq = counters[kodeAwal]++;
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
        ]);

        addedPrograms.push({
          programId,
          programKerja: item.programKerja,
          bidang: item.bidang || userFilter.bidangFilter,
        });
      }

      const rowCount = await sheetsService.getRowCount(this.sheetName);
      const startRow = rowCount + 2;
      const endRow = rowCount + 1 + dataArray.length;
      const range = `${this.sheetName}!A${startRow}:Y${endRow}`;
      const result = await sheetsService.writeData(range, rows);

      const currentUser = loginService.getCurrentUser();
      const pengirim = currentUser ? currentUser.nama : "System";

      for (const p of addedPrograms) {
        await this.addNotification(
          p.programId,
          p.programKerja,
          pengirim,
          p.bidang,
        );
      }

      return {
        success: true,
        message: `${dataArray.length} data added successfully`,
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
