/* api/rjpuAnggaranService.js */

import sheetsService from "./googleSheetService";
import loginService from "./loginSheetService";

class RjpuAnggaranService {
  constructor() {
    this.sheetName = "Anggaran_RJPU";
    this.programSheet = "Data";

    this.headers = ["NO", "TAHUN", "MATERIAL", "JASA", "AKI"];

    this.columns = {
      NO: 0,
      TAHUN: 1,
      MATERIAL: 2,
      JASA: 3,
      AKI: 4,
    };

    this.dataRange = "A:E";
  }

  // ============================================================
  // INIT
  // ============================================================

  async init() {
    const initialized = await sheetsService.init();

    if (!initialized) {
      throw new Error("Google Sheets gagal diinisialisasi");
    }

    await this.ensureHeaders();
  }

  get baseUrl() {
    return (
      "https://sheets.googleapis.com/v4/spreadsheets/" +
      sheetsService.spreadsheetId
    );
  }

  async ensureHeaders() {
    const raw = await this.readRaw(this.sheetName, "A1:E1");

    const current = raw[0] || [];

    const valid = this.headers.every(
      (header, index) => current[index] === header,
    );

    if (!valid) {
      throw new Error(
        "Header Anggaran_RJPU harus NO, TAHUN, MATERIAL, JASA, AKI",
      );
    }
  }

  // Read strict: error tidak dianggap sebagai data kosong
  async readRaw(sheetName, range) {
    const encodedRange = encodeURIComponent(`'${sheetName}'!${range}`);

    const response = await sheetsService.request(
      "GET",
      `${this.baseUrl}/values/${encodedRange}` +
        "?valueRenderOption=UNFORMATTED_VALUE",
    );

    return response.values || [];
  }

  // ============================================================
  // HELPERS & VALIDATION
  // ============================================================

  normalizeNo(no) {
    const value = String(no ?? "").trim();

    if (!value) {
      throw new Error("NO program wajib diisi");
    }

    return value;
  }

  normalizeYear(tahun) {
    const year = Number(tahun);

    if (!Number.isInteger(year) || year < 1000 || year > 9999) {
      throw new Error(`Tahun tidak valid: ${tahun}`);
    }

    return year;
  }

  normalizeHarga(value, field = "Harga") {
    if (value === undefined || value === null || String(value).trim() === "") {
      return 0;
    }

    const number = Number(value);

    if (!Number.isSafeInteger(number) || number < 0) {
      throw new Error(`${field} harus angka rupiah bulat dan tidak negatif`);
    }

    return number;
  }

  // ============================================================
  // USER ACCESS
  // ============================================================

  async getUserFilter() {
    if (!loginService.checkAuth()) {
      throw new Error("User belum login");
    }

    const currentUser = loginService.getCurrentUser();

    if (!currentUser) {
      throw new Error("User tidak ditemukan");
    }

    const isAdmin = currentUser.role === "Admin";

    if (!isAdmin && !currentUser.nama) {
      throw new Error("Bidang user tidak ditemukan");
    }

    return {
      isAdmin,
      bidangFilter: isAdmin ? null : currentUser.nama,
    };
  }

  async getProgramList() {
    const raw = await this.readRaw(this.programSheet, "A:Y");

    const headers = raw[0] || [];

    if (headers[0] !== "NO" || headers[16] !== "BIDANG") {
      throw new Error("Header sheet Data tidak sesuai");
    }

    return raw
      .slice(1)
      .filter((row) => row[0] && row[1])
      .map((row) => ({
        no: String(row[0]).trim(),
        programKerja: row[1] || "",
        tahun: row[13] || "",
        hargaTotal: row[14] || 0,
        bidang: row[16] || "",
        kategori: row[17] || "",
        hargaMaterial: row[18] || 0,
        hargaJasa: row[19] || 0,
      }));
  }

  async getAccessiblePrograms(no = null) {
    const userFilter = await this.getUserFilter();
    const programs = await this.getProgramList();

    const allowed = programs.filter(
      (program) =>
        userFilter.isAdmin || program.bidang === userFilter.bidangFilter,
    );

    const selected =
      no === null ? allowed : allowed.filter((program) => program.no === no);

    if (no !== null && selected.length === 0) {
      throw new Error("Program tidak ditemukan atau akses ditolak");
    }

    // Pastikan NO unik pada seluruh bidang
    const counts = new Map();

    for (const program of programs) {
      counts.set(program.no, (counts.get(program.no) || 0) + 1);
    }

    for (const program of selected) {
      if (counts.get(program.no) !== 1) {
        throw new Error(`NO program duplikat: ${program.no}`);
      }
    }

    return selected;
  }

  // ============================================================
  // CALCULATE AKI
  // ============================================================

  /**
   * Rumus:
   *
   * Total = Material + Jasa
   *
   * AKI = 0 jika total tahun berjalan = 0
   *
   * Selain itu:
   * AKI = Total tahun berjalan - Total tahun berikutnya
   *
   * Jika tahun berikutnya belum tersedia:
   * AKI = null (belum tervalidasi)
   */

  calculateAKI(anggaran) {
    const sorted = anggaran
      .map((item) => ({
        ...item,
        tahun: this.normalizeYear(item.tahun),
        material: this.normalizeHarga(item.material, "Material"),
        jasa: this.normalizeHarga(item.jasa, "Jasa"),
      }))
      .sort((a, b) => a.tahun - b.tahun);

    const yearMap = new Map();

    for (const item of sorted) {
      if (yearMap.has(item.tahun)) {
        throw new Error(`Tahun anggaran duplikat: ${item.tahun}`);
      }

      const total = item.material + item.jasa;

      if (!Number.isSafeInteger(total)) {
        throw new Error("Total anggaran terlalu besar");
      }

      yearMap.set(item.tahun, total);
    }

    return sorted.map((item) => {
      const total = yearMap.get(item.tahun);
      const nextYear = item.tahun + 1;

      let aki = null;

      if (total === 0) {
        aki = 0;
      } else if (yearMap.has(nextYear)) {
        aki = total - yearMap.get(nextYear);
      }

      return {
        ...item,
        total,
        aki,
      };
    });
  }

  // ============================================================
  // READ ANGGARAN
  // ============================================================

  async readAnggaranRows(allowedNos) {
    const raw = await this.readRaw(this.sheetName, this.dataRange);

    const result = [];

    for (let i = 1; i < raw.length; i++) {
      const row = raw[i] || [];
      const no = String(row[0] || "").trim();

      if (!no || !allowedNos.has(no)) {
        continue;
      }

      result.push({
        no,
        tahun: this.normalizeYear(row[1]),
        material: this.normalizeHarga(row[2], "Material"),
        jasa: this.normalizeHarga(row[3], "Jasa"),

        // Index baris aktual di Google Sheets
        rowIndex: i,
      });
    }

    return result;
  }

  toPublicData(item) {
    return {
      no: item.no,
      tahun: item.tahun,
      material: item.material,
      jasa: item.jasa,
      total: item.total,
      aki: item.aki,
    };
  }

  // ============================================================
  // GET ALL ANGGARAN
  // ============================================================

  async getAllAnggaran() {
    await this.init();

    const programs = await this.getAccessiblePrograms();

    const allowedNos = new Set(programs.map((program) => program.no));

    const rows = await this.readAnggaranRows(allowedNos);

    const grouped = new Map();

    for (const row of rows) {
      if (!grouped.has(row.no)) {
        grouped.set(row.no, []);
      }

      grouped.get(row.no).push(row);
    }

    const result = [];

    for (const items of grouped.values()) {
      result.push(
        ...this.calculateAKI(items).map((item) => this.toPublicData(item)),
      );
    }

    return result;
  }

  // ============================================================
  // GET BY NO PROGRAM
  // ============================================================

  async getAnggaranByNo(no) {
    await this.init();

    const programNo = this.normalizeNo(no);

    await this.getAccessiblePrograms(programNo);

    const rows = await this.readAnggaranRows(new Set([programNo]));

    return this.calculateAKI(rows).map((item) => this.toPublicData(item));
  }

  // ============================================================
  // GET BY YEAR
  // ============================================================

  async getAnggaranByYear(tahun) {
    const year = this.normalizeYear(tahun);
    const all = await this.getAllAnggaran();

    return all.filter((item) => item.tahun === year);
  }

  // ============================================================
  // GET BY NO AND YEAR
  // ============================================================

  async getAnggaranByNoAndYear(no, tahun) {
    const year = this.normalizeYear(tahun);

    const all = await this.getAnggaranByNo(no);

    return all.find((item) => item.tahun === year) || null;
  }

  // ============================================================
  // GOOGLE SHEETS BATCH WRITE
  // ============================================================

  async getSheetId() {
    const fields = encodeURIComponent("sheets(properties(sheetId,title))");

    const response = await sheetsService.request(
      "GET",
      `${this.baseUrl}?fields=${fields}`,
    );

    const sheet = (response.sheets || []).find(
      (item) => item.properties.title === this.sheetName,
    );

    if (!sheet) {
      throw new Error(`Sheet ${this.sheetName} tidak ditemukan`);
    }

    return sheet.properties.sheetId;
  }

  toCell(value) {
    if (value === null || value === undefined) {
      return {};
    }

    if (typeof value === "number") {
      return {
        userEnteredValue: {
          numberValue: value,
        },
      };
    }

    return {
      userEnteredValue: {
        stringValue: String(value),
      },
    };
  }

  toSheetRow(item) {
    return {
      values: [item.no, item.tahun, item.material, item.jasa, item.aki].map(
        (value) => this.toCell(value),
      ),
    };
  }

  async persistAnggaran(oldRows, newRows) {
    const sheetId = await this.getSheetId();

    const requests = [];
    const appendRows = [];

    const oldMap = new Map(oldRows.map((row) => [row.tahun, row]));

    const newMap = new Map(newRows.map((row) => [row.tahun, row]));

    // Update anggaran yang sudah ada
    for (const item of newRows) {
      const existing = oldMap.get(item.tahun);

      if (existing) {
        requests.push({
          updateCells: {
            start: {
              sheetId,
              rowIndex: existing.rowIndex,
              columnIndex: 0,
            },

            rows: [this.toSheetRow(item)],

            fields: "userEnteredValue",
          },
        });
      } else {
        appendRows.push(this.toSheetRow(item));
      }
    }

    // Hapus anggaran yang sudah tidak dipakai
    // Tanpa menggeser posisi baris lain
    for (const old of oldRows) {
      if (!newMap.has(old.tahun)) {
        requests.push({
          updateCells: {
            start: {
              sheetId,
              rowIndex: old.rowIndex,
              columnIndex: 0,
            },

            rows: [
              {
                values: Array.from({ length: 5 }, () => ({})),
              },
            ],

            fields: "userEnteredValue",
          },
        });
      }
    }

    // Tambahkan anggaran baru
    if (appendRows.length > 0) {
      requests.push({
        appendCells: {
          sheetId,
          rows: appendRows,
          fields: "userEnteredValue",
        },
      });
    }

    if (requests.length === 0) {
      return true;
    }

    // Seluruh perubahan dikirim dalam satu request
    await sheetsService.request("POST", `${this.baseUrl}:batchUpdate`, {
      requests,
    });

    return true;
  }

  // ============================================================
  // SAVE / UPSERT ANGGARAN
  // ============================================================

  async saveAnggaran(no, data, { replace = false } = {}) {
    try {
      await this.init();

      const programNo = this.normalizeNo(no);

      await this.getAccessiblePrograms(programNo);

      const input = Array.isArray(data) ? data : [data];

      if (input.length === 0 && !replace) {
        throw new Error("Data anggaran kosong");
      }

      const oldRows = await this.readAnggaranRows(new Set([programNo]));

      // Validasi data existing sebelum melakukan update
      this.calculateAKI(oldRows);

      const merged = new Map(
        replace ? [] : oldRows.map((row) => [row.tahun, row]),
      );

      const inputYears = new Set();

      for (const item of input) {
        const tahun = this.normalizeYear(item.tahun);

        if (inputYears.has(tahun)) {
          throw new Error(`Tahun ${tahun} duplikat dalam input`);
        }

        inputYears.add(tahun);

        const existing = merged.get(tahun);

        merged.set(tahun, {
          no: programNo,
          tahun,

          material: this.normalizeHarga(
            item.material === undefined ? existing?.material : item.material,
            "Material",
          ),

          jasa: this.normalizeHarga(
            item.jasa === undefined ? existing?.jasa : item.jasa,
            "Jasa",
          ),
        });
      }

      // Hitung ulang seluruh AKI pada program terkait
      const calculated = this.calculateAKI([...merged.values()]);

      await this.persistAnggaran(oldRows, calculated);

      return {
        success: true,
        message: "Anggaran berhasil disimpan",
        no: programNo,

        data: calculated.map((item) => this.toPublicData(item)),
      };
    } catch (error) {
      console.error("Error saving anggaran:", error);

      return {
        success: false,
        message: error.message,
      };
    }
  }

  // ============================================================
  // ADD ANGGARAN
  // ============================================================

  async addAnggaran(no, data) {
    return this.saveAnggaran(no, data);
  }

  // ============================================================
  // UPDATE ANGGARAN
  // ============================================================

  async updateAnggaran(no, tahun, updatedData) {
    return this.saveAnggaran(no, {
      ...updatedData,
      tahun,
    });
  }

  // ============================================================
  // REPLACE SELURUH ANGGARAN PROGRAM
  // ============================================================

  async replaceAnggaran(no, data) {
    return this.saveAnggaran(no, data, { replace: true });
  }

  // ============================================================
  // DELETE ANGGARAN
  // ============================================================

  async deleteAnggaran(no, tahun = null) {
    try {
      await this.init();

      const programNo = this.normalizeNo(no);

      await this.getAccessiblePrograms(programNo);

      const oldRows = await this.readAnggaranRows(new Set([programNo]));

      this.calculateAKI(oldRows);

      let remaining = [];

      if (tahun !== null) {
        const year = this.normalizeYear(tahun);

        remaining = oldRows.filter((item) => item.tahun !== year);
      }

      // AKI dihitung kembali setelah tahun dihapus
      const calculated = this.calculateAKI(remaining);

      await this.persistAnggaran(oldRows, calculated);

      return {
        success: true,

        message:
          tahun === null
            ? "Seluruh anggaran program dihapus"
            : `Anggaran tahun ${tahun} dihapus`,

        deletedCount: oldRows.length - remaining.length,

        data: calculated.map((item) => this.toPublicData(item)),
      };
    } catch (error) {
      console.error("Error deleting anggaran:", error);

      return {
        success: false,
        message: error.message,
      };
    }
  }

  // ============================================================
  // GET SUMMARY BY YEAR
  // ============================================================

  async getSummaryByYear() {
    const all = await this.getAllAnggaran();

    const summary = {};

    for (const item of all) {
      const year = item.tahun;

      if (!summary[year]) {
        summary[year] = {
          tahun: year,
          totalProgram: 0,
          totalMaterial: 0,
          totalJasa: 0,
          totalAnggaran: 0,
          totalAKI: 0,
          akiBelumValid: 0,
          akiNegatif: 0,
        };
      }

      const s = summary[year];

      s.totalProgram++;
      s.totalMaterial += item.material;
      s.totalJasa += item.jasa;
      s.totalAnggaran += item.total;

      if (item.aki === null) {
        s.akiBelumValid++;
      } else {
        s.totalAKI += item.aki;

        if (item.aki < 0) {
          s.akiNegatif++;
        }
      }
    }

    return Object.values(summary)
      .map((item) => ({
        ...item,
        akiLengkap: item.akiBelumValid === 0,
      }))
      .sort((a, b) => a.tahun - b.tahun);
  }

  // ============================================================
  // GET SUMMARY BY BIDANG
  // ============================================================

  async getSummaryByBidang(tahun = null) {
    const programs = await this.getAccessiblePrograms();

    const programMap = new Map(
      programs.map((program) => [program.no, program]),
    );

    const all =
      tahun === null
        ? await this.getAllAnggaran()
        : await this.getAnggaranByYear(tahun);

    const summary = new Map();

    for (const item of all) {
      const program = programMap.get(item.no);

      if (!program) continue;

      const bidang = program.bidang || "Tanpa Bidang";

      if (!summary.has(bidang)) {
        summary.set(bidang, {
          bidang,
          programNos: new Set(),
          totalMaterial: 0,
          totalJasa: 0,
          totalAnggaran: 0,
          totalAKI: 0,
          akiBelumValid: 0,
        });
      }

      const s = summary.get(bidang);

      s.programNos.add(item.no);
      s.totalMaterial += item.material;
      s.totalJasa += item.jasa;
      s.totalAnggaran += item.total;

      if (item.aki === null) {
        s.akiBelumValid++;
      } else {
        s.totalAKI += item.aki;
      }
    }

    return [...summary.values()].map(({ programNos, ...item }) => ({
      ...item,
      totalProgram: programNos.size,
      akiLengkap: item.akiBelumValid === 0,
    }));
  }
}

const rjpuAnggaranService = new RjpuAnggaranService();

export default rjpuAnggaranService;
