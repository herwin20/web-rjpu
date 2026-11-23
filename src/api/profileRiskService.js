// api/profilRiskService.js
import sheetsService from "./googleSheetService";

class ProfilRiskService {
  constructor() {
    this.sheetName = "Profile_Risk";
    this.range = "A:B";
    this.cache = null;
    this.cacheExpiry = null;
    this.CACHE_DURATION = 5 * 60 * 1000;
  }

  async init() {
    await sheetsService.init();
    await this.ensureSheet();
  }

  async ensureSheet() {
    try {
      const exists = await sheetsService.sheetExists(this.sheetName);
      if (!exists) {
        await sheetsService.writeData(`${this.sheetName}!A1:B1`, [
          ["No Profile Risk", "Keterangan"],
        ]);
        console.log("✅ Profile_Risk sheet created");
      }
    } catch (error) {
      console.error("Error ensuring Profile_Risk sheet:", error);
      throw error;
    }
  }

  async getAllProfilRisk(forceRefresh = false) {
    await this.init();

    if (
      !forceRefresh &&
      this.cache !== null &&
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

      const profileRisks = [];
      for (let i = 1; i < raw.length; i++) {
        const row = raw[i] || [];
        const noProfileRisk = String(row[0] ?? "").trim();
        const keterangan = String(row[1] ?? "").trim();
        if (!noProfileRisk) continue;

        profileRisks.push({ noProfileRisk, keterangan });
      }

      this.cache = profileRisks;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      return profileRisks;
    } catch (error) {
      console.error("Error getting Profile Risk:", error);
      throw error;
    }
  }

  async findByNoProfileRisk(noProfileRisk) {
    if (!noProfileRisk) return null;
    const all = await this.getAllProfilRisk();
    const target = String(noProfileRisk).trim().toUpperCase();
    return (
      all.find((item) => item.noProfileRisk.toUpperCase() === target) || null
    );
  }

  async getDropdownOptions() {
    const all = await this.getAllProfilRisk();
    return all.map((item) => ({
      value: item.noProfileRisk,
      label: item.keterangan
        ? `${item.noProfileRisk} — ${item.keterangan}`
        : item.noProfileRisk,
      raw: item,
    }));
  }

  // Alias sederhana jika komponen lama memanggil getProfilRiskOptions()
  async getProfilRiskOptions() {
    return this.getDropdownOptions();
  }

  invalidateCache() {
    this.cache = null;
    this.cacheExpiry = null;
  }
}

const profilRiskService = new ProfilRiskService();
export default profilRiskService;
