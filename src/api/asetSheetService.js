// api/assetService.js
import sheetsService from "./googleSheetService";

class AssetService {
  constructor() {
    this.sheetName = "Aset";
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
          ["Nama Aset", "Deskripsi"],
        ]);
        console.log("✅ Assets sheet created");
      }
    } catch (error) {
      console.error("Error ensuring Assets sheet:", error);
    }
  }

  async getAllAssets(forceRefresh = false) {
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
      const raw = await sheetsService.getRawData(this.sheetName, "A:B");
      if (!raw || raw.length <= 1) {
        this.cache = [];
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
        return [];
      }

      const assets = [];
      for (let i = 1; i < raw.length; i++) {
        const row = raw[i] || [];
        const namaAset = (row[0] || "").toString().trim();
        const deskripsi = (row[1] || "").toString().trim();
        if (namaAset) assets.push({ namaAset, deskripsi });
      }

      this.cache = assets;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      return assets;
    } catch (error) {
      console.error("Error getting assets:", error);
      return [];
    }
  }

  async findAssetByName(namaAset) {
    if (!namaAset) return null;
    const assets = await this.getAllAssets();
    const target = namaAset.toString().trim().toLowerCase();
    return assets.find((a) => a.namaAset.toLowerCase() === target) || null;
  }

  async findAssetFlexible(query) {
    if (!query) return null;
    const q = query.toString().trim().toLowerCase();
    const all = await this.getAllAssets();
    let found = all.find((a) => a.namaAset.toLowerCase() === q);
    if (found) return found;
    found = all.find((a) => a.namaAset.toLowerCase().includes(q));
    if (found) return found;
    found = all.find((a) => a.deskripsi.toLowerCase().includes(q));
    return found || null;
  }

  async searchAssets(query) {
    if (!query || !query.trim()) return await this.getAllAssets();
    const q = query.toLowerCase().trim();
    const all = await this.getAllAssets();
    return all.filter(
      (a) =>
        a.namaAset.toLowerCase().includes(q) ||
        a.deskripsi.toLowerCase().includes(q),
    );
  }

  async getDeskripsiAset(namaAset) {
    const asset = await this.findAssetByName(namaAset);
    return asset ? asset.deskripsi : "";
  }

  async addAsset(namaAset, deskripsi) {
    await this.init();
    if (!namaAset || !namaAset.trim()) {
      return { success: false, message: "Nama Aset wajib diisi" };
    }
    try {
      await sheetsService.appendData(this.sheetName, [
        [namaAset.trim(), (deskripsi || "").trim()],
      ]);
      this.invalidateCache();
      return { success: true, message: "Aset berhasil ditambahkan" };
    } catch (error) {
      console.error("Error adding asset:", error);
      return { success: false, message: error.message };
    }
  }

  async updateAsset(namaAset, deskripsiBaru) {
    await this.init();
    try {
      const raw = await sheetsService.getRawData(this.sheetName, "A:B");
      for (let i = 1; i < raw.length; i++) {
        const row = raw[i] || [];
        if (
          row[0] &&
          row[0].toString().trim().toLowerCase() ===
            namaAset.toString().trim().toLowerCase()
        ) {
          await sheetsService.updateCell(
            `${this.sheetName}!B${i + 1}`,
            deskripsiBaru || "",
          );
          this.invalidateCache();
          return { success: true, message: "Aset berhasil diupdate" };
        }
      }
      return { success: false, message: "Aset tidak ditemukan" };
    } catch (error) {
      console.error("Error updating asset:", error);
      return { success: false, message: error.message };
    }
  }

  invalidateCache() {
    this.cache = null;
    this.cacheExpiry = null;
  }
}

const assetService = new AssetService();
export default assetService;
