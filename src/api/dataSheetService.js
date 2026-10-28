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
      KETERANGAN: 17,
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
      "KETERANGAN",
    ];
  }

  // Helper method untuk mendapatkan filter berdasarkan user yang login
  async getUserFilter() {
    try {
      // Cek apakah user sudah login
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

      // Jika admin, tidak ada filter bidang
      if (isAdmin) {
        return {
          isAdmin: true,
          bidangFilter: null,
          message: "Admin has full access",
        };
      }

      // Jika user (non-Admin), filter berdasarkan nama user yang sama dengan bidang
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

  // Inisialisasi sheet (buat header jika belum ada)
  async init() {
    await sheetsService.init();
    await this.ensureHeaders();
    await this.ensureNotificationSheet(); // Tambahkan ini
  }

  // Pastikan header sudah ada di sheet
  async ensureHeaders() {
    try {
      const allData = await sheetsService.getAllData(this.sheetName, "A:R");
      if (allData.length === 0) {
        // Buat header row
        await sheetsService.writeData(`${this.sheetName}!A1:R1`, [
          this.columnNames,
        ]);
        console.log("✅ Headers created for Data sheet");
      } else {
        // Check if Keterangan column exists, if not add it
        const firstRow = allData[0];
        if (firstRow && firstRow.length < 18) {
          await this.addKeteranganColumn();
        }
      }
    } catch (error) {
      console.error("Error ensuring headers:", error);
    }
  }

  // Pastikan Notification sheet sudah ada
  async ensureNotificationSheet() {
    try {
      const notificationExists =
        await sheetsService.sheetExists("Notification");
      if (!notificationExists) {
        // Buat header untuk Notification sheet
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

  // Tambahkan Keterangan column ke existing sheet
  async addKeteranganColumn() {
    try {
      await sheetsService.updateCell(`${this.sheetName}!R1`, "KETERANGAN");
      console.log("✅ Keterangan column added to existing sheet");
    } catch (error) {
      console.error("Error adding Keterangan column:", error);
    }
  }

  // Generate notification ID
  generateNotificationId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `NOTIF-${timestamp}-${random}`;
  }

  // Tambahkan notifikasi ke sheet Notification
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
        "UNREAD", // Status: UNREAD atau READ
        "", // DIBACA_OLEH
        "", // TANGGAL_BACA
        "", // CATATAN
      ];

      const result = await sheetsService.appendData("Notification", [
        newNotification,
      ]);

      if (result.success) {
        console.log(`✅ Notification added for program: ${programKerja}`);
        return {
          success: true,
          notificationId: notificationId,
          message: "Notification created successfully",
        };
      } else {
        throw new Error("Failed to append notification");
      }
    } catch (error) {
      console.error("Error adding notification:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Dapatkan semua notifikasi (dengan filter berdasarkan user)
  async getAllNotifications() {
    await this.ensureNotificationSheet();

    try {
      const userFilter = await this.getUserFilter();
      const notifications = await sheetsService.getAllData(
        "Notification",
        "A:J",
      );

      //console.log("Raw notifications from sheet:", notifications);
      //console.log("Type of notifications:", typeof notifications);
      //console.log("Is array?", Array.isArray(notifications));
      //console.log("Length:", notifications?.length);

      if (!notifications || notifications.length === 0) {
        console.log("No notifications found");
        return [];
      }

      // Cek format data - apakah array of arrays atau array of objects?
      let notificationList = [];

      if (notifications.length > 0) {
        // Cek apakah row pertama adalah header
        const firstRow = notifications[0];
        const isHeaderRow =
          Array.isArray(firstRow) &&
          (firstRow[0] === "ID_NOTIF" ||
            firstRow[0]?.toString().toUpperCase() === "ID_NOTIF");

        let startIndex = isHeaderRow ? 1 : 0;

        //console.log("Is header row:", isHeaderRow);
        //console.log("Start index:", startIndex);

        // Process each row
        for (let i = startIndex; i < notifications.length; i++) {
          const row = notifications[i];

          // Skip empty rows
          if (!row || row.length === 0) continue;

          // Handle array format
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
          }
          // Handle object format
          else if (typeof row === "object") {
            notificationList.push({
              idNotif: row.ID_NOTIF || row.idNotif || row[0] || "",
              programNo: row.PROGRAM_NO || row.programNo || row[1] || "",
              programKerja:
                row.PROGRAM_KERJA || row.programKerja || row[2] || "",
              pengirim: row.PENGIRIM || row.pengirim || row[3] || "",
              bidangPengirim:
                row.BIDANG_PENGIRIM || row.bidangPengirim || row[4] || "",
              tanggalKirim:
                row.TANGGAL_KIRIM || row.tanggalKirim || row[5] || "",
              status: row.STATUS || row.status || row[6] || "UNREAD",
              dibacaOleh: row.DIBACA_OLEH || row.dibacaOleh || row[7] || "",
              tanggalBaca: row.TANGGAL_BACA || row.tanggalBaca || row[8] || "",
              catatan: row.CATATAN || row.catatan || row[9] || "",
            });
          }
        }
      }

      //console.log("Processed notification list:", notificationList);
      //console.log("Number of notifications:", notificationList.length);

      // Filter berdasarkan role
      if (!userFilter.isAdmin) {
        // User biasa hanya bisa melihat notifikasi dari bidangnya sendiri
        const filtered = notificationList.filter(
          (notif) => notif.bidangPengirim === userFilter.bidangFilter,
        );
        console.log(`Filtered for user ${userFilter.bidangFilter}:`, filtered);
        return filtered;
      }

      // Admin bisa melihat semua notifikasi
      return notificationList;
    } catch (error) {
      console.error("Error getting notifications:", error);
      return [];
    }
  }

  // Dapatkan notifikasi yang belum dibaca (unread)
  async getUnreadNotifications() {
    const allNotifications = await this.getAllNotifications();
    return allNotifications.filter((notif) => notif.status === "UNREAD");
  }

  // Tandai notifikasi sebagai sudah dibaca
  async markNotificationAsRead(notificationId, readerName) {
    try {
      const allNotifications = await sheetsService.getRawData(
        "Notification",
        "A:J",
      );

      let rowIndex = -1;
      for (let i = 1; i < allNotifications.length; i++) {
        const row = allNotifications[i];
        if (row && row[0] === notificationId) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex === -1) {
        return {
          success: false,
          message: "Notification not found",
        };
      }

      const sheetRow = rowIndex + 1;
      const tanggalBaca = new Date().toLocaleString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // Update status, dibaca oleh, dan tanggal baca
      await sheetsService.updateCell(`Notification!G${sheetRow}`, "READ");
      await sheetsService.updateCell(`Notification!H${sheetRow}`, readerName);
      await sheetsService.updateCell(`Notification!I${sheetRow}`, tanggalBaca);

      return {
        success: true,
        message: "Notification marked as read",
      };
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Tandai semua notifikasi sebagai sudah dibaca untuk suatu program
  async markAllNotificationsAsRead(programNo, readerName) {
    try {
      const allNotifications = await sheetsService.getRawData(
        "Notification",
        "A:J",
      );
      const updates = [];

      for (let i = 1; i < allNotifications.length; i++) {
        const row = allNotifications[i];
        if (row && row[1] === programNo && row[6] === "UNREAD") {
          const sheetRow = i + 1;
          updates.push({ row: sheetRow, index: i });
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

      for (const update of updates) {
        await sheetsService.updateCell(`Notification!G${update.row}`, "READ");
        await sheetsService.updateCell(
          `Notification!H${update.row}`,
          readerName,
        );
        await sheetsService.updateCell(
          `Notification!I${update.row}`,
          tanggalBaca,
        );
      }

      return {
        success: true,
        message: `${updates.length} notification(s) marked as read`,
      };
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Hapus notifikasi berdasarkan program no
  async deleteNotificationsByProgramNo(programNo) {
    try {
      const allNotifications = await sheetsService.getRawData(
        "Notification",
        "A:J",
      );
      const toDelete = [];

      for (let i = 1; i < allNotifications.length; i++) {
        const row = allNotifications[i];
        if (row && row[1] === programNo) {
          toDelete.push(i);
        }
      }

      // Hapus dari bawah ke atas agar index tidak berubah
      for (let i = toDelete.length - 1; i >= 0; i--) {
        const sheetRow = toDelete[i] + 1;
        const emptyRow = Array(10).fill("");
        await sheetsService.writeData(
          `Notification!A${sheetRow}:J${sheetRow}`,
          [emptyRow],
        );
      }

      return {
        success: true,
        message: `${toDelete.length} notification(s) deleted`,
      };
    } catch (error) {
      console.error("Error deleting notifications:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Get semua data dengan filter berdasarkan user yang login
  async getAllData() {
    await this.init();

    try {
      const data = await sheetsService.getAllData(this.sheetName, "A:R");

      // Dapatkan filter berdasarkan user yang login
      const userFilter = await this.getUserFilter();

      //console.log("User filter:", userFilter);

      // Cek format data yang diterima
      const isArrayFormat = data.length > 0 && Array.isArray(data[0]);
      const isObjectFormat =
        data.length > 0 &&
        !Array.isArray(data[0]) &&
        typeof data[0] === "object";

      let processedData = [];

      if (isObjectFormat) {
        // Format: array of objects dengan key nama kolom
        processedData = data.map((row) => ({
          no: row["NO"] || row[this.columnNames[0]] || "",
          programKerja: row["PROGRAM KERJA"] || row[this.columnNames[1]] || "",
          alasanProgram:
            row["ALASAN PROGRAM"] || row[this.columnNames[2]] || "",
          klusterProgram:
            row["KLUSTER PROGRAM"] || row[this.columnNames[3]] || "",
          oemNonOem: row["OEM/NON OEM"] || row[this.columnNames[4]] || "",
          dasarInputProgram:
            row["DASAR INPUT PROGRAM"] || row[this.columnNames[5]] || "",
          sasaranRjpp: row["SASARAN RJPP"] || row[this.columnNames[6]] || "",
          sumberAnggaran:
            row["SUMBER ANGGARAN"] || row[this.columnNames[7]] || "",
          estLevering: row["EST LEVERING"] || row[this.columnNames[8]] || "",
          levelResikoInherent:
            row["LEVEL RESIKO INHERENT"] || row[this.columnNames[9]] || "",
          levelRisikoResidual:
            row["LEVEL RISIKO RESIDUAL"] || row[this.columnNames[10]] || "",
          sat: row["SAT"] || row[this.columnNames[11]] || "",
          vol: row["VOL"] || row[this.columnNames[12]] || "",
          tahun: row["TAHUN"] || row[this.columnNames[13]] || "",
          hargaTotal: row["HARGA TOTAL"] || row[this.columnNames[14]] || "",
          file: row["FILE"] || row[this.columnNames[15]] || "",
          bidang: row["BIDANG"] || row[this.columnNames[16]] || "",
          keterangan: row["KETERANGAN"] || row[this.columnNames[17]] || "",
        }));
      } else if (isArrayFormat) {
        // Format: array of arrays (numeric index)
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
          keterangan: row[this.columns.KETERANGAN] || "",
        }));
      } else {
        // Fallback
        processedData = data.map((row) => {
          if (row && typeof row === "object" && !Array.isArray(row)) {
            return {
              no: row.NO || row["NO"] || "",
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
              keterangan: row.KETERANGAN || row.keterangan || "",
            };
          }
          return {};
        });
      }

      // Filter data yang memiliki Program Kerja (tidak kosong)
      let filteredData = processedData.filter(
        (item) =>
          item.programKerja && item.programKerja.toString().trim() !== "",
      );

      // TERAPKAN FILTER BERDASARKAN ROLE USER
      // Jika bukan Admin, filter berdasarkan bidang yang sama dengan nama user
      if (!userFilter.isAdmin && userFilter.bidangFilter) {
        filteredData = filteredData.filter(
          (item) => item.bidang === userFilter.bidangFilter,
        );
        /*console.log(
          `Filtered data for user '${userFilter.bidangFilter}': ${filteredData.length} records`,
        ); */
      }

      /*console.log(
        `Total data: ${processedData.length}, Data with program: ${filteredData.length}`,
      ); */

      return filteredData;
    } catch (error) {
      console.error("Error getting all data:", error);
      return [];
    }
  }

  // Get raw data tanpa filter (untuk keperluan internal)
  async getRawData() {
    await this.init();
    try {
      return await sheetsService.getRawData(this.sheetName, "A:R");
    } catch (error) {
      console.error("Error getting raw data:", error);
      return [];
    }
  }

  // Get data by nomor (dengan memperhatikan filter user)
  async getDataByNo(no) {
    const allData = await this.getAllData();
    const userFilter = await this.getUserFilter();

    const data = allData.find((item) => item.no === no.toString());

    // Jika data ditemukan tapi user bukan admin, verifikasi lagi bidangnya
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

  // Get data by tahun (dengan filter)
  async getDataByYear(tahun) {
    const allData = await this.getAllData();
    return allData.filter((item) => item.tahun === tahun.toString());
  }

  // Get data by kluster program (dengan filter)
  async getDataByKluster(kluster) {
    const allData = await this.getAllData();
    return allData.filter((item) => item.klusterProgram === kluster);
  }

  // Get data by sumber anggaran (dengan filter)
  async getDataBySumberAnggaran(sumber) {
    const allData = await this.getAllData();
    return allData.filter((item) => item.sumberAnggaran === sumber);
  }

  // Get data by bidang (method ini tetap ada tapi untuk admin)
  async getDataByBidang(bidang) {
    const userFilter = await this.getUserFilter();

    // Jika user bukan admin, hanya bisa filter bidangnya sendiri
    if (!userFilter.isAdmin) {
      if (bidang !== userFilter.bidangFilter) {
        console.warn(
          `User ${userFilter.bidangFilter} cannot filter by bidang ${bidang}`,
        );
        return [];
      }
    }

    const allData = await this.getAllData();
    return allData.filter((item) => item.bidang === bidang);
  }

  // Method untuk mengecek apakah user memiliki akses ke data tertentu
  async hasAccessToData(no) {
    const userFilter = await this.getUserFilter();

    // Admin punya akses penuh
    if (userFilter.isAdmin) {
      return true;
    }

    // Non-admin: cek apakah data memiliki bidang yang sesuai
    const data = await this.getDataByNo(no);
    if (!data) return false;

    return data.bidang === userFilter.bidangFilter;
  }

  // Generate program ID
  generateProgramId(tahun, urutan) {
    const year = tahun || new Date().getFullYear();
    const noUrut = String(urutan).padStart(3, "0");
    return `PRG-${year}-${noUrut}`;
  }

  // Add data method (dengan pengecekan akses dan notifikasi)
  async addData(data) {
    await this.init();

    const userFilter = await this.getUserFilter();

    // Non-admin hanya bisa menambah data untuk bidangnya sendiri
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

    try {
      // Get current row count untuk menentukan urutan berikutnya
      const rowCount = await sheetsService.getRowCount(this.sheetName);
      const nextUrutan = rowCount + 1;

      // Generate Program ID
      const tahunProgram = data.tahun || new Date().getFullYear().toString();
      const programId = this.generateProgramId(tahunProgram, nextUrutan);

      const newRow = [
        programId, // NO (Program ID)
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
        data.hargaTotal || "",
        data.file || "",
        data.bidang || "",
        data.keterangan || "",
      ];

      const range = `${this.sheetName}!A${nextUrutan + 1}:R${nextUrutan + 1}`;
      const result = await sheetsService.writeData(range, [newRow]);

      // Dapatkan informasi pengirim
      const currentUser = loginService.getCurrentUser();
      const pengirim = currentUser ? currentUser.nama : "System";
      const bidangPengirim =
        data.bidang || userFilter.bidangFilter || "Unknown";

      // BUAT NOTIFIKASI
      await this.addNotification(
        programId,
        data.programKerja,
        pengirim,
        bidangPengirim,
      );

      return {
        success: true,
        message: "Data added successfully with notification",
        no: programId,
        data: result,
      };
    } catch (error) {
      console.error("Error adding data:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Update data berdasarkan NO (dengan pengecekan akses)
  async updateData(no, updatedData) {
    // Cek akses terlebih dahulu
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
      // Get raw data to find the row
      const allDataRaw = await sheetsService.getRawData(this.sheetName, "A:R");

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

      if (rowIndex === -1) {
        return {
          success: false,
          message: `Data with NO ${no} not found`,
        };
      }

      const sheetRow = rowIndex + 1;
      const currentRow = allDataRaw[rowIndex] || [];

      // Non-admin tidak bisa mengubah bidang
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

      const updatedRow = [
        no.toString(),
        updatedData.programKerja !== undefined
          ? updatedData.programKerja
          : currentRow[this.columns.PROGRAM_KERJA] || "",
        updatedData.alasanProgram !== undefined
          ? updatedData.alasanProgram
          : currentRow[this.columns.ALASAN_PROGRAM] || "",
        updatedData.klusterProgram !== undefined
          ? updatedData.klusterProgram
          : currentRow[this.columns.KLUSTER_PROGRAM] || "",
        updatedData.oemNonOem !== undefined
          ? updatedData.oemNonOem
          : currentRow[this.columns.OEM_NON_OEM] || "",
        updatedData.dasarInputProgram !== undefined
          ? updatedData.dasarInputProgram
          : currentRow[this.columns.DASAR_INPUT_PROGRAM] || "",
        updatedData.sasaranRjpp !== undefined
          ? updatedData.sasaranRjpp
          : currentRow[this.columns.SASARAN_RJPP] || "",
        updatedData.sumberAnggaran !== undefined
          ? updatedData.sumberAnggaran
          : currentRow[this.columns.SUMBER_ANGGARAN] || "",
        updatedData.estLevering !== undefined
          ? updatedData.estLevering
          : currentRow[this.columns.EST_LEVERING] || "",
        updatedData.levelResikoInherent !== undefined
          ? updatedData.levelResikoInherent
          : currentRow[this.columns.LEVEL_RESIKO_INHERENT] || "",
        updatedData.levelRisikoResidual !== undefined
          ? updatedData.levelRisikoResidual
          : currentRow[this.columns.LEVEL_RISIKO_RESIDUAL] || "",
        updatedData.sat !== undefined
          ? updatedData.sat
          : currentRow[this.columns.SAT] || "",
        updatedData.vol !== undefined
          ? updatedData.vol
          : currentRow[this.columns.VOL] || "",
        updatedData.tahun !== undefined
          ? updatedData.tahun
          : currentRow[this.columns.TAHUN] || "",
        updatedData.hargaTotal !== undefined
          ? updatedData.hargaTotal
          : currentRow[this.columns.HARGA_TOTAL] || "",
        updatedData.file !== undefined
          ? updatedData.file
          : currentRow[this.columns.FILE] || "",
        updatedData.bidang !== undefined
          ? updatedData.bidang
          : currentRow[this.columns.BIDANG] || "",
        updatedData.keterangan !== undefined
          ? updatedData.keterangan
          : currentRow[this.columns.KETERANGAN] || "",
      ];

      const range = `${this.sheetName}!A${sheetRow}:R${sheetRow}`;
      const result = await sheetsService.writeData(range, [updatedRow]);

      return {
        success: true,
        message: `Data with NO ${no} updated successfully`,
        data: result,
      };
    } catch (error) {
      console.error("Error updating data:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Hapus data berdasarkan NO (dengan pengecekan akses)
  async deleteData(no) {
    // Cek akses terlebih dahulu
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
      const allDataRaw = await sheetsService.getRawData(this.sheetName, "A:R");

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

      if (rowIndex === -1) {
        return {
          success: false,
          message: `Data with NO ${no} not found`,
        };
      }

      // Hapus notifikasi terkait
      await this.deleteNotificationsByProgramNo(no);

      const sheetRow = rowIndex + 1;
      const emptyRow = Array(18).fill("");
      const range = `${this.sheetName}!A${sheetRow}:R${sheetRow}`;
      await sheetsService.writeData(range, [emptyRow]);

      await this.renumberData();

      return {
        success: true,
        message: `Data with NO ${no} deleted successfully`,
      };
    } catch (error) {
      console.error("Error deleting data:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Renumber data setelah delete
  async renumberData() {
    try {
      const allDataRaw = await sheetsService.getRawData(this.sheetName, "A:R");

      if (!allDataRaw || allDataRaw.length <= 1) {
        return true;
      }

      let urutan = 1;
      const updates = [];

      for (let i = 1; i < allDataRaw.length; i++) {
        const row = allDataRaw[i];
        const hasData =
          row && row.some((cell) => cell && cell.toString().trim() !== "");

        if (hasData) {
          const tahun =
            row[this.columns.TAHUN] || new Date().getFullYear().toString();
          const newId = this.generateProgramId(tahun, urutan);
          const currentId = row[this.columns.NO];

          if (currentId !== newId) {
            updates.push({
              rowIndex: i,
              newId: newId,
            });
          }
          urutan++;
        }
      }

      for (const update of updates) {
        const sheetRow = update.rowIndex + 1;
        const range = `${this.sheetName}!A${sheetRow}`;
        await sheetsService.updateCell(range, update.newId);
      }

      return true;
    } catch (error) {
      console.error("Error renumbering data:", error);
      return false;
    }
  }

  // Move to Drop (dengan pengecekan akses)
  async moveToDrop(no, keterangan = "DROP") {
    // Cek akses
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
      const allDataRaw = await sheetsService.getRawData(this.sheetName, "A:R");

      if (!allDataRaw || allDataRaw.length <= 1) {
        return {
          success: false,
          message: `No data found in sheet`,
        };
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
        rowData[this.columns.KETERANGAN] || "",
        dropDate, // DROP DATE
        keterangan, // DROP STATUS
        no.toString(), // ORIGINAL NO
      ];

      const dropExists = await sheetsService.sheetExists("Drop");
      if (!dropExists) {
        await sheetsService.writeData("Drop!A1:U1", [
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

      // Hapus notifikasi terkait
      await this.deleteNotificationsByProgramNo(no);

      const sheetRow = rowIndex + 1;
      const emptyRow = Array(18).fill("");
      const range = `${this.sheetName}!A${sheetRow}:R${sheetRow}`;
      await sheetsService.writeData(range, [emptyRow]);

      await this.renumberData();

      return {
        success: true,
        message: `Data with NO ${no} moved to Drop sheet successfully`,
      };
    } catch (error) {
      console.error("Error moving data to Drop:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Search data (dengan filter)
  async searchData(keyword) {
    const allData = await this.getAllData();
    const lowerKeyword = keyword.toLowerCase();

    return allData.filter((item) => {
      return Object.values(item).some((value) =>
        value.toString().toLowerCase().includes(lowerKeyword),
      );
    });
  }

  // Get summary by tahun (dengan filter)
  async getSummaryByYear() {
    const allData = await this.getAllData();
    const summary = {};

    allData.forEach((item) => {
      const tahun = item.tahun;
      if (!summary[tahun]) {
        summary[tahun] = {
          totalProgram: 0,
          totalAnggaran: 0,
          programList: [],
        };
      }

      summary[tahun].totalProgram++;
      const harga = parseFloat(item.hargaTotal) || 0;
      summary[tahun].totalAnggaran += harga;
      summary[tahun].programList.push(item.programKerja);
    });

    return summary;
  }

  // Get summary by kluster program (dengan filter)
  async getSummaryByKluster() {
    const allData = await this.getAllData();
    const summary = {};

    allData.forEach((item) => {
      const kluster = item.klusterProgram;
      if (!summary[kluster]) {
        summary[kluster] = {
          totalProgram: 0,
          totalAnggaran: 0,
          programList: [],
        };
      }

      summary[kluster].totalProgram++;
      const harga = parseFloat(item.hargaTotal) || 0;
      summary[kluster].totalAnggaran += harga;
      summary[kluster].programList.push(item.programKerja);
    });

    return summary;
  }

  // Get summary by sumber anggaran (dengan filter)
  async getSummaryBySumberAnggaran() {
    const allData = await this.getAllData();
    const summary = {};

    allData.forEach((item) => {
      const sumber = item.sumberAnggaran;
      if (!summary[sumber]) {
        summary[sumber] = {
          totalProgram: 0,
          totalAnggaran: 0,
          programList: [],
        };
      }

      summary[sumber].totalProgram++;
      const harga = parseFloat(item.hargaTotal) || 0;
      summary[sumber].totalAnggaran += harga;
      summary[sumber].programList.push(item.programKerja);
    });

    return summary;
  }

  // Get summary by bidang (dengan filter)
  async getSummaryByBidang() {
    const allData = await this.getAllData();
    const summary = {};

    allData.forEach((item) => {
      const bidang = item.bidang;
      if (!bidang) return;

      if (!summary[bidang]) {
        summary[bidang] = {
          totalProgram: 0,
          totalAnggaran: 0,
          programList: [],
        };
      }

      summary[bidang].totalProgram++;
      const harga = parseFloat(item.hargaTotal) || 0;
      summary[bidang].totalAnggaran += harga;
      summary[bidang].programList.push(item.programKerja);
    });

    return summary;
  }

  // Get file link dari Google Drive
  async getFileLink(no) {
    const data = await this.getDataByNo(no);
    if (data && data.file) {
      return {
        success: true,
        fileLink: data.file,
        programKerja: data.programKerja,
      };
    }
    return {
      success: false,
      message: `No file found for program with NO ${no}`,
    };
  }

  // Update file link
  async updateFileLink(no, driveFileLink) {
    return await this.updateData(no, { file: driveFileLink });
  }

  // Update bidang
  async updateBidang(no, bidang) {
    return await this.updateData(no, { bidang: bidang });
  }

  // Update keterangan
  async updateKeterangan(no, keterangan) {
    return await this.updateData(no, { keterangan: keterangan });
  }

  // Bulk insert data (dengan pengecekan akses dan notifikasi)
  async bulkInsert(dataArray) {
    await this.init();

    const userFilter = await this.getUserFilter();

    try {
      const rowCount = await sheetsService.getRowCount(this.sheetName);
      const rows = [];
      const addedPrograms = [];

      for (let i = 0; i < dataArray.length; i++) {
        // Non-admin hanya bisa insert data untuk bidangnya sendiri
        if (!userFilter.isAdmin) {
          if (!dataArray[i].bidang) {
            dataArray[i].bidang = userFilter.bidangFilter;
          } else if (dataArray[i].bidang !== userFilter.bidangFilter) {
            return {
              success: false,
              message: `Access denied: You can only add data for bidang '${userFilter.bidangFilter}'`,
            };
          }
        }

        const tahunProgram =
          dataArray[i].tahun || new Date().getFullYear().toString();
        const urutan = rowCount + i + 1;
        const programId = this.generateProgramId(tahunProgram, urutan);

        rows.push([
          programId,
          dataArray[i].programKerja || "",
          dataArray[i].alasanProgram || "",
          dataArray[i].klusterProgram || "",
          dataArray[i].oemNonOem || "",
          dataArray[i].dasarInputProgram || "",
          dataArray[i].sasaranRjpp || "",
          dataArray[i].sumberAnggaran || "",
          dataArray[i].estLevering || "",
          dataArray[i].levelResikoInherent || "",
          dataArray[i].levelRisikoResidual || "",
          dataArray[i].sat || "",
          dataArray[i].vol || "",
          dataArray[i].tahun || "",
          dataArray[i].hargaTotal || "",
          dataArray[i].file || "",
          dataArray[i].bidang || "",
          dataArray[i].keterangan || "",
        ]);

        addedPrograms.push({
          programId: programId,
          programKerja: dataArray[i].programKerja,
          bidang: dataArray[i].bidang || userFilter.bidangFilter,
        });
      }

      const startRow = rowCount + 2;
      const endRow = rowCount + 1 + dataArray.length;
      const range = `${this.sheetName}!A${startRow}:R${endRow}`;
      const result = await sheetsService.writeData(range, rows);

      // Dapatkan informasi pengirim
      const currentUser = loginService.getCurrentUser();
      const pengirim = currentUser ? currentUser.nama : "System";

      // Buat notifikasi untuk setiap program yang ditambahkan
      for (const program of addedPrograms) {
        await this.addNotification(
          program.programId,
          program.programKerja,
          pengirim,
          program.bidang,
        );
      }

      return {
        success: true,
        message: `${dataArray.length} data added successfully with notifications`,
        data: result,
      };
    } catch (error) {
      console.error("Error bulk inserting data:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Export all data to JSON (dengan filter)
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

  // Get paginated data (dengan filter)
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
      limit: limit,
    };
  }

  // Method untuk mendapatkan informasi akses user
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

  // Get statistics with filter
  async getStatistics() {
    const allData = await this.getAllData();
    const userFilter = await this.getUserFilter();

    const totalPrograms = allData.length;
    const totalBudget = allData.reduce(
      (sum, item) => sum + (parseFloat(item.hargaTotal) || 0),
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

    return {
      success: true,
      statistics: {
        totalPrograms,
        totalBudget,
        uniqueYears: years.length,
        uniqueClusters: clusters.length,
        uniqueBidangs: bidangs.length,
        yearsList: years.sort(),
        clustersList: clusters.sort(),
        bidangsList: bidangs.sort(),
      },
      userInfo: {
        role: userFilter.isAdmin ? "Admin" : "User",
        bidang: userFilter.bidangFilter,
      },
    };
  }

  // Validate data before insert/update
  validateData(data) {
    const errors = [];

    if (!data.programKerja || data.programKerja.trim() === "") {
      errors.push("Program Kerja is required");
    }

    if (!data.tahun || data.tahun.trim() === "") {
      errors.push("Tahun is required");
    }

    if (data.hargaTotal && isNaN(parseFloat(data.hargaTotal))) {
      errors.push("Harga Total must be a number");
    }

    if (data.vol && isNaN(parseFloat(data.vol))) {
      errors.push("VOL must be a number");
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }
}

// Export singleton instance
const dataSheetOperations = new DataSheetOperations();
export default dataSheetOperations;
