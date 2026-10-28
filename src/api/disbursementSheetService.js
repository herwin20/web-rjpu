// DisbursementSheetService.js
import sheetsService from "./googleSheetService";
import loginService from "./loginSheetService";

class DisbursementSheetService {
  constructor() {
    this.sheetName = "Disbursement";
    this.columns = {
      NO: 0,
      PROGRAM_ID: 1, // Referensi ke NO di sheet Data
      PROGRAM_NAME: 2,
      KLUSTER: 3,
      BIDANG: 4,
      TAHUN: 5,
      EST_LEVERING: 6, // Estimasi levering dari sheet Data (dalam bulan)

      // Material Disbursement
      MATERIAL_VENDOR: 7,
      MATERIAL_PO_DATE: 8,
      MATERIAL_DELIVERY_PLAN: 9, // Rencana pengiriman material
      MATERIAL_ACTUAL_DELIVERY: 10, // Realisasi pengiriman material
      MATERIAL_AMOUNT: 11,
      MATERIAL_STATUS: 12, // Planned, In Progress, Completed, Delayed

      // Service/Jasa Disbursement
      SERVICE_VENDOR: 13,
      SERVICE_PO_DATE: 14,
      SERVICE_START_PLAN: 15, // Rencana mulai jasa
      SERVICE_START_ACTUAL: 16, // Realisasi mulai jasa
      SERVICE_END_PLAN: 17, // Rencana selesai jasa
      SERVICE_END_ACTUAL: 18, // Realisasi selesai jasa
      SERVICE_AMOUNT: 19,
      SERVICE_STATUS: 20, // Planned, In Progress, Completed, Delayed

      // Equipment Levering
      EQUIPMENT_VENDOR: 21,
      EQUIPMENT_LEVERING_PLAN: 22, // Rencana datang peralatan
      EQUIPMENT_LEVERING_ACTUAL: 23, // Realisasi datang peralatan
      EQUIPMENT_STATUS: 24, // Not Yet, On Progress, Arrived, Delayed

      // Timeline Execution (dalam bulan)
      EXECUTION_START_PLAN: 25,
      EXECUTION_START_ACTUAL: 26,
      EXECUTION_END_PLAN: 27,
      EXECUTION_END_ACTUAL: 28,

      // Overall Status
      OVERALL_STATUS: 29, // Not Started, Planning, On Progress, Completed, Delayed
      PROGRESS_PERCENTAGE: 30, // 0-100%

      // Notes
      NOTES: 31,
      LAST_UPDATED: 32,
      UPDATED_BY: 33,
    };

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
    await this.ensureHeaders();
  }

  async ensureHeaders() {
    try {
      const sheetExists = await sheetsService.sheetExists(this.sheetName);
      if (!sheetExists) {
        await sheetsService.writeData(`${this.sheetName}!A1:AG1`, [
          this.columnNames,
        ]);
        console.log("✅ Disbursement sheet created with headers");
      }
    } catch (error) {
      console.error("Error ensuring disbursement headers:", error);
    }
  }

  // Get all disbursement data
  async getAllDisbursement() {
    await this.init();
    try {
      const data = await sheetsService.getAllData(this.sheetName, "A:AG");
      const processedData = [];
      const startIndex = data.length > 0 && data[0]["NO"] === "NO" ? 1 : 0;

      for (let i = startIndex; i < data.length; i++) {
        const row = data[i];
        if (!row["PROGRAM ID"] || row["PROGRAM ID"].toString().trim() === "")
          continue;

        processedData.push({
          id: i,
          no: row["NO"] || "",
          programId: row["PROGRAM ID"] || "",
          programName: row["PROGRAM NAME"] || "",
          kluster: row["KLUSTER"] || "",
          bidang: row["BIDANG"] || "",
          tahun: row["TAHUN"] || "",
          estLevering: row["EST LEVERING (Bulan)"] || "",

          materialVendor: row["MATERIAL VENDOR"] || "",
          materialPoDate: row["MATERIAL PO DATE"] || "",
          materialDeliveryPlan: row["MATERIAL DELIVERY PLAN"] || "",
          materialActualDelivery: row["MATERIAL ACTUAL DELIVERY"] || "",
          materialAmount: row["MATERIAL AMOUNT"] || "",
          materialStatus: row["MATERIAL STATUS"] || "Planned",

          serviceVendor: row["SERVICE VENDOR"] || "",
          servicePoDate: row["SERVICE PO DATE"] || "",
          serviceStartPlan: row["SERVICE START PLAN"] || "",
          serviceStartActual: row["SERVICE START ACTUAL"] || "",
          serviceEndPlan: row["SERVICE END PLAN"] || "",
          serviceEndActual: row["SERVICE END ACTUAL"] || "",
          serviceAmount: row["SERVICE AMOUNT"] || "",
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
        });
      }
      return processedData;
    } catch (error) {
      console.error("Error getting disbursement data:", error);
      return [];
    }
  }

  // Create disbursement record from program data
  async createFromProgram(programData) {
    await this.init();

    const existing = await this.getByProgramId(programData.no);
    if (existing) {
      return {
        success: false,
        message: "Disbursement record already exists for this program",
      };
    }

    try {
      const allData = await this.getAllDisbursement();
      const newNo = (allData.length + 1).toString().padStart(3, "0");

      const newRow = [
        newNo,
        programData.no,
        programData.programKerja,
        programData.klusterProgram,
        programData.bidang,
        programData.tahun,
        programData.estLevering || "0",
        "",
        "",
        "",
        "",
        "",
        "Planned",
        "",
        "",
        "",
        "",
        "",
        "",
        "Planned",
        "",
        "",
        "",
        "Not Yet",
        "",
        "",
        "",
        "",
        "Not Started",
        "0",
        "",
        new Date().toLocaleString("id-ID"),
        loginService.getCurrentUser()?.nama || "System",
      ];

      const rowCount = await sheetsService.getRowCount(this.sheetName);
      const range = `${this.sheetName}!A${rowCount + 2}:AG${rowCount + 2}`;
      await sheetsService.writeData(range, [newRow]);

      return {
        success: true,
        message: "Disbursement record created",
        no: newNo,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getByProgramId(programId) {
    const all = await this.getAllDisbursement();
    return all.find((item) => item.programId === programId);
  }

  async updateDisbursement(programId, updateData) {
    const allDataRaw = await sheetsService.getRawData(this.sheetName, "A:AG");
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

      // Update based on field mapping
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
          updatedRow[index] = updateData[field];
        }
      }

      updatedRow[32] = new Date().toLocaleString("id-ID");
      updatedRow[33] = loginService.getCurrentUser()?.nama || "System";

      const sheetRow = rowIndex + 1;
      const range = `${this.sheetName}!A${sheetRow}:AG${sheetRow}`;
      await sheetsService.writeData(range, [updatedRow]);

      return { success: true, message: "Disbursement updated successfully" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getSummary() {
    const all = await this.getAllDisbursement();
    return {
      total: all.length,
      byStatus: {
        notStarted: all.filter((d) => d.overallStatus === "Not Started").length,
        planning: all.filter((d) => d.overallStatus === "Planning").length,
        onProgress: all.filter((d) => d.overallStatus === "On Progress").length,
        completed: all.filter((d) => d.overallStatus === "Completed").length,
        delayed: all.filter((d) => d.overallStatus === "Delayed").length,
      },
      avgProgress: Math.round(
        all.reduce((sum, d) => sum + d.progressPercentage, 0) /
          (all.length || 1),
      ),
      totalMaterialAmount: all.reduce(
        (sum, d) => sum + (parseFloat(d.materialAmount) || 0),
        0,
      ),
      totalServiceAmount: all.reduce(
        (sum, d) => sum + (parseFloat(d.serviceAmount) || 0),
        0,
      ),
    };
  }
}

export default new DisbursementSheetService();
