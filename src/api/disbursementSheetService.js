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
      "MATERIAL VENDOR",
      "MATERIAL PO DATE",
      "MATERIAL DELIVERY PLAN",
      "MATERIAL ACTUAL DELIVERY",
      "MATERIAL AMOUNT",
      "MATERIAL STATUS",
      "SERVICE VENDOR",
      "SERVICE PO DATE",
      "SERVICE START PLAN",
      "SERVICE START ACTUAL",
      "SERVICE END PLAN",
      "SERVICE END ACTUAL",
      "SERVICE AMOUNT",
      "SERVICE STATUS",
      "EQUIPMENT VENDOR",
      "EQUIPMENT LEVERING PLAN",
      "EQUIPMENT LEVERING ACTUAL",
      "EQUIPMENT STATUS",
      "EXECUTION START PLAN",
      "EXECUTION START ACTUAL",
      "EXECUTION END PLAN",
      "EXECUTION END ACTUAL",
      "OVERALL STATUS",
      "PROGRESS %",
      "NOTES",
      "LAST UPDATED",
      "UPDATED BY",
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
        .filter((d) => d.programId && d.programId.trim() !== "");
    } catch (error) {
      console.error("Error getting disbursement data:", error);
      return [];
    }
  }

  async createFromProgram(programData) {
    await this.init();

    try {
      // PERBAIKAN: Tambahkan 'await' sebelum getAllDisbursement()
      const allData = await this.getAllDisbursement();

      const existing = allData.find((d) => d.programId === programData.no);
      if (existing) {
        return {
          success: false,
          message: "Disbursement sudah ada untuk program ini",
        };
      }

      const newNo = (allData.length + 1).toString().padStart(3, "0");

      // Buat array 34 kolom (A sampai AH)
      const newRow = Array(34).fill("");
      newRow[0] = newNo;
      newRow[1] = programData.no;
      newRow[2] = programData.programKerja;
      newRow[3] = programData.klusterProgram;
      newRow[4] = programData.bidang;
      newRow[5] = programData.tahun;
      newRow[6] = programData.estLevering || "0";

      newRow[12] = "Planned"; // Material Status
      newRow[20] = "Planned"; // Service Status
      newRow[24] = "Not Yet"; // Equipment Status
      newRow[29] = "Not Started"; // Overall Status
      newRow[30] = 0; // Progress
      newRow[32] = new Date().toLocaleString("id-ID");
      newRow[33] = loginService.getCurrentUser()?.nama || "System";

      const rowCount = await sheetsService.getRowCount(this.sheetName);
      await sheetsService.writeData(
        `${this.sheetName}!A${rowCount + 2}:AH${rowCount + 2}`,
        [newRow],
      );

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

      const fieldMap = {
        materialVendor: 7,
        materialPoDate: 8,
        materialDeliveryPlan: 9,
        materialActualDelivery: 10,
        materialAmount: 11,
        materialStatus: 12,
        serviceVendor: 13,
        servicePoDate: 14,
        serviceStartPlan: 15,
        serviceStartActual: 16,
        serviceEndPlan: 17,
        serviceEndActual: 18,
        serviceAmount: 19,
        serviceStatus: 20,
        equipmentVendor: 21,
        equipmentLeveringPlan: 22,
        equipmentLeveringActual: 23,
        equipmentStatus: 24,
        executionStartPlan: 25,
        executionStartActual: 26,
        executionEndPlan: 27,
        executionEndActual: 28,
        overallStatus: 29,
        progressPercentage: 30,
        notes: 31,
      };

      for (const [field, index] of Object.entries(fieldMap)) {
        if (updateData[field] !== undefined) {
          if (
            ["materialAmount", "serviceAmount", "progressPercentage"].includes(
              field,
            )
          ) {
            updatedRow[index] = isNaN(parseFloat(updateData[field]))
              ? 0
              : parseFloat(updateData[field]);
          } else {
            updatedRow[index] =
              updateData[field] === null ? "" : String(updateData[field]);
          }
        }
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
}

export default new DisbursementSheetService();
