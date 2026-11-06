// api/strategiService.js
import sheetsService from "./googleSheetService";

class StrategiService {
  constructor() {
    this.sheetName = "Strategi";
    this.cache = null;
    this.cacheExpiry = null;
    this.CACHE_DURATION = 5 * 60 * 1000;
    this.range = "A:D";
  }

  async init() {
    await sheetsService.init();
    await this.ensureSheet();
  }

  async ensureSheet() {
    try {
      const exists = await sheetsService.sheetExists(this.sheetName);
      if (!exists) {
        await sheetsService.writeData(`${this.sheetName}!A1:D1`, [
          [
            "Kode RJPU",
            "Strategic Objectives (RJPU)",
            "Strategic Initiatives",
            "Kode Awal",
          ],
        ]);
        console.log("✅ Strategi sheet created");
      }
    } catch (error) {
      console.error("Error ensuring Strategi sheet:", error);
    }
  }

  async getAllStrategi(forceRefresh = false) {
    await this.init();

    if (
      !forceRefresh &&
      this.cache &&
      this.cacheExpiry &&
      Date.now() < this.cacheExpiry
    ) {
      return this.cache;
    }

    try {
      const raw = await sheetsService.getRawData(this.sheetName, this.range);
      if (!raw || raw.length <= 1) {
        this.cache = [];
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
        return [];
      }

      const strategis = [];
      for (let i = 1; i < raw.length; i++) {
        const row = raw[i] || [];
        const kodeRjpu = (row[0] || "").toString().trim();
        const strategicObjectives = (row[1] || "").toString().trim();
        const strategicInitiatives = (row[2] || "").toString().trim();
        const kodeAwal = (row[3] || "").toString().trim();

        if (kodeAwal) {
          strategis.push({
            kodeRjpu,
            strategicObjectives,
            strategicInitiatives,
            kodeAwal,
          });
        }
      }

      this.cache = strategis;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      return strategis;
    } catch (error) {
      console.error("Error getting strategi:", error);
      return [];
    }
  }

  async findByKodeAwal(kodeAwal) {
    if (!kodeAwal) return null;
    const all = await this.getAllStrategi();
    const target = kodeAwal.toString().trim().toUpperCase();
    return all.find((s) => s.kodeAwal.toUpperCase() === target) || null;
  }

  async getDropdownOptions() {
    const all = await this.getAllStrategi();
    return all.map((s) => ({
      value: s.kodeAwal,
      label: `${s.kodeAwal} — ${s.strategicInitiatives}`,
      raw: s,
    }));
  }

  async addStrategi(
    kodeRjpu,
    strategicObjectives,
    strategicInitiatives,
    kodeAwal,
  ) {
    await this.init();
    if (!kodeAwal || !kodeAwal.trim()) {
      return { success: false, message: "Kode Awal wajib diisi" };
    }
    try {
      await sheetsService.appendData(this.sheetName, [
        [
          (kodeRjpu || "").trim(),
          (strategicObjectives || "").trim(),
          (strategicInitiatives || "").trim(),
          kodeAwal.trim(),
        ],
      ]);
      this.invalidateCache();
      return { success: true, message: "Strategi berhasil ditambahkan" };
    } catch (error) {
      console.error("Error adding strategi:", error);
      return { success: false, message: error.message };
    }
  }

  invalidateCache() {
    this.cache = null;
    this.cacheExpiry = null;
  }
}

const strategiService = new StrategiService();
export default strategiService;
