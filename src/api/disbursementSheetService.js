// api/DisbursementSheetService.js
import sheetsService from "./googleSheetService";
import loginService from "./loginSheetService";

class DisbursementSheetService {
  constructor() {
    this.sheetName = "Disbursement";
    this.columnNames = [
      "NO",
      "PROGRAM ID",
      "PROGRAM NAME",
      "KLUSTER",
      "BIDANG",
      "TAHUN",
      "EST LEVERING (Bulan)",
      "MATERIAL VENDOR", // Index 7
      "MATERIAL PO DATE", // Index 8
      "MATERIAL DELIVERY PLAN", // Index 9
      "MATERIAL ACTUAL DELIVERY", // Index 10
      "MATERIAL AMOUNT", // Index 11
      "MATERIAL STATUS", // Index 12
      "SERVICE VENDOR", // Index 13
      "SERVICE PO DATE", // Index 14
      "SERVICE START PLAN", // Index 15
      "SERVICE START ACTUAL", // Index 16
      "SERVICE END PLAN", // Index 17
      "SERVICE END ACTUAL", // Index 18
      "SERVICE AMOUNT", // Index 19
      "SERVICE STATUS", // Index 20
      "EQUIPMENT VENDOR", // Index 21
      "EQUIPMENT LEVERING PLAN", // Index 22
      "EQUIPMENT LEVERING ACTUAL", // Index 23
      "EQUIPMENT STATUS", // Index 24
      "EXECUTION START PLAN", // Index 25
      "EXECUTION START ACTUAL", // Index 26
      "EXECUTION END PLAN", // Index 27
      "EXECUTION END ACTUAL", // Index 28
      "OVERALL STATUS", // Index 29
      "PROGRESS %", // Index 30
      "NOTES", // Index 31
      "LAST UPDATED", // Index 32
      "UPDATED BY", // Index 33
    ];
  }

  async init() {
    await sheetsService.init();
    const sheetExists = await sheetsService.sheetExists(this.sheetName);
    if (!sheetExists) {
      await sheetsService.writeData(`${this.sheetName}!A1:AH1`, [
        this.columnNames,
      ]);
      console.log("✅ Disbursement sheet created with headers");
    }
  }

  async getAllDisbursement() {
    await this.init();
    try {
      const data = await sheetsService.getAllData(this.sheetName, "A:AH");
      return data
        .map((row, i) => ({
          id: i,
          no: row["NO"] || "",
          programId: row["PROGRAM ID"] || "",
          programName: row["PROGRAM NAME"] || "",
          kluster: row["KLUSTER"] || "",
          bidang: row["BIDANG"] || "",
          tahun: row["TAHUN"] || "",
          estLevering: row["EST LEVERING (Bulan)"] || "0",

          materialVendor: row["MATERIAL VENDOR"] || "",
          materialPoDate: row["MATERIAL PO DATE"] || "",
          materialDeliveryPlan: row["MATERIAL DELIVERY PLAN"] || "",
          materialActualDelivery: row["MATERIAL ACTUAL DELIVERY"] || "",
          materialAmount: parseFloat(row["MATERIAL AMOUNT"]) || 0,
          materialStatus: row["MATERIAL STATUS"] || "Planned",

          serviceVendor: row["SERVICE VENDOR"] || "",
          servicePoDate: row["SERVICE PO DATE"] || "",
          serviceStartPlan: row["SERVICE START PLAN"] || "",
          serviceStartActual: row["SERVICE START ACTUAL"] || "",
          serviceEndPlan: row["SERVICE END PLAN"] || "",
          serviceEndActual: row["SERVICE END ACTUAL"] || "",
          serviceAmount: parseFloat(row["SERVICE AMOUNT"]) || 0,
          serviceStatus: row["SERVICE STATUS"] || "Planned",

          equipmentVendor: row["EQUIPMENT VENDOR"] || "",
          equipmentLeveringPlan: row["EQUIPMENT LEVERING PLAN"] || "",
          equipmentLeveringActual: row["EQUIPMENT LEVERING ACTUAL"] || "",
          equipmentStatus: row["EQUIPMENT STATUS"] || "Not Yet",

          executionStartPlan: row["EXECUTION START PLAN"] || "",
          executionStartActual: row["EXECUTION START ACTUAL"] || "",
          executionEndPlan: row["EXECUTION END PLAN"] || "",
          executionEndActual: row["EXECUTION END ACTUAL"] || "",

          overallStatus: row["OVERALL STATUS"] || "Not Started",
          progressPercentage: parseInt(row["PROGRESS %"]) || 0,
          notes: row["NOTES"] || "",
          lastUpdated: row["LAST UPDATED"] || "",
          updatedBy: row["UPDATED BY"] || "",
        }))
        .filter(
          (d) =>
            (d.no && d.no.trim() !== "") ||
            (d.programName && d.programName.trim() !== ""),
        );
    } catch (error) {
      console.error("Error getting disbursement data:", error);
      return [];
    }
  }

  async createFromProgram(programData) {
    await this.init();

    try {
      const allData = await this.getAllDisbursement();

      const existing = allData.find((d) => d.programId === programData.no);
      if (existing) {
        return {
          success: false,
          message: "Disbursement sudah ada untuk program ini",
        };
      }

      let maxNo = 0;
      allData.forEach((d) => {
        const num = parseInt(d.no);
        if (!isNaN(num) && num > maxNo) maxNo = num;
      });
      const newNo = (maxNo + 1).toString().padStart(3, "0");

      // Buat array 34 kolom (A sampai AH)
      const newRow = Array(34).fill("");
      newRow[0] = newNo;
      newRow[1] = programData.no;
      newRow[2] = programData.programKerja;
      newRow[3] = programData.klusterProgram;
      newRow[4] = programData.bidang;
      newRow[5] = programData.tahun;
      newRow[6] = programData.estLevering || "0";

      // ---- AMBIL ANGGARAN DARI DATA SHEET ----
      const hargaMaterial = parseFloat(programData.hargaMaterial) || 0;
      const hargaJasa = parseFloat(programData.hargaJasa) || 0;

      newRow[11] = hargaMaterial; // MATERIAL AMOUNT
      newRow[19] = hargaJasa; // SERVICE AMOUNT

      // Status Default
      newRow[12] = "Planned"; // Material Status
      newRow[20] = "Planned"; // Service Status
      newRow[24] = "Not Yet"; // Equipment Status
      newRow[29] = "Not Started"; // Overall Status
      newRow[30] = 0; // Progress
      newRow[32] = new Date().toLocaleString("id-ID");
      newRow[33] = loginService.getCurrentUser()?.nama || "System";

      const result = await sheetsService.appendData(this.sheetName, [newRow]);
      if (!result.success) {
        throw new Error("Gagal menambahkan data ke Google Sheets");
      }

      return { success: true, message: "Disbursement created", no: newNo };
    } catch (error) {
      console.error("Error createFromProgram:", error);
      return { success: false, message: error.message };
    }
  }

  async updateDisbursement(programId, updateData) {
    await this.init();
    const allDataRaw = await sheetsService.getRawData(this.sheetName, "A:AH");
    let rowIndex = -1;

    for (let i = 1; i < allDataRaw.length; i++) {
      if (allDataRaw[i] && allDataRaw[i][1] === programId) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) return { success: false, message: "Record not found" };

    try {
      const currentRow = allDataRaw[rowIndex];
      const updatedRow = [...currentRow];
      while (updatedRow.length < 34) updatedRow.push("");

      // Mapping index kolom
      const fieldMap = {
        materialPoDate: 8,
        materialDeliveryPlan: 9,
        materialActualDelivery: 10,
        materialStatus: 12,
        servicePoDate: 14,
        serviceStartPlan: 15,
        serviceStartActual: 16,
        serviceEndPlan: 17,
        serviceEndActual: 18,
        serviceStatus: 20,
        equipmentLeveringPlan: 22,
        equipmentLeveringActual: 23,
        equipmentStatus: 24,
        executionStartPlan: 25,
        executionStartActual: 26,
        executionEndPlan: 27,
        executionEndActual: 28,
        overallStatus: 29,
        notes: 31,
      };

      // --- LOGIKA VENDOR TUNGGAL ---
      // Jika UI mengirim 'vendor', simpan ke MATERIAL VENDOR dan SERVICE VENDOR
      if (updateData.vendor !== undefined) {
        updatedRow[7] = updateData.vendor; // Material Vendor
        updatedRow[13] = updateData.vendor; // Service Vendor
      }

      // --- LOGIKA ANGGARAN TUNGGAL ---
      // Jika UI mengirim 'amount', simpan ke MATERIAL AMOUNT dan SERVICE AMOUNT
      if (updateData.amount !== undefined) {
        const amt = parseFloat(updateData.amount) || 0;
        updatedRow[11] = amt; // Material Amount
        updatedRow[19] = amt; // Service Amount
      }

      // Loop untuk field lainnya
      for (const [field, index] of Object.entries(fieldMap)) {
        if (updateData[field] !== undefined) {
          updatedRow[index] =
            updateData[field] === null ? "" : String(updateData[field]);
        }
      }

      // Progress di-handle terpisah karena butuh parseInt
      if (updateData.progressPercentage !== undefined) {
        updatedRow[30] = parseInt(updateData.progressPercentage) || 0;
      }

      updatedRow[32] = new Date().toLocaleString("id-ID");
      updatedRow[33] = loginService.getCurrentUser()?.nama || "System";

      const result = await sheetsService.writeData(
        `${this.sheetName}!A${rowIndex + 1}:AH${rowIndex + 1}`,
        [updatedRow],
      );

      if (!result.success) throw new Error("Gagal menulis ke Google Sheets");

      return { success: true, message: "Data updated" };
    } catch (error) {
      console.error("Error updateDisbursement:", error);
      return { success: false, message: error.message };
    }
  }

  async deleteRow(sheetName, rowNumber) {
    try {
      const meta = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      const sheet = meta.data.sheets.find(
        (s) => s.properties.title === sheetName,
      );
      if (!sheet) throw new Error(`Sheet ${sheetName} tidak ditemukan`);

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheet.properties.sheetId,
                  dimension: "ROWS",
                  startIndex: rowNumber - 1,
                  endIndex: rowNumber,
                },
              },
            },
          ],
        },
      });
      return { success: true };
    } catch (error) {
      console.error("Error deleteRow:", error);
      return { success: false, message: error.message };
    }
  }
}

export default new DisbursementSheetService();
