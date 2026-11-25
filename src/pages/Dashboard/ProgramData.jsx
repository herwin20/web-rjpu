// components/ProgramData.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FiArchive,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiDownload,
  FiX,
  FiSave,
  FiExternalLink,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiRefreshCw,
  FiFileText,
  FiGrid,
  FiList,
  FiInfo,
  FiCheck,
  FiAlertCircle,
  FiTrendingUp,
  FiCalendar,
  FiFolder,
  FiDollarSign,
  FiEye,
  FiAlertTriangle,
  FiChevronUp,
  FiChevronDown,
  FiUpload, // Tambahan untuk Upload
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import dataSheet from "../../api/dataSheetService";
import assetService from "../../api/asetSheetService";
import strategiService from "../../api/strategiSheetService";
import profilRiskService from "../../api/profileRiskService";
import sheetsService from "../../api/googleSheetService"; // Tambahan untuk upload

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ==================== Eskalasi Harga ====================
const INFLASI_PER_TAHUN = 0.035; // 3,5% per tahun
const TAHUN_REFERENSI_MULAI = 2015;

const parseTahun = (v) => {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
};

// Inflasi majemuk: (tahunProgram - tahunReferensi) kali
const hitungFaktorInflasi = (tahunReferensi, tahunProgram) => {
  const ref = parseTahun(tahunReferensi);
  const target = parseTahun(tahunProgram);
  if (!ref || !target || target <= ref) return { selisih: 0, faktor: 1 };
  const selisih = target - ref;
  return { selisih, faktor: Math.pow(1 + INFLASI_PER_TAHUN, selisih) };
};

// ==================== Skeletons ====================
const SkeletonTableRow = () => (
  <tr className="border-t border-slate-100">
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-8 animate-pulse" />
    </td>
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-12 animate-pulse" />
    </td>
    <td className="px-4 py-3">
      <div className="h-5 bg-gray-200 rounded w-48 animate-pulse" />
      <div className="h-3 bg-gray-200 rounded w-64 mt-1 animate-pulse" />
    </td>
    <td className="px-4 py-3">
      <div className="h-6 bg-gray-200 rounded w-24 animate-pulse" />
    </td>
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-12 animate-pulse" />
    </td>
    <td className="px-4 py-3 text-center">
      <div className="h-6 bg-gray-200 rounded w-16 mx-auto animate-pulse" />
    </td>
    <td className="px-4 py-3 text-right">
      <div className="h-4 bg-gray-200 rounded w-24 ml-auto animate-pulse" />
    </td>
    <td className="px-4 py-3 text-center">
      <div className="h-6 bg-gray-200 rounded w-16 mx-auto animate-pulse" />
    </td>
    <td className="px-4 py-3 text-center">
      <div className="h-4 bg-gray-200 rounded w-12 mx-auto animate-pulse" />
    </td>
    <td className="px-4 py-3 text-center">
      <div className="h-4 bg-gray-200 rounded w-12 mx-auto animate-pulse" />
    </td>
    <td className="px-4 py-3 text-center">
      <div className="flex gap-1 justify-center">
        <div className="w-7 h-7 bg-gray-200 rounded-lg" />
        <div className="w-7 h-7 bg-gray-200 rounded-lg" />
        <div className="w-7 h-7 bg-gray-200 rounded-lg" />
      </div>
    </td>
  </tr>
);

const SkeletonStatsCard = () => (
  <div className="group relative bg-white rounded-[22px] border border-slate-200/80 shadow-[0_4px_24px_rgba(15,23,42,0.035)] overflow-hidden animate-pulse">
    <div className="relative p-5 md:p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-2xl bg-gray-200">
          <div className="w-6 h-6" />
        </div>
        <div className="text-right">
          <div className="h-8 bg-gray-200 rounded w-16" />
        </div>
      </div>
      <div className="h-5 bg-gray-200 rounded w-24 mb-1" />
      <div className="h-3 bg-gray-200 rounded w-32" />
    </div>
  </div>
);

// ==================== Main Component ====================
const ProgramData = ({ userRole }) => {
  const normalizedRole = String(userRole || "")
    .trim()
    .toLowerCase();
  const isAdmin = normalizedRole === "admin";
  const canEdit = isAdmin || normalizedRole === "user";

  // Data
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [formData, setFormData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortConfig, setSortConfig] = useState({ key: "no", direction: "asc" });

  // Filters
  const [filterYear, setFilterYear] = useState("all");
  const [filterCluster, setFilterCluster] = useState("all");
  const [filterBidang, setFilterBidang] = useState("all");
  const [filterKeterangan, setFilterKeterangan] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [programToDelete, setProgramToDelete] = useState(null);

  // Loading States
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingBulkDelete, setLoadingBulkDelete] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false); // State Loading Upload

  // Master data
  const [assets, setAssets] = useState([]);
  const [strategis, setStrategis] = useState([]);
  const [profilRiskOptions, setProfilRiskOptions] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingStrategis, setLoadingStrategis] = useState(false);
  const [loadingProfilRisk, setLoadingProfilRisk] = useState(false);
  const [profilRiskError, setProfilRiskError] = useState("");

  // Aset searchable
  const [assetSearch, setAssetSearch] = useState("");
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);

  // Dropdown options statis
  const klusterOptions = [
    "Major OH & HGPP",
    "Kehandalan Pembangkit",
    "Efisiensi Pembangkit",
    "Regulasi",
    "Anti Blackout",
    "Digital Power Plant",
    "Tools & Alat Berat",
    "Infrastruktur IT",
    "Infrastruktur Sipil & Bangunan",
  ];
  const oemOptions = ["OEM", "NON OEM"];
  const dasarInputProgramOptions = [
    "Kepatuhan Regulasi",
    "OPI Analysis/OEE (PLO, Heat Loss)",
    "Outage Management",
    "Maintenance History Analysis (PM, PdM, CM)",
    "Assesment Unit (RLA, RKU)",
    "Kajian Enjinering (FMEA, RCFA, ECP, LCM)",
    "Optimasi Inventory Control (strategic spare)",
    "Evaluasi Kebutuhan Sarana & Infrastruktur",
    "Manufacture Recommended",
    "Aging (Life Cycle)",
  ];
  const sasaranRjppOptions = [
    "Keandalan",
    "Efisiensi",
    "Mutu",
    "Maintainability (Memperpanjang MTBO atau memperpendek durasi OH)",
    "Pengembalian Daya Mampu",
    "Penurunan Potensi Resiko",
    "Regulasi/Peraturan Pemerintah",
    "Safety/K3 (HSE)",
    "Pelayanan",
  ];
  const sumberAnggaranOptions = ["AI", "AO"];
  const riskOptions = [
    "Rendah",
    "Moderat",
    "Tinggi",
    "Sangat Tinggi",
    "Ekstrem",
  ];
  const bidangOptions = [
    "Listrik",
    "Instrument",
    "Mekanik",
    "Lingkungan",
    "Pengadaan",
    "Operasi",
    "Labor",
    "K3",
    "Sarana",
    "CNG",
    "CBM",
    "UMUM",
    "MO",
    "IT",
  ];
  const kategoriOptions = ["Material", "Jasa", "Material & Jasa"];
  const tkdnOptions = ["Ya", "Tidak"];
  const keteranganOptions = [
    "Belum Dimulai",
    "On Progress",
    "Diskusi",
    "Lanjut",
    "Ditunda",
    "Selesai",
    "Drop",
  ];

  // Opsi Aktivitas AO
  const aktivitasAoOptions = [
    "10 - Operasi",
    "17 - Kimia & Labor",
    "18 - K3",
    "19 - Lingkungan",
    "20 - Preventive Maintenance",
    "21 - Predictive Maintenance",
    "22 - Corective Maintenance",
    "23 - Emergency Maintenance",
    "24 - Overhaul / Inspection",
    "25 - Breakdown Maintenance",
    "26 - Engineering / Project / Modifikasi",
  ];

  // Effects
  useEffect(() => {
    loadPrograms();
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    setLoadingAssets(true);
    setLoadingStrategis(true);
    setLoadingProfilRisk(true);
    setProfilRiskError("");

    const [assetResult, strategiResult, riskResult] = await Promise.allSettled([
      assetService.getAllAssets(),
      strategiService.getAllStrategi(),
      profilRiskService.getDropdownOptions(),
    ]);

    if (assetResult.status === "fulfilled") setAssets(assetResult.value || []);
    if (strategiResult.status === "fulfilled")
      setStrategis(strategiResult.value || []);
    if (riskResult.status === "fulfilled")
      setProfilRiskOptions(riskResult.value || []);
    else {
      console.error("Failed loading Profile_Risk:", riskResult.reason);
      setProfilRiskError(
        "Gagal mengambil Profile Risk. Periksa akses Google Sheets.",
      );
    }

    setLoadingAssets(false);
    setLoadingStrategis(false);
    setLoadingProfilRisk(false);
  };

  const refreshProfilRisk = async () => {
    setLoadingProfilRisk(true);
    setProfilRiskError("");
    try {
      profilRiskService.invalidateCache();
      const options = await profilRiskService.getDropdownOptions();
      setProfilRiskOptions(options || []);
    } catch (error) {
      console.error("Failed refreshing Profile_Risk:", error);
      setProfilRiskError(
        "Gagal mengambil Profile Risk. Periksa akses Google Sheets.",
      );
    } finally {
      setLoadingProfilRisk(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const data = await dataSheet.getAllData();
      setPrograms(data);
    } catch (error) {
      showToast("Gagal memuat data: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ==== SORTING LOGIC ====
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key)
      return <FiChevronDown className="ml-1 opacity-20 text-slate-500" />;
    return sortConfig.direction === "asc" ? (
      <FiChevronUp className="ml-1 text-sky-600" />
    ) : (
      <FiChevronDown className="ml-1 text-sky-600" />
    );
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Ambil judul program untuk nama sub-folder
    const folderName = formData.programKerja
      ? formData.programKerja
      : "Program Tanpa Judul";

    if (file.size > 15 * 1024 * 1024) {
      showToast("Ukuran file maksimal 15MB", "error");
      return;
    }

    setLoadingUpload(true);
    try {
      // Kirim file DAN nama program
      const result = await sheetsService.uploadFileToDrive(file, folderName);

      if (result.success) {
        setFormData((prev) => ({ ...prev, file: result.link }));
        showToast(
          `File berhasil diunggah ke folder "${folderName}"`,
          "success",
        );
      } else {
        showToast(result.message, "error");
      }
    } catch (error) {
      showToast("Gagal mengunggah file: " + error.message, "error");
    } finally {
      setLoadingUpload(false);
      e.target.value = null; // Reset input file
    }
  };

  // Handlers
  const handleAdd = () => {
    setEditingProgram(null);
    setFormData({
      programKerja: "",
      alasanProgram: "",
      profilRisk: "",
      klusterProgram: "",
      oemNonOem: "",
      dasarInputProgram: "",
      sasaranRjpp: "",
      sumberAnggaran: "",
      estLevering: "",
      levelResikoInherent: "",
      levelRisikoResidual: "",
      sat: "",
      vol: "",
      tahun: new Date().getFullYear().toString(),
      hargaTotal: "",
      file: "",
      bidang: "",
      kategori: "",
      hargaMaterial: "",
      hargaJasa: "",
      tkdn: "",
      strategisRjpu: "",
      aset: "",
      descriptionAset: "",
      keterangan: "Belum Dimulai",
      aktivitasAo: "",
      tahunReferensiHarga: "", // UI saja, tidak disimpan ke sheet
    });
    setShowModal(true);
  };

  const handleEdit = (program) => {
    if (!canEdit) {
      showToast("Anda tidak memiliki izin mengedit program", "error");
      return;
    }
    setEditingProgram(program);
    setFormData({
      ...program,
      profilRisk: program.profilRisk || "",
      tahunReferensiHarga: "", // harga tersimpan sudah final, jangan di-inflasi dua kali
    });
    setShowModal(true);
  };

  const handleViewDetail = (program) => {
    setSelectedProgram(program);
    setShowDetailModal(true);
  };

  const handleAsetChange = (namaAset) => {
    const asset = assets.find((a) => a.namaAset === namaAset);
    setFormData((prev) => ({
      ...prev,
      aset: namaAset,
      descriptionAset: asset ? asset.deskripsi : "",
    }));
  };

  const handleKategoriChange = (kategori) => {
    setFormData((prev) => {
      const updated = { ...prev, kategori };
      if (kategori === "Material") {
        updated.hargaJasa = "";
      } else if (kategori === "Jasa") {
        updated.hargaMaterial = "";
        updated.aset = "Jasa";
        updated.descriptionAset = "";
      }
      return updated;
    });
  };

  // Perhitungan harga + eskalasi inflasi dari tahun referensi ke tahun program
  const pricing = useMemo(() => {
    const hM = parseFloat(formData.hargaMaterial) || 0;
    const hJ = parseFloat(formData.hargaJasa) || 0;
    const ref = parseTahun(formData.tahunReferensiHarga);
    const target = parseTahun(formData.tahun);
    const { selisih, faktor } = hitungFaktorInflasi(
      formData.tahunReferensiHarga,
      formData.tahun,
    );
    // Hanya dibulatkan bila ada eskalasi, agar nilai lama tidak berubah saat edit
    const adjM = faktor === 1 ? hM : Math.round(hM * faktor);
    const adjJ = faktor === 1 ? hJ : Math.round(hJ * faktor);
    return {
      hM,
      hJ,
      ref,
      selisih,
      faktor,
      adjM,
      adjJ,
      total: adjM + adjJ,
      active: !!ref && selisih > 0,
      invalidRef: !!ref && !!target && ref > target,
    };
  }, [
    formData.hargaMaterial,
    formData.hargaJasa,
    formData.tahunReferensiHarga,
    formData.tahun,
  ]);

  const computedHargaTotal = pricing.total;

  const tahunReferensiOptions = useMemo(() => {
    const end = parseTahun(formData.tahun) || new Date().getFullYear();
    const years = [];
    for (let y = end; y >= TAHUN_REFERENSI_MULAI; y--) years.push(String(y));
    return years;
  }, [formData.tahun]);

  const filteredAssets = useMemo(() => {
    if (!assetSearch.trim()) return assets;
    const q = assetSearch.toLowerCase().trim();
    return assets.filter(
      (a) =>
        a.namaAset.toLowerCase().includes(q) ||
        a.deskripsi.toLowerCase().includes(q),
    );
  }, [assets, assetSearch]);

  const confirmDelete = (no, programName) => {
    if (!isAdmin) {
      showToast("Hanya Admin yang boleh menghapus program", "error");
      return;
    }
    setProgramToDelete({ no, programName });
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    if (!isAdmin) {
      showToast("Hanya Admin yang boleh memindahkan program ke Drop", "error");
      return;
    }
    if (!programToDelete) return;
    setLoadingDelete(true);
    try {
      const { no, programName } = programToDelete;
      const result = await dataSheet.moveToDrop(no, "DROP");
      if (result.success) {
        await loadPrograms();
        showToast(
          `Program "${programName}" berhasil dipindahkan ke arsip Drop`,
          "success",
        );
      } else {
        showToast("Gagal menghapus program: " + result.message, "error");
      }
    } catch (error) {
      showToast("Terjadi kesalahan: " + error.message, "error");
    } finally {
      setLoadingDelete(false);
      setShowDeleteConfirm(false);
      setProgramToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!isAdmin) {
      showToast("Hanya Admin yang boleh menghapus massal", "error");
      return;
    }
    if (selectedPrograms.length === 0) return;
    setLoadingBulkDelete(true);
    let ok = 0,
      fail = 0;
    try {
      for (const no of selectedPrograms) {
        const result = await dataSheet.moveToDrop(no, "DROP");
        if (result.success) ok++;
        else fail++;
      }
      await loadPrograms();
      setSelectedPrograms([]);
      if (ok > 0) {
        showToast(
          `${ok} program dipindahkan ke Drop${fail > 0 ? `, ${fail} gagal` : ""}`,
          "success",
        );
      } else {
        showToast("Gagal menghapus program", "error");
      }
    } catch (error) {
      showToast("Terjadi kesalahan: " + error.message, "error");
    } finally {
      setLoadingBulkDelete(false);
      setShowBulkDelete(false);
    }
  };

  const toggleSelectProgram = (no) => {
    if (!isAdmin) return;
    setSelectedPrograms((prev) =>
      prev.includes(no) ? prev.filter((n) => n !== no) : [...prev, no],
    );
  };

  const toggleSelectAll = () => {
    if (!isAdmin) return;
    if (selectedPrograms.length === paginatedPrograms.length) {
      setSelectedPrograms([]);
    } else {
      setSelectedPrograms(paginatedPrograms.map((p) => p.no));
    }
  };

  const handleSave = async () => {
    if (editingProgram && !canEdit) {
      showToast("Anda tidak memiliki izin mengedit program", "error");
      return;
    }
    if (!formData.programKerja) {
      showToast("Program Kerja wajib diisi", "error");
      return;
    }
    if (!formData.tahun) {
      showToast("Tahun wajib diisi", "error");
      return;
    }
    if (!formData.kategori) {
      showToast("Kategori wajib dipilih", "error");
      return;
    }
    if (!editingProgram && !formData.strategisRjpu) {
      showToast(
        "Strategis RJPU wajib dipilih (untuk generate nomor program)",
        "error",
      );
      return;
    }

    const hM = parseFloat(formData.hargaMaterial) || 0;
    const hJ = parseFloat(formData.hargaJasa) || 0;

    if (formData.kategori === "Material" && hM <= 0) {
      showToast("Harga Material wajib diisi > 0", "error");
      return;
    }
    if (formData.kategori === "Jasa" && hJ <= 0) {
      showToast("Harga Jasa wajib diisi > 0", "error");
      return;
    }
    if (formData.kategori === "Material & Jasa" && (hM <= 0 || hJ <= 0)) {
      showToast("Harga Material & Jasa wajib diisi > 0", "error");
      return;
    }
    if (pricing.invalidRef) {
      showToast(
        "Tahun harga referensi tidak boleh lebih besar dari tahun program",
        "error",
      );
      return;
    }

    setLoadingSave(true);
    try {
      // Yang disimpan ke sheet adalah harga setelah eskalasi inflasi
      const { tahunReferensiHarga, ...rest } = formData;
      const payload = {
        ...rest,
        hargaMaterial: pricing.adjM > 0 ? pricing.adjM : "",
        hargaJasa: pricing.adjJ > 0 ? pricing.adjJ : "",
        hargaTotal: pricing.total,
      };
      if (editingProgram) {
        const result = await dataSheet.updateData(editingProgram.no, payload);
        if (result.success) {
          await loadPrograms();
          setShowModal(false);
          showToast("Program berhasil diupdate", "success");
        } else {
          showToast("Gagal: " + result.message, "error");
        }
      } else {
        const result = await dataSheet.addData(payload);
        if (result.success) {
          await loadPrograms();
          setShowModal(false);
          showToast(`Program ${result.no} berhasil ditambahkan`, "success");
        } else {
          showToast("Gagal: " + result.message, "error");
        }
      }
    } catch (error) {
      showToast("Terjadi kesalahan: " + error.message, "error");
    } finally {
      setLoadingSave(false);
    }
  };

  // ==================== EXPORT EXCEL RJPU ====================

  const handleExport = async () => {
    setLoadingExport(true);

    try {
      const filtered = getFilteredPrograms();

      if (!filtered || filtered.length === 0) {
        showToast("Tidak ada data untuk diekspor", "error");
        return;
      }

      const workbook = new ExcelJS.Workbook();

      workbook.creator = "RJPU Engineering";
      workbook.company = "UP Muara Tawar";
      workbook.subject = "Laporan Program Kerja RJPU";
      workbook.title = "Rencana Jangka Panjang Unit";
      workbook.created = new Date();

      const COLORS = {
        navy: "FF101B34",
        blue: "FF1E4F91",
        sky: "FF2563EB",
        white: "FFFFFFFF",
        light: "FFF1F5F9",
        border: "FFDCE3EC",
        text: "FF334155",
        green: "FF047857",
        greenLight: "FFD1FAE5",
        purple: "FF7E22CE",
        purpleLight: "FFF3E8FF",
        blueLight: "FFDBEAFE",
        red: "FFB91C1C",
        redLight: "FFFEE2E2",
        amber: "FFB45309",
        amberLight: "FFFEF3C7",
      };

      const CURRENCY_FORMAT = '"Rp" #,##0;[Red]("Rp" #,##0);"-"';

      const exportDate = new Date().toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
      });

      // ==================== HELPERS ====================

      const toNumber = (value) => {
        if (typeof value === "number") {
          return Number.isFinite(value) ? value : 0;
        }

        let str = String(value ?? "")
          .replace(/Rp/gi, "")
          .replace(/\s/g, "")
          .trim();

        if (!str) return 0;

        // Format Indonesia: 1.250.000,50
        if (str.includes(",")) {
          str = str.replace(/\./g, "").replace(",", ".");
        } else if (/^-?\d{1,3}(\.\d{3})+$/.test(str)) {
          str = str.replace(/\./g, "");
        }

        const number = Number(str);

        return Number.isFinite(number) ? number : 0;
      };

      const sum = (data, field) =>
        data.reduce((total, item) => total + toNumber(item[field]), 0);

      const fill = (color) => ({
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: color },
      });

      const border = {
        top: {
          style: "thin",
          color: { argb: COLORS.border },
        },
        left: {
          style: "thin",
          color: { argb: COLORS.border },
        },
        bottom: {
          style: "thin",
          color: { argb: COLORS.border },
        },
        right: {
          style: "thin",
          color: { argb: COLORS.border },
        },
      };

      const columnLetter = (index) => {
        let result = "";

        while (index > 0) {
          index--;

          result = String.fromCharCode(65 + (index % 26)) + result;

          index = Math.floor(index / 26);
        }

        return result;
      };

      // ==================== TITLE SHEET ====================

      const setupTitle = (sheet, title, subtitle, count) => {
        const lastColumn = columnLetter(count);

        sheet.mergeCells(`A1:${lastColumn}1`);

        const titleCell = sheet.getCell("A1");
        titleCell.value = title;
        titleCell.fill = fill(COLORS.navy);

        titleCell.font = {
          name: "Calibri",
          size: 19,
          bold: true,
          color: { argb: COLORS.white },
        };

        titleCell.alignment = {
          vertical: "middle",
          horizontal: "left",
          indent: 1,
        };

        sheet.getRow(1).height = 38;

        sheet.mergeCells(`A2:${lastColumn}2`);

        const subtitleCell = sheet.getCell("A2");

        subtitleCell.value = subtitle;
        subtitleCell.fill = fill(COLORS.blue);

        subtitleCell.font = {
          name: "Calibri",
          size: 11,
          color: { argb: COLORS.white },
        };

        subtitleCell.alignment = {
          vertical: "middle",
          indent: 2,
        };

        sheet.getRow(2).height = 25;

        sheet.mergeCells(`A3:${lastColumn}3`);

        const dateCell = sheet.getCell("A3");

        dateCell.value =
          `UP Muara Tawar | Export: ${exportDate} | ` +
          `${filtered.length} program`;

        dateCell.font = {
          name: "Calibri",
          size: 10,
          italic: true,
          color: { argb: COLORS.text },
        };

        sheet.getRow(3).height = 22;
        sheet.getRow(4).height = 10;

        sheet.properties.defaultRowHeight = 22;
      };

      // ==================== HEADER STYLE ====================

      const styleHeader = (sheet, rowNumber, count) => {
        const row = sheet.getRow(rowNumber);

        row.height = 35;

        for (let i = 1; i <= count; i++) {
          const cell = row.getCell(i);

          cell.fill = fill(COLORS.blue);

          cell.font = {
            name: "Calibri",
            size: 10,
            bold: true,
            color: { argb: COLORS.white },
          };

          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };

          cell.border = border;
        }
      };

      // ==================== DATA ROW STYLE ====================

      const styleDataRow = (row, count, index) => {
        for (let i = 1; i <= count; i++) {
          const cell = row.getCell(i);

          cell.font = {
            name: "Calibri",
            size: 11,
            color: { argb: COLORS.text },
          };

          cell.fill = fill(index % 2 === 0 ? COLORS.white : COLORS.light);

          cell.border = border;

          cell.alignment = {
            vertical: "middle",
            horizontal: "left",
            wrapText: true,
          };
        }
      };

      // ==================== TOTAL ROW STYLE ====================

      const styleTotal = (row, count) => {
        row.height = 30;

        for (let i = 1; i <= count; i++) {
          const cell = row.getCell(i);

          cell.fill = fill(COLORS.navy);
          cell.border = border;

          cell.font = {
            name: "Calibri",
            size: 11,
            bold: true,
            color: { argb: COLORS.white },
          };

          cell.alignment = {
            vertical: "middle",
            horizontal: i === 1 ? "left" : "right",
          };
        }
      };

      // ==================== STATUS COLOR ====================

      const statusColors = {
        selesai: {
          bg: COLORS.greenLight,
          text: COLORS.green,
        },
        "on progress": {
          bg: COLORS.blueLight,
          text: COLORS.blue,
        },
        diskusi: {
          bg: COLORS.purpleLight,
          text: COLORS.purple,
        },
        lanjut: {
          bg: COLORS.blueLight,
          text: COLORS.blue,
        },
        ditunda: {
          bg: COLORS.amberLight,
          text: COLORS.amber,
        },
        drop: {
          bg: COLORS.redLight,
          text: COLORS.red,
        },
        "belum dimulai": {
          bg: COLORS.light,
          text: COLORS.text,
        },
      };

      const applyStatusColor = (cell, status) => {
        const color =
          statusColors[
            String(status || "")
              .trim()
              .toLowerCase()
          ];

        if (!color) return;

        cell.fill = fill(color.bg);

        cell.font = {
          name: "Calibri",
          size: 10,
          bold: true,
          color: { argb: color.text },
        };

        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      };

      // ==========================================================
      // SHEET 1 : DATA PROGRAM
      // ==========================================================

      const sheet = workbook.addWorksheet("Data Program", {
        properties: {
          tabColor: { argb: COLORS.blue },
        },
        views: [
          {
            state: "frozen",
            xSplit: 2,
            ySplit: 5,
            topLeftCell: "C6",
            showGridLines: false,
          },
        ],
      });

      const columns = [
        { header: "NO", key: "no", width: 22 },
        { header: "PROGRAM KERJA", key: "programKerja", width: 55 },
        { header: "ALASAN PROGRAM", key: "alasanProgram", width: 55 },
        { header: "KLUSTER PROGRAM", key: "klusterProgram", width: 25 },
        { header: "OEM/NON OEM", key: "oemNonOem", width: 18 },
        { header: "DASAR INPUT PROGRAM", key: "dasarInputProgram", width: 32 },
        { header: "SASARAN RJPP", key: "sasaranRjpp", width: 35 },
        { header: "SUMBER ANGGARAN", key: "sumberAnggaran", width: 20 },
        { header: "EST LEVERING", key: "estLevering", width: 17 },
        {
          header: "LEVEL RESIKO INHERENT",
          key: "levelResikoInherent",
          width: 23,
        },
        {
          header: "LEVEL RISIKO RESIDUAL",
          key: "levelRisikoResidual",
          width: 23,
        },
        { header: "SAT", key: "sat", width: 12 },
        { header: "VOL", key: "vol", width: 12 },
        { header: "TAHUN", key: "tahun", width: 12 },
        { header: "HARGA TOTAL", key: "hargaTotal", width: 25 },
        { header: "FILE", key: "file", width: 25 },
        { header: "BIDANG", key: "bidang", width: 24 },
        { header: "KATEGORI", key: "kategori", width: 22 },
        { header: "HARGA MATERIAL", key: "hargaMaterial", width: 25 },
        { header: "HARGA JASA", key: "hargaJasa", width: 25 },
        { header: "TKDN", key: "tkdn", width: 18 },
        { header: "STRATEGIS RJPU", key: "strategisRjpu", width: 22 },
        { header: "ASET", key: "aset", width: 30 },
        { header: "DESCRIPTION ASET", key: "descriptionAset", width: 45 },
        { header: "KETERANGAN", key: "keterangan", width: 22 },
        { header: "PROFIL RISK", key: "profilRisk", width: 22 },
        { header: "AKTIVITAS AO", key: "aktivitasAo", width: 25 },
      ];

      sheet.columns = columns.map((col) => ({
        key: col.key,
        width: col.width,
      }));

      setupTitle(
        sheet,
        "RENCANA JANGKA PANJANG UNIT (RJPU)",
        "DATABASE PROGRAM KERJA DAN RENCANA ANGGARAN",
        27,
      );

      const HEADER_ROW = 5;
      const FIRST_DATA_ROW = 6;

      sheet.getRow(HEADER_ROW).values = columns.map((col) => col.header);

      styleHeader(sheet, HEADER_ROW, 27);

      // Warna khusus kelompok kolom anggaran
      ["O5", "S5"].forEach((address) => {
        sheet.getCell(address).fill = fill(COLORS.green);
      });

      sheet.getCell("T5").fill = fill(COLORS.purple);
      sheet.getCell("Y5").fill = fill(COLORS.amber);

      filtered.forEach((item, index) => {
        const rowNumber = FIRST_DATA_ROW + index;

        const values = columns.map((col) => {
          const value = item[col.key];

          if (["hargaTotal", "hargaMaterial", "hargaJasa"].includes(col.key)) {
            return toNumber(value);
          }

          if (["tahun", "vol", "estLevering"].includes(col.key)) {
            const raw = String(value ?? "").trim();

            if (raw !== "" && Number.isFinite(Number(raw))) {
              return Number(raw);
            }
          }

          return String(value ?? "");
        });

        const row = sheet.getRow(rowNumber);

        row.values = values;

        styleDataRow(row, 27, index);

        // Tinggi baris menyesuaikan isi program
        const estimatedLines = Math.max(
          Math.ceil(String(item.programKerja || "").length / 48),
          Math.ceil(String(item.alasanProgram || "").length / 48),
          Math.ceil(String(item.descriptionAset || "").length / 38),
          1,
        );

        row.height = Math.min(180, Math.max(34, estimatedLines * 16 + 8));

        // Kolom rata tengah
        [1, 5, 8, 9, 10, 11, 12, 13, 14, 18, 21, 22, 25, 26].forEach((col) => {
          row.getCell(col).alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
        });

        // Nomor program
        row.getCell(1).font = {
          name: "Calibri",
          size: 10,
          bold: true,
          color: { argb: COLORS.blue },
        };

        // Nama program
        row.getCell(2).font = {
          name: "Calibri",
          size: 11,
          bold: true,
          color: { argb: COLORS.text },
        };

        // Format Rupiah numerik
        [15, 19, 20].forEach((col) => {
          const cell = row.getCell(col);

          cell.numFmt = CURRENCY_FORMAT;

          cell.alignment = {
            horizontal: "right",
            vertical: "middle",
          };

          cell.font = {
            name: "Calibri",
            size: 11,
            bold: col === 15,
            color: {
              argb: col === 20 ? COLORS.purple : COLORS.green,
            },
          };
        });

        row.getCell(15).fill = fill(COLORS.greenLight);

        // Warna kategori
        const kategori = row.getCell(18);

        if (item.kategori === "Material") {
          kategori.fill = fill(COLORS.blueLight);
        } else if (item.kategori === "Jasa") {
          kategori.fill = fill(COLORS.purpleLight);
        } else if (item.kategori === "Material & Jasa") {
          kategori.fill = fill(COLORS.amberLight);
        }

        // Status program
        applyStatusColor(row.getCell(25), item.keterangan);

        // Hyperlink dokumen Google Drive
        if (item.file && /^https?:\/\//i.test(String(item.file))) {
          const fileCell = row.getCell(16);

          fileCell.value = {
            text: "Buka Dokumen",
            hyperlink: String(item.file),
            tooltip: String(item.file),
          };

          fileCell.font = {
            name: "Calibri",
            size: 10,
            underline: true,
            color: { argb: COLORS.sky },
          };

          fileCell.alignment = {
            horizontal: "center",
            vertical: "middle",
          };
        }
      });

      const lastDataRow = FIRST_DATA_ROW + filtered.length - 1;

      // Filter Excel
      sheet.autoFilter = {
        from: `A${HEADER_ROW}`,
        to: `AA${lastDataRow}`,
      };

      // Total anggaran
      const totalRowNumber = lastDataRow + 1;
      const totalRow = sheet.getRow(totalRowNumber);

      sheet.mergeCells(`A${totalRowNumber}:N${totalRowNumber}`);

      sheet.getCell(`A${totalRowNumber}`).value =
        `TOTAL ANGGARAN (${filtered.length} PROGRAM)`;

      const budgetColumns = [
        ["O", "hargaTotal"],
        ["S", "hargaMaterial"],
        ["T", "hargaJasa"],
      ];

      budgetColumns.forEach(([letter, field]) => {
        const cell = sheet.getCell(`${letter}${totalRowNumber}`);

        cell.value = {
          formula:
            `SUBTOTAL(109,${letter}${FIRST_DATA_ROW}:` +
            `${letter}${lastDataRow})`,
          result: sum(filtered, field),
        };

        cell.numFmt = CURRENCY_FORMAT;
      });

      styleTotal(totalRow, 27);

      sheet.pageSetup = {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        printTitlesRow: "1:5",
        margins: {
          left: 0.25,
          right: 0.25,
          top: 0.5,
          bottom: 0.5,
          header: 0.2,
          footer: 0.2,
        },
      };

      // ==========================================================
      // SHEET 2 : SUMMARY
      // ==========================================================

      const summary = workbook.addWorksheet("Summary", {
        properties: {
          tabColor: { argb: COLORS.green },
        },
        views: [{ showGridLines: false }],
      });

      summary.columns = [
        { width: 35 },
        { width: 25 },
        { width: 28 },
        { width: 28 },
        { width: 28 },
      ];

      setupTitle(
        summary,
        "EXECUTIVE SUMMARY RJPU",
        "Ringkasan program kerja dan anggaran",
        5,
      );

      const dataRange = (column) =>
        `'Data Program'!${column}${FIRST_DATA_ROW}:` +
        `${column}${lastDataRow}`;

      const summaryItems = [
        [
          "Total Program",
          {
            formula: `COUNTA(${dataRange("B")})`,
            result: filtered.filter(
              (p) => String(p.programKerja ?? "").trim() !== "",
            ).length,
          },
        ],
        [
          "Total Anggaran Material",
          {
            formula: `SUM(${dataRange("S")})`,
            result: sum(filtered, "hargaMaterial"),
          },
        ],
        [
          "Total Anggaran Jasa",
          {
            formula: `SUM(${dataRange("T")})`,
            result: sum(filtered, "hargaJasa"),
          },
        ],
        [
          "Total Anggaran RJPU",
          {
            formula: `SUM(${dataRange("O")})`,
            result: sum(filtered, "hargaTotal"),
          },
        ],
        [
          "Rata-rata Anggaran per Program",
          {
            formula: `IFERROR(B9/${filtered.length},0)`,
            result: sum(filtered, "hargaTotal") / filtered.length,
          },
        ],
      ];

      summary.getRow(5).values = ["INDIKATOR", "NILAI"];

      styleHeader(summary, 5, 2);

      summaryItems.forEach(([label, value], index) => {
        const row = summary.getRow(index + 6);

        row.values = [label, value];
        row.height = 30;

        styleDataRow(row, 2, index);

        if (index > 0) {
          row.getCell(2).numFmt = CURRENCY_FORMAT;
        }

        row.getCell(2).font = {
          name: "Calibri",
          size: 13,
          bold: true,
          color: { argb: COLORS.green },
        };

        row.getCell(2).alignment = {
          horizontal: "right",
          vertical: "middle",
        };
      });

      styleTotal(summary.getRow(9), 2);

      // ==================== REKAP STATUS ====================

      summary.mergeCells("A13:E13");

      summary.getCell("A13").value = "REKAP BERDASARKAN STATUS PROGRAM";

      styleHeader(summary, 13, 5);

      summary.getRow(14).values = [
        "STATUS PROGRAM",
        "JUMLAH PROGRAM",
        "ANGGARAN MATERIAL",
        "ANGGARAN JASA",
        "TOTAL ANGGARAN",
      ];

      styleHeader(summary, 14, 5);

      const statuses = [
        ...new Set(
          filtered.map(
            (item) =>
              String(item.keterangan ?? "").trim() || "Belum Ada Status",
          ),
        ),
      ].sort((a, b) => a.localeCompare(b, "id"));

      statuses.forEach((status, index) => {
        const items = filtered.filter(
          (item) =>
            (String(item.keterangan ?? "").trim() || "Belum Ada Status") ===
            status,
        );

        const row = summary.getRow(15 + index);

        row.values = [
          status,
          items.length,
          sum(items, "hargaMaterial"),
          sum(items, "hargaJasa"),
          sum(items, "hargaTotal"),
        ];

        styleDataRow(row, 5, index);

        applyStatusColor(row.getCell(1), status);

        [3, 4, 5].forEach((col) => {
          row.getCell(col).numFmt = CURRENCY_FORMAT;
        });
      });

      const statusTotalRow = summary.getRow(15 + statuses.length);

      statusTotalRow.values = [
        "TOTAL",
        filtered.length,
        sum(filtered, "hargaMaterial"),
        sum(filtered, "hargaJasa"),
        sum(filtered, "hargaTotal"),
      ];

      styleTotal(statusTotalRow, 5);

      [3, 4, 5].forEach((col) => {
        statusTotalRow.getCell(col).numFmt = CURRENCY_FORMAT;
      });

      // ==========================================================
      // SHEET 3 & 4 : REKAP BIDANG DAN TAHUN
      // ==========================================================

      const createRecapSheet = ({
        name,
        title,
        groupKey,
        groupLabel,
        tabColor,
      }) => {
        const recap = workbook.addWorksheet(name, {
          properties: {
            tabColor: { argb: tabColor },
          },
          views: [
            {
              state: "frozen",
              xSplit: 1,
              ySplit: 5,
              showGridLines: false,
            },
          ],
        });

        recap.columns = [
          { width: 32 },
          { width: 18 },
          { width: 18 },
          { width: 18 },
          { width: 18 },
          { width: 25 },
          { width: 25 },
          { width: 27 },
          { width: 19 },
          { width: 25 },
        ];

        setupTitle(
          recap,
          title,
          "Rekap jumlah program dan alokasi anggaran",
          10,
        );

        recap.getRow(5).values = [
          groupLabel,
          "TOTAL PROGRAM",
          "MATERIAL",
          "JASA",
          "MATERIAL & JASA",
          "ANGGARAN MATERIAL",
          "ANGGARAN JASA",
          "TOTAL ANGGARAN",
          "% ANGGARAN",
          "RATA-RATA / PROGRAM",
        ];

        styleHeader(recap, 5, 10);

        const groups = new Map();

        filtered.forEach((item) => {
          const key = String(item[groupKey] ?? "").trim() || "Belum Ditentukan";

          if (!groups.has(key)) {
            groups.set(key, []);
          }

          groups.get(key).push(item);
        });

        const entries = [...groups.entries()].sort(([a], [b]) =>
          a.localeCompare(b, "id", { numeric: true }),
        );

        const grandTotal = sum(filtered, "hargaTotal");

        entries.forEach(([group, items], index) => {
          const row = recap.getRow(index + 6);

          const totalMaterial = sum(items, "hargaMaterial");
          const totalJasa = sum(items, "hargaJasa");
          const totalAnggaran = sum(items, "hargaTotal");

          row.values = [
            group,
            items.length,
            items.filter((p) => p.kategori === "Material").length,
            items.filter((p) => p.kategori === "Jasa").length,
            items.filter((p) => p.kategori === "Material & Jasa").length,
            totalMaterial,
            totalJasa,
            totalAnggaran,
            grandTotal > 0 ? totalAnggaran / grandTotal : 0,
            items.length ? totalAnggaran / items.length : 0,
          ];

          row.height = 28;

          styleDataRow(row, 10, index);

          [6, 7, 8, 10].forEach((col) => {
            row.getCell(col).numFmt = CURRENCY_FORMAT;
          });

          row.getCell(9).numFmt = "0.00%";

          row.getCell(8).fill = fill(COLORS.greenLight);

          row.getCell(8).font = {
            name: "Calibri",
            size: 11,
            bold: true,
            color: { argb: COLORS.green },
          };
        });

        const lastRow = entries.length + 5;
        const totalRowNumber = lastRow + 1;
        const totalRow = recap.getRow(totalRowNumber);

        totalRow.getCell(1).value = "GRAND TOTAL";

        for (let col = 2; col <= 8; col++) {
          const letter = columnLetter(col);

          const cachedResult = entries.reduce(
            (acc, _, index) =>
              acc + toNumber(recap.getRow(index + 6).getCell(col).value),
            0,
          );

          totalRow.getCell(col).value = {
            formula: `SUM(${letter}6:${letter}${lastRow})`,
            result: cachedResult,
          };
        }

        totalRow.getCell(9).value = {
          formula: `SUM(I6:I${lastRow})`,
          result: grandTotal > 0 ? 1 : 0,
        };

        totalRow.getCell(10).value = {
          formula: `IFERROR(H${totalRowNumber}/B${totalRowNumber},0)`,
          result: grandTotal / filtered.length,
        };

        styleTotal(totalRow, 10);

        [6, 7, 8, 10].forEach((col) => {
          totalRow.getCell(col).numFmt = CURRENCY_FORMAT;
        });

        totalRow.getCell(9).numFmt = "0.00%";

        recap.autoFilter = {
          from: "A5",
          to: `J${lastRow}`,
        };

        return recap;
      };

      createRecapSheet({
        name: "Rekap Bidang",
        title: "REKAP ANGGARAN PER BIDANG",
        groupKey: "bidang",
        groupLabel: "BIDANG",
        tabColor: COLORS.purple,
      });

      createRecapSheet({
        name: "Rekap Tahunan",
        title: "REKAP ANGGARAN PER TAHUN",
        groupKey: "tahun",
        groupLabel: "TAHUN",
        tabColor: COLORS.amber,
      });

      // ==========================================================
      // GENERATE & DOWNLOAD EXCEL
      // ==========================================================

      workbook.calcProperties.fullCalcOnLoad = true;

      const buffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .format(new Date())
        .replace(/\//g, "-");

      saveAs(blob, `Laporan_RJPU_${date}.xlsx`);

      showToast(
        `Berhasil mengekspor ${filtered.length} program ke Excel`,
        "success",
      );
    } catch (error) {
      console.error("Error Export Excel:", error);

      showToast("Gagal mengekspor Excel: " + error.message, "error");
    } finally {
      setLoadingExport(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === "0") return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyShort = (amount) => {
    if (!amount || amount === 0) return "Rp 0";
    const num = parseFloat(amount);
    if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)}M`;
    if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(1)}JT`;
    if (num >= 1_000) return `Rp ${(num / 1_000).toFixed(1)}RB`;
    return formatCurrency(amount);
  };

  const getRiskColor = (risk) => {
    const c = {
      Rendah: "bg-emerald-100 text-emerald-700",
      Moderat: "bg-amber-100 text-amber-700",
      Tinggi: "bg-orange-100 text-orange-700",
      "Sangat Tinggi": "bg-red-100 text-red-700",
      Ekstrem: "bg-purple-100 text-purple-700",
    };
    return c[risk] || "bg-gray-100 text-gray-700";
  };

  const getRiskIcon = (risk) => {
    if (risk === "Rendah") return <FiCheck className="w-3 h-3" />;
    if (risk) return <FiAlertCircle className="w-3 h-3" />;
    return null;
  };

  const getYears = useMemo(() => {
    const years = [...new Set(programs.map((p) => p.tahun).filter(Boolean))];
    return ["all", ...years.sort().reverse()];
  }, [programs]);

  const getClusters = useMemo(() => {
    const clusters = [
      ...new Set(programs.map((p) => p.klusterProgram).filter(Boolean)),
    ];
    return ["all", ...clusters];
  }, [programs]);

  const filterBidangOptions = useMemo(
    () =>
      [
        ...new Set(
          programs.map((p) => String(p.bidang || "").trim()).filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b, "id")),
    [programs],
  );

  const filterKeteranganOptions = useMemo(() => {
    const existing = programs
      .map((p) => String(p.keterangan || "").trim())
      .filter(Boolean);
    return [...new Set([...keteranganOptions, ...existing])];
  }, [programs]);

  const getFilteredPrograms = useCallback(() => {
    let filtered = programs;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.programKerja?.toLowerCase().includes(term) ||
          p.klusterProgram?.toLowerCase().includes(term) ||
          p.tahun?.includes(term) ||
          p.sumberAnggaran?.toLowerCase().includes(term) ||
          p.bidang?.toLowerCase().includes(term) ||
          p.kategori?.toLowerCase().includes(term) ||
          p.aset?.toLowerCase().includes(term) ||
          p.strategisRjpu?.toLowerCase().includes(term) ||
          String(p.keterangan || "")
            .toLowerCase()
            .includes(term) ||
          String(p.profilRisk || "")
            .toLowerCase()
            .includes(term) ||
          String(p.aktivitasAo || "")
            .toLowerCase()
            .includes(term),
      );
    }
    if (filterYear !== "all")
      filtered = filtered.filter((p) => p.tahun === filterYear);
    if (filterCluster !== "all")
      filtered = filtered.filter((p) => p.klusterProgram === filterCluster);
    if (filterBidang !== "all")
      filtered = filtered.filter((p) =>
        filterBidang === "__empty__"
          ? !String(p.bidang || "").trim()
          : String(p.bidang || "").trim() === filterBidang,
      );
    if (filterKeterangan !== "all")
      filtered = filtered.filter((p) =>
        filterKeterangan === "__empty__"
          ? !String(p.keterangan || "").trim()
          : String(p.keterangan || "").trim() === filterKeterangan,
      );

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === "hargaTotal") {
          aVal = parseFloat(aVal) || 0;
          bVal = parseFloat(bVal) || 0;
        } else if (sortConfig.key === "tahun") {
          aVal = parseInt(aVal) || 0;
          bVal = parseInt(bVal) || 0;
        } else {
          aVal = String(aVal || "").toLowerCase();
          bVal = String(bVal || "").toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [
    programs,
    searchTerm,
    filterYear,
    filterCluster,
    filterBidang,
    filterKeterangan,
    sortConfig,
  ]);

  const filteredPrograms = getFilteredPrograms();
  const totalPages = Math.ceil(filteredPrograms.length / itemsPerPage);
  const paginatedPrograms = filteredPrograms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalAnggaran = useMemo(
    () =>
      filteredPrograms.reduce(
        (sum, p) => sum + (parseFloat(p.hargaTotal) || 0),
        0,
      ),
    [filteredPrograms],
  );

  const resetFilters = () => {
    setSearchTerm("");
    setFilterYear("all");
    setFilterCluster("all");
    setFilterBidang("all");
    setFilterKeterangan("all");
    setSelectedPrograms([]);
    setCurrentPage(1);
    setSortConfig({ key: "no", direction: "asc" });
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.3 },
    }),
  };

  const getYearBadgeColor = (year) => {
    const c = {
      2024: "bg-indigo-100 text-indigo-700",
      2025: "bg-purple-100 text-purple-700",
    };
    return c[year] || "bg-gray-100 text-gray-700";
  };

  const getKeteranganBadge = (status) => {
    const classes = {
      "Belum Dimulai": "bg-slate-100 text-slate-600",
      "On Progress": "bg-sky-100 text-sky-700",
      Diskusi: "bg-violet-100 text-violet-700",
      Lanjut: "bg-indigo-100 text-indigo-700",
      Ditunda: "bg-amber-100 text-amber-700",
      Selesai: "bg-emerald-100 text-emerald-700",
      Drop: "bg-red-100 text-red-700",
    };
    return classes[status] || "bg-gray-100 text-gray-600";
  };

  const getKategoriBadge = (kategori) => {
    const map = {
      Material: "bg-blue-100 text-blue-700",
      Jasa: "bg-purple-100 text-purple-700",
      "Material & Jasa": "bg-orange-100 text-orange-700",
    };
    return map[kategori] || "bg-gray-100 text-gray-600";
  };

  const LoadingOverlay = ({ message }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
    >
      <div className="bg-white rounded-[22px] p-6 flex flex-col items-center gap-4 shadow-xl">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-700 font-medium">{message}</p>
      </div>
    </motion.div>
  );

  // ==================== LOADING ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] p-0 text-slate-800">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-6 rounded-[26px] bg-[#101b34] px-5 py-6 md:px-7 md:py-7 shadow-[0_16px_38px_rgba(16,27,52,.13)]">
            <div>
              <div className="h-10 bg-gray-200 rounded w-48 animate-pulse mb-2" />
              <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="h-10 bg-gray-200 rounded-2xl w-32 animate-pulse" />
              <div className="h-10 bg-gray-200 rounded-2xl w-32 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
          </div>
          <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(15,23,42,0.035)] border border-slate-200/80 p-4 animate-pulse">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 h-11 bg-gray-200 rounded-2xl" />
              <div className="w-40 h-11 bg-gray-200 rounded-2xl" />
              <div className="w-48 h-11 bg-gray-200 rounded-2xl" />
              <div className="flex flex-wrap gap-3">
                <div className="w-24 h-11 bg-gray-200 rounded-2xl" />
                <div className="w-24 h-11 bg-gray-200 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(15,23,42,0.035)] border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {[...Array(13)].map((_, i) => (
                    <th key={i} className="px-4 py-4">
                      <div className="h-3 bg-gray-200 rounded w-12 animate-pulse" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <SkeletonTableRow key={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <div className="min-h-screen bg-[#f5f7fb] p-0 text-slate-800">
      <AnimatePresence>
        {(loadingSave ||
          loadingDelete ||
          loadingBulkDelete ||
          loadingExport ||
          loadingUpload) && (
          <LoadingOverlay
            message={
              loadingSave
                ? "Menyimpan data..."
                : loadingDelete
                  ? "Menghapus program..."
                  : loadingBulkDelete
                    ? "Menghapus program massal..."
                    : loadingExport
                      ? "Mengekspor data..."
                      : "Mengunggah file..."
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-20 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg ${
              toast.type === "success"
                ? "bg-emerald-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <FiCheck size={18} />
            ) : (
              <FiAlertCircle size={18} />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdmin && showDeleteConfirm && programToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !loadingDelete && setShowDeleteConfirm(false)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-[22px] max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <FiAlertTriangle className="text-amber-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                      Konfirmasi Hapus
                    </h3>
                    <p className="text-slate-500 text-sm">
                      Program akan dipindahkan ke arsip Drop
                    </p>
                  </div>
                </div>
                <div className="mb-6">
                  <p className="text-slate-600 mb-2">
                    Apakah Anda yakin ingin menghapus program berikut?
                  </p>
                  <div className="bg-red-50 rounded-2xl p-3 border border-red-200">
                    <p className="font-semibold text-slate-900">
                      {programToDelete.programName}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      No. {programToDelete.no}
                    </p>
                  </div>
                </div>
                <div className="bg-amber-50 rounded-2xl p-3 mb-6">
                  <div className="flex items-start gap-2">
                    <FiInfo className="text-amber-600 text-sm mt-0.5" />
                    <p className="text-xs text-amber-700">
                      Data akan dipindahkan ke sheet <strong>"Drop"</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={loadingDelete}
                    className="px-4 py-2 border border-slate-200 rounded-2xl hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={executeDelete}
                    disabled={loadingDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl hover:shadow-md transition disabled:opacity-50"
                  >
                    {loadingDelete ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <FiTrash2 size={16} /> Hapus Program
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-6 rounded-[26px] bg-[#101b34] px-5 py-6 md:px-7 md:py-7 shadow-[0_16px_38px_rgba(16,27,52,.13)]">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Program Data
            </h1>
            <p className="text-slate-300 mt-1">
              Kelola dan monitor semua program kerja
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() =>
                setViewMode(viewMode === "table" ? "grid" : "table")
              }
              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white border border-white/20 rounded-2xl shadow-sm hover:bg-white/20 transition-all"
            >
              {viewMode === "table" ? (
                <FiGrid size={18} />
              ) : (
                <FiList size={18} />
              )}
              <span className="hidden sm:inline">
                {viewMode === "table" ? "Grid View" : "Table View"}
              </span>
            </button>
            {isAdmin && (
              <button
                onClick={() => (window.location.href = "/dashboard/drop-data")}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-2xl shadow-sm hover:shadow-md transition-all"
              >
                <FiArchive size={18} />{" "}
                <span className="hidden sm:inline">Program Drop</span>
              </button>
            )}
            {isAdmin && selectedPrograms.length > 0 && (
              <motion.button
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                onClick={() => setShowBulkDelete(true)}
                disabled={loadingBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-2xl shadow-sm hover:shadow-md transition-all disabled:opacity-50"
              >
                <FiTrash2 size={18} />{" "}
                <span>Hapus ({selectedPrograms.length})</span>
              </motion.button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <motion.div
            whileHover={{ y: -4 }}
            className="group relative bg-white rounded-[22px] border border-slate-200/80 shadow-[0_4px_24px_rgba(15,23,42,0.035)] hover:shadow-[0_12px_35px_rgba(15,23,42,0.09)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg">
                  <FiFolder className="text-white text-xl" />
                </div>
                <div className="text-right">
                  <div className="text-2xl md:text-3xl font-bold text-sky-700">
                    {filteredPrograms.length}
                  </div>
                </div>
              </div>
              <h3 className="text-slate-700 font-semibold mb-1">
                Total Program
              </h3>
              <p className="text-xs text-slate-400">Semua program kerja</p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="group relative bg-white rounded-[22px] border border-slate-200/80 shadow-[0_4px_24px_rgba(15,23,42,0.035)] hover:shadow-[0_12px_35px_rgba(15,23,42,0.09)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-[#0f766e] to-[#0d9488] shadow-lg">
                  <FiDollarSign className="text-white text-xl" />
                </div>
                <div className="text-right">
                  <div className="text-xl md:text-2xl font-bold text-emerald-600 break-words max-w-[150px] md:max-w-[180px]">
                    {formatCurrencyShort(totalAnggaran)}
                  </div>
                </div>
              </div>
              <h3 className="text-slate-700 font-semibold mb-1">
                Total Anggaran
              </h3>
              <p className="text-xs text-slate-400">Material + Jasa</p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="group relative bg-white rounded-[22px] border border-slate-200/80 shadow-[0_4px_24px_rgba(15,23,42,0.035)] hover:shadow-[0_12px_35px_rgba(15,23,42,0.09)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
                  <FiCalendar className="text-white text-xl" />
                </div>
                <div className="text-right">
                  <div className="text-2xl md:text-3xl font-bold text-purple-600">
                    {getYears.filter((y) => y !== "all").length}
                  </div>
                </div>
              </div>
              <h3 className="text-slate-700 font-semibold mb-1">Tahun Aktif</h3>
              <p className="text-xs text-slate-400">Periode program</p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="group relative bg-white rounded-[22px] border border-slate-200/80 shadow-[0_4px_24px_rgba(15,23,42,0.035)] hover:shadow-[0_12px_35px_rgba(15,23,42,0.09)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                  <FiTrendingUp className="text-white text-xl" />
                </div>
                <div className="text-right">
                  <div className="text-2xl md:text-3xl font-bold text-orange-600">
                    {getClusters.filter((c) => c !== "all").length}
                  </div>
                </div>
              </div>
              <h3 className="text-slate-700 font-semibold mb-1">
                Kluster Program
              </h3>
              <p className="text-xs text-slate-400">Kategori program</p>
            </div>
          </motion.div>
        </div>

        <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(15,23,42,0.035)] border border-slate-200/80 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari program, bidang, status, aset, strategi..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                  setSelectedPrograms([]);
                }}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
              />
            </div>
            <select
              value={filterYear}
              onChange={(e) => {
                setFilterYear(e.target.value);
                setCurrentPage(1);
                setSelectedPrograms([]);
              }}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="all">Semua Tahun</option>
              {getYears
                .filter((y) => y !== "all")
                .map((year) => (
                  <option key={year} value={year}>
                    Tahun {year}
                  </option>
                ))}
            </select>
            <select
              value={filterCluster}
              onChange={(e) => {
                setFilterCluster(e.target.value);
                setCurrentPage(1);
                setSelectedPrograms([]);
              }}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="all">Semua Kluster</option>
              {getClusters
                .filter((c) => c !== "all")
                .map((cluster) => (
                  <option key={cluster} value={cluster}>
                    {cluster}
                  </option>
                ))}
            </select>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"
              >
                <FiRefreshCw size={16} />{" "}
                <span className="hidden sm:inline">Reset</span>
              </button>
              <button
                onClick={handleExport}
                disabled={loadingExport}
                className="flex items-center gap-2 px-4 py-2.5 border border-emerald-500 text-emerald-600 rounded-2xl hover:bg-emerald-50 transition-all disabled:opacity-50"
              >
                {loadingExport ? (
                  <>
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <FiDownload size={16} /> Export
                  </>
                )}
              </button>
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1e4f91] to-[#2563eb] text-white rounded-2xl hover:shadow-lg transition-all"
              >
                <FiPlus size={18} /> <span>Tambah</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label
                htmlFor="filter-bidang"
                className="block text-xs font-semibold text-slate-500 mb-1"
              >
                Filter Bidang
              </label>
              <select
                id="filter-bidang"
                value={filterBidang}
                onChange={(e) => {
                  setFilterBidang(e.target.value);
                  setCurrentPage(1);
                  setSelectedPrograms([]);
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="all">Semua Bidang</option>
                {programs.some((p) => !String(p.bidang || "").trim()) && (
                  <option value="__empty__">Tanpa Bidang</option>
                )}
                {filterBidangOptions.map((bidang) => (
                  <option key={bidang} value={bidang}>
                    {bidang}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="filter-keterangan"
                className="block text-xs font-semibold text-slate-500 mb-1"
              >
                Filter Keterangan / Status
              </label>
              <select
                id="filter-keterangan"
                value={filterKeterangan}
                onChange={(e) => {
                  setFilterKeterangan(e.target.value);
                  setCurrentPage(1);
                  setSelectedPrograms([]);
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="all">Semua Status</option>
                {programs.some((p) => !String(p.keterangan || "").trim()) && (
                  <option value="__empty__">Belum Ada Status</option>
                )}
                {filterKeteranganOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(searchTerm ||
            filterYear !== "all" ||
            filterCluster !== "all" ||
            filterBidang !== "all" ||
            filterKeterangan !== "all") && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <FiFilter size={14} />{" "}
              <span>Ditemukan {filteredPrograms.length} program</span>
              <button
                onClick={resetFilters}
                className="text-sky-700 hover:underline"
              >
                Hapus filter
              </button>
            </div>
          )}
        </div>
      </div>

      {filteredPrograms.length === 0 ? (
        <div className="bg-white rounded-[22px] p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiFileText className="text-3xl text-slate-400" />
          </div>
          <p className="text-slate-500">Tidak ada data program</p>
          {canEdit && (
            <button
              onClick={handleAdd}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-2xl"
            >
              Tambah Program Pertama
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(15,23,42,0.035)] border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {isAdmin && (
                    <th className="px-4 py-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedPrograms.length ===
                            paginatedPrograms.length &&
                          paginatedPrograms.length > 0
                        }
                        onChange={toggleSelectAll}
                        disabled={loadingBulkDelete}
                        className="w-4 h-4 rounded border-gray-300 text-sky-700 focus:ring-sky-400"
                      />
                    </th>
                  )}
                  <th
                    className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => requestSort("no")}
                  >
                    <div className="flex items-center">
                      No {getSortIcon("no")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => requestSort("programKerja")}
                  >
                    <div className="flex items-center">
                      Program Kerja {getSortIcon("programKerja")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => requestSort("keterangan")}
                  >
                    <div className="flex items-center">
                      Keterangan / Status {getSortIcon("keterangan")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => requestSort("kategori")}
                  >
                    <div className="flex items-center">
                      Kategori {getSortIcon("kategori")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => requestSort("bidang")}
                  >
                    <div className="flex items-center">
                      Bidang {getSortIcon("bidang")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => requestSort("aset")}
                  >
                    <div className="flex items-center">
                      Aset {getSortIcon("aset")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => requestSort("hargaTotal")}
                  >
                    <div className="flex items-center justify-end">
                      Total {getSortIcon("hargaTotal")}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => requestSort("tahun")}
                  >
                    <div className="flex items-center justify-center">
                      Tahun {getSortIcon("tahun")}
                    </div>
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {paginatedPrograms.map((program, idx) => (
                    <motion.tr
                      key={program.no}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-sky-50/30 transition-all duration-200 group"
                    >
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedPrograms.includes(program.no)}
                            onChange={() => toggleSelectProgram(program.no)}
                            disabled={loadingBulkDelete}
                            className="w-4 h-4 rounded border-gray-300 text-sky-700 focus:ring-sky-400 disabled:opacity-50"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 text-sm">
                          {program.no}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {program.programKerja}
                        </div>
                        {program.alasanProgram && (
                          <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {program.alasanProgram}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          title={program.keterangan || "Belum Ada Status"}
                          className={`inline-block max-w-[180px] truncate align-middle px-2 py-1 text-xs font-semibold rounded-lg ${getKeteranganBadge(program.keterangan)}`}
                        >
                          {program.keterangan || "Belum Ada Status"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg ${getKategoriBadge(program.kategori)}`}
                        >
                          {program.kategori || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">
                          {program.bidang || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-700">
                          {program.aset || "-"}
                        </div>
                        {program.descriptionAset && (
                          <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {program.descriptionAset}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-emerald-600">
                          {formatCurrencyShort(program.hargaTotal)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-bold rounded-lg ${getYearBadgeColor(program.tahun)}`}
                        >
                          {program.tahun || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleViewDetail(program)}
                            className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition"
                            title="Detail"
                          >
                            <FiEye size={15} />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => handleEdit(program)}
                              disabled={loadingSave}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition disabled:opacity-50"
                              title="Edit"
                            >
                              <FiEdit2 size={15} />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() =>
                                confirmDelete(program.no, program.programKerja)
                              }
                              disabled={loadingDelete}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                              title="Hapus"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <div className="flex flex-col sm:flex-row items-center gap-3 text-sm text-slate-500 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span>Tampilkan</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                </select>
                <span>baris</span>
              </div>
              <div className="hidden sm:block border-l border-slate-300 h-4 mx-1"></div>
              <div>
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{" "}
                {Math.min(currentPage * itemsPerPage, filteredPrograms.length)}{" "}
                dari {filteredPrograms.length} data
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition"
              >
                <FiChevronLeft size={16} /> Prev
              </button>
              <div className="flex gap-1">
                {[...Array(Math.min(5, totalPages || 1))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2)
                    pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  if (pageNum < 1 || pageNum > totalPages) return null;
                  return (
                    <button
                      key={`page-${pageNum}`}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-9 h-9 text-sm rounded-lg transition ${currentPage === pageNum ? "bg-blue-600 text-white shadow-sm" : "hover:bg-gray-200"}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || totalPages === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition"
              >
                Next <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {paginatedPrograms.map((program, idx) => (
              <motion.div
                key={program.no}
                custom={idx}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -4 }}
                className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(15,23,42,0.035)] border border-slate-200/80 overflow-hidden hover:shadow-md transition-all relative"
              >
                {isAdmin && (
                  <div className="absolute top-3 left-3 z-10">
                    <input
                      type="checkbox"
                      checked={selectedPrograms.includes(program.no)}
                      onChange={() => toggleSelectProgram(program.no)}
                      disabled={loadingBulkDelete}
                      className="w-4 h-4 rounded border-gray-300 text-sky-700 focus:ring-sky-400 disabled:opacity-50"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-medium text-slate-400">
                      {program.no}
                    </span>
                    {program.levelResikoInherent && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${getRiskColor(program.levelResikoInherent)}`}
                      >
                        {getRiskIcon(program.levelResikoInherent)}
                        {program.levelResikoInherent}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                    {program.programKerja}
                  </h3>
                  {program.alasanProgram && (
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                      {program.alasanProgram}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-lg font-semibold ${getKeteranganBadge(program.keterangan)}`}
                    >
                      {program.keterangan || "Belum Ada Status"}
                    </span>
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-lg ${getKategoriBadge(program.kategori)}`}
                    >
                      {program.kategori || "-"}
                    </span>
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-lg ${getYearBadgeColor(program.tahun)}`}
                    >
                      {program.tahun || "-"}
                    </span>
                    {program.bidang && (
                      <span className="inline-flex px-2 py-1 text-xs rounded-lg bg-slate-100 text-slate-700">
                        {program.bidang}
                      </span>
                    )}
                    {program.aset && (
                      <span className="inline-flex px-2 py-1 text-xs rounded-lg bg-amber-50 text-amber-700">
                        {program.aset}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-sm font-bold text-emerald-600">
                      {formatCurrencyShort(program.hargaTotal)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleViewDetail(program)}
                        className="p-1.5 text-slate-400 hover:text-sky-700 rounded-lg transition"
                        title="Detail"
                      >
                        <FiEye size={14} />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(program)}
                          disabled={loadingSave}
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg transition disabled:opacity-50"
                          title="Edit"
                        >
                          <FiEdit2 size={14} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() =>
                            confirmDelete(program.no, program.programKerja)
                          }
                          disabled={loadingDelete}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition disabled:opacity-50"
                          title="Hapus"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {viewMode === "grid" && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-6 py-4 bg-white rounded-[22px] shadow-[0_4px_24px_rgba(15,23,42,0.035)] border border-slate-200/80">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-sm text-slate-500 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span>Tampilkan</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
              <span>baris</span>
            </div>
            <div className="hidden sm:block border-l border-slate-300 h-4 mx-1"></div>
            <div>
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(currentPage * itemsPerPage, filteredPrograms.length)}{" "}
              dari {filteredPrograms.length} data
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              <FiChevronLeft size={16} /> Prev
            </button>
            <div className="flex gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2)
                  pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                if (pageNum < 1 || pageNum > totalPages) return null;
                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 text-sm rounded-lg transition ${currentPage === pageNum ? "bg-blue-600 text-white shadow-sm" : "hover:bg-gray-100"}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              Next <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isAdmin && showBulkDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !loadingBulkDelete && setShowBulkDelete(false)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-[22px] max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <FiTrash2 className="text-red-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                      Hapus Massal
                    </h3>
                    <p className="text-slate-500 text-sm">
                      Anda akan menghapus {selectedPrograms.length} program
                    </p>
                  </div>
                </div>
                <div className="bg-amber-50 rounded-2xl p-3 mb-6">
                  <div className="flex items-start gap-2">
                    <FiInfo className="text-amber-600 text-sm mt-0.5" />
                    <p className="text-xs text-amber-700">
                      Data akan dipindahkan ke sheet <strong>"Drop"</strong>{" "}
                      dengan keterangan <strong>DROP</strong> dan timestamp.
                    </p>
                  </div>
                </div>
                <p className="text-slate-600 mb-6">
                  Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin?
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() =>
                      !loadingBulkDelete && setShowBulkDelete(false)
                    }
                    disabled={loadingBulkDelete}
                    className="px-4 py-2 border border-slate-200 rounded-2xl hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={loadingBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl hover:shadow-md transition disabled:opacity-50"
                  >
                    {loadingBulkDelete ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <FiTrash2 size={16} /> Hapus Semua
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedProgram && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-[22px] max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-[#1e4f91] to-[#2563eb] px-6 py-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                    <FiInfo className="text-white text-xl" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    Detail Program
                  </h2>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition text-white"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <span className="text-xs text-slate-400">
                        Nomor Program
                      </span>
                      <p className="text-2xl font-bold text-slate-900">
                        {selectedProgram.no}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {selectedProgram.tahun && (
                        <span
                          className={`inline-flex px-3 py-1.5 text-sm font-bold rounded-lg ${getYearBadgeColor(selectedProgram.tahun)}`}
                        >
                          <FiCalendar className="mr-1" />{" "}
                          {selectedProgram.tahun}
                        </span>
                      )}
                      {selectedProgram.kategori && (
                        <span
                          className={`inline-flex px-3 py-1.5 text-sm font-bold rounded-lg ${getKategoriBadge(selectedProgram.kategori)}`}
                        >
                          {selectedProgram.kategori}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Program Kerja
                  </label>
                  <p className="text-lg font-semibold text-slate-900 mt-1">
                    {selectedProgram.programKerja}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Kluster Program
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedProgram.klusterProgram || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      OEM / NON OEM
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedProgram.oemNonOem || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Dasar Input Program
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedProgram.dasarInputProgram || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Sasaran RJPP
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedProgram.sasaranRjpp || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Sumber Anggaran
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedProgram.sumberAnggaran || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      EST Levering
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedProgram.estLevering || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Level Resiko Inherent
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedProgram.levelResikoInherent || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Level Risiko Residual
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedProgram.levelRisikoResidual || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      SAT / VOL
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedProgram.sat || "-"} /{" "}
                      {selectedProgram.vol || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Bidang
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedProgram.bidang || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Harga Material
                    </label>
                    <p className="font-bold text-blue-600 mt-1">
                      {parseFloat(selectedProgram.hargaMaterial) > 0
                        ? formatCurrency(selectedProgram.hargaMaterial)
                        : "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Harga Jasa
                    </label>
                    <p className="font-bold text-purple-600 mt-1">
                      {parseFloat(selectedProgram.hargaJasa) > 0
                        ? formatCurrency(selectedProgram.hargaJasa)
                        : "-"}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-3 md:col-span-2">
                    <label className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                      Harga Total
                    </label>
                    <p className="font-bold text-emerald-700 mt-1 text-xl">
                      {formatCurrency(selectedProgram.hargaTotal)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      TKDN
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedProgram.tkdn || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Strategis RJPU
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedProgram.strategisRjpu
                        ? `${selectedProgram.strategisRjpu} — ${strategis.find((s) => s.kodeAwal === selectedProgram.strategisRjpu)?.strategicInitiatives || ""}`
                        : "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Aset
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedProgram.aset || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Deskripsi Aset
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedProgram.descriptionAset || "-"}
                    </p>
                  </div>

                  {selectedProgram.sumberAnggaran === "AO" &&
                    selectedProgram.aktivitasAo && (
                      <div className="bg-indigo-50 rounded-2xl p-3 md:col-span-2">
                        <label className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                          Aktivitas AO
                        </label>
                        <p className="font-medium text-indigo-900 mt-1">
                          {selectedProgram.aktivitasAo}
                        </p>
                      </div>
                    )}
                </div>

                {selectedProgram.alasanProgram && (
                  <div className="mb-5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Alasan Program
                    </label>
                    <p className="text-slate-600 mt-1 p-3 bg-sky-50 rounded-2xl">
                      {selectedProgram.alasanProgram}
                    </p>
                  </div>
                )}

                <div className="mb-5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Profile Risk
                  </label>
                  <p className="text-slate-600 mt-1 p-3 bg-sky-50 rounded-2xl">
                    {selectedProgram.profilRisk
                      ? profilRiskOptions.find(
                          (opt) => opt.value === selectedProgram.profilRisk,
                        )?.label || selectedProgram.profilRisk
                      : "-"}
                  </p>
                </div>

                <div className="mb-5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Keterangan / Status Program
                  </label>
                  <div className="mt-2">
                    <span
                      className={`inline-flex px-3 py-1.5 text-sm font-semibold rounded-lg ${getKeteranganBadge(selectedProgram.keterangan)}`}
                    >
                      {selectedProgram.keterangan || "Belum Ada Status"}
                    </span>
                  </div>
                </div>

                {selectedProgram.file && (
                  <div className="mb-5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      File Link
                    </label>
                    <div className="mt-1">
                      <a
                        href={selectedProgram.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sky-700 hover:text-sky-800 break-all"
                      >
                        <FiExternalLink size={16} />
                        {selectedProgram.file}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-2xl hover:bg-slate-50 transition"
                >
                  Tutup
                </button>
                {canEdit && (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleEdit(selectedProgram);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1e4f91] to-[#2563eb] text-white rounded-2xl hover:shadow-md transition"
                  >
                    <FiEdit2 size={16} /> Edit Program
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            //onClick={() => !loadingSave && setShowModal(false)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-[22px] max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-[#1e4f91] to-[#2563eb] px-6 py-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                    {editingProgram ? (
                      <FiEdit2 className="text-white text-xl" />
                    ) : (
                      <FiPlus className="text-white text-xl" />
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {editingProgram ? "Edit Program" : "Tambah Program Baru"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!loadingSave && !loadingUpload) {
                      setShowModal(false);
                    }
                  }}
                  disabled={loadingSave || loadingUpload}
                  className="p-1 hover:bg-white/20 rounded-lg transition text-white disabled:opacity-50"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      Program Kerja <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.programKerja || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          programKerja: e.target.value,
                        })
                      }
                      disabled={loadingSave}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                      placeholder="Masukkan nama program kerja"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      Alasan Program
                    </label>
                    <textarea
                      value={formData.alasanProgram || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          alasanProgram: e.target.value,
                        })
                      }
                      disabled={loadingSave}
                      rows="3"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                      placeholder="Jelaskan alasan program ini diperlukan"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label
                        htmlFor="program-profile-risk"
                        className="block text-sm font-semibold text-slate-700"
                      >
                        Profile Risk
                      </label>
                      <button
                        type="button"
                        onClick={refreshProfilRisk}
                        disabled={loadingSave || loadingProfilRisk}
                        className="inline-flex items-center gap-1 text-xs text-sky-700 hover:text-sky-900 disabled:opacity-50"
                        title="Muat ulang daftar dari sheet Profile_Risk"
                      >
                        <FiRefreshCw
                          size={13}
                          className={loadingProfilRisk ? "animate-spin" : ""}
                        />{" "}
                        Muat ulang
                      </button>
                    </div>
                    <select
                      id="program-profile-risk"
                      value={formData.profilRisk || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          profilRisk: e.target.value,
                        }))
                      }
                      disabled={loadingSave || loadingProfilRisk}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                    >
                      <option value="">
                        {loadingProfilRisk
                          ? "Memuat Profile Risk..."
                          : profilRiskOptions.length === 0
                            ? "Tidak ada data Profile Risk"
                            : "Pilih Profile Risk"}
                      </option>
                      {formData.profilRisk &&
                        !profilRiskOptions.some(
                          (opt) => opt.value === formData.profilRisk,
                        ) && (
                          <option value={formData.profilRisk}>
                            {formData.profilRisk} (tersimpan)
                          </option>
                        )}
                      {profilRiskOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Sumber: Profile_Risk (No Profile Risk — Keterangan). Nomor
                      akan disimpan ke kolom Z.
                    </p>
                    {profilRiskError && (
                      <p className="text-xs text-red-600 mt-1" role="alert">
                        {profilRiskError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      Kluster Program
                    </label>
                    <select
                      value={formData.klusterProgram || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          klusterProgram: e.target.value,
                        })
                      }
                      disabled={loadingSave}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                    >
                      <option value="">Pilih Kluster</option>
                      {klusterOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      OEM / NON OEM
                    </label>
                    <select
                      value={formData.oemNonOem || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, oemNonOem: e.target.value })
                      }
                      disabled={loadingSave}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                    >
                      <option value="">Pilih OEM/NON OEM</option>
                      {oemOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      Dasar Input Program
                    </label>
                    <select
                      value={formData.dasarInputProgram || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dasarInputProgram: e.target.value,
                        })
                      }
                      disabled={loadingSave}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                    >
                      <option value="">Pilih Dasar Input Program</option>
                      {dasarInputProgramOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      Sasaran RJPP
                    </label>
                    <select
                      value={formData.sasaranRjpp || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sasaranRjpp: e.target.value,
                        })
                      }
                      disabled={loadingSave}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                    >
                      <option value="">Pilih Sasaran RJPP</option>
                      {sasaranRjppOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      Sumber Anggaran
                    </label>
                    <select
                      value={formData.sumberAnggaran || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sumberAnggaran: e.target.value,
                          aktivitasAo: "",
                        })
                      }
                      disabled={loadingSave}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                    >
                      <option value="">Pilih Sumber Anggaran</option>
                      {sumberAnggaranOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.sumberAnggaran === "AO" && (
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-indigo-700">
                        Aktivitas AO <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.aktivitasAo || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            aktivitasAo: e.target.value,
                          })
                        }
                        disabled={loadingSave}
                        className="w-full px-4 py-2.5 border border-indigo-200 bg-indigo-50/30 rounded-2xl focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                      >
                        <option value="">Pilih Aktivitas AO</option>
                        {aktivitasAoOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      EST Levering (Bulan)
                    </label>
                    <input
                      value={formData.estLevering || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estLevering: e.target.value,
                        })
                      }
                      disabled={loadingSave}
                      type="number"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                      placeholder="EST Levering"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      Level Resiko Inherent
                    </label>
                    <select
                      value={formData.levelResikoInherent || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          levelResikoInherent: e.target.value,
                        })
                      }
                      disabled={loadingSave}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                    >
                      <option value="">Pilih Level</option>
                      {riskOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      Level Risiko Residual
                    </label>
                    <select
                      value={formData.levelRisikoResidual || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          levelRisikoResidual: e.target.value,
                        })
                      }
                      disabled={loadingSave}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                    >
                      <option value="">Pilih Level</option>
                      {riskOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      SAT
                    </label>
                    <input
                      type="text"
                      value={formData.sat || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, sat: e.target.value })
                      }
                      disabled={loadingSave}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                      placeholder="Satuan"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      VOL
                    </label>
                    <input
                      type="text"
                      value={formData.vol || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, vol: e.target.value })
                      }
                      disabled={loadingSave}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                      placeholder="Volume"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      Tahun <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.tahun || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, tahun: e.target.value })
                      }
                      disabled={loadingSave}
                      placeholder="2024"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      Bidang
                    </label>
                    <select
                      value={formData.bidang || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, bidang: e.target.value })
                      }
                      disabled={loadingSave}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                    >
                      <option value="">Pilih Bidang</option>
                      {bidangOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      Kategori <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {kategoriOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleKategoriChange(opt)}
                          disabled={loadingSave}
                          className={`px-3 py-2 rounded-2xl border text-sm font-medium transition ${formData.kategori === opt ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"} disabled:opacity-50`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(formData.kategori === "Material" ||
                    formData.kategori === "Material & Jasa") && (
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-blue-700">
                        Harga Material (Rp){" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="text"
                        inputMode="numeric"
                        value={
                          formData.hargaMaterial !== "" &&
                          formData.hargaMaterial != null
                            ? new Intl.NumberFormat("id-ID", {
                                style: "currency",
                                currency: "IDR",
                                maximumFractionDigits: 0,
                              }).format(formData.hargaMaterial)
                            : ""
                        }
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\D/g, "");

                          setFormData((prev) => ({
                            ...prev,
                            hargaMaterial:
                              rawValue === "" ? "" : Number(rawValue),
                          }));
                        }}
                        disabled={loadingSave}
                        className="w-full px-4 py-2.5 border border-blue-200 rounded-2xl focus:ring-2 focus:ring-blue-400 transition disabled:bg-gray-100 disabled:opacity-50"
                        placeholder="Rp 0"
                      />
                    </div>
                  )}

                  {(formData.kategori === "Jasa" ||
                    formData.kategori === "Material & Jasa") && (
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-purple-700">
                        Harga Jasa (Rp) <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="text"
                        inputMode="numeric"
                        value={
                          formData.hargaJasa !== "" &&
                          formData.hargaJasa != null
                            ? new Intl.NumberFormat("id-ID", {
                                style: "currency",
                                currency: "IDR",
                                maximumFractionDigits: 0,
                              }).format(formData.hargaJasa)
                            : ""
                        }
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\D/g, "");

                          setFormData((prev) => ({
                            ...prev,
                            hargaJasa: rawValue === "" ? "" : Number(rawValue),
                          }));
                        }}
                        disabled={loadingSave}
                        className="w-full px-4 py-2.5 border border-purple-200 rounded-2xl focus:ring-2 focus:ring-purple-400 transition disabled:bg-gray-100 disabled:opacity-50"
                        placeholder="Rp 0"
                      />
                    </div>
                  )}

                  {/* Tahun Harga Referensi + eskalasi inflasi */}
                  <div className="md:col-span-2">
                    <label
                      htmlFor="tahun-referensi-harga"
                      className="block text-sm font-semibold mb-1 text-slate-700"
                    >
                      Tahun Harga Referensi{" "}
                      <span className="text-xs font-normal text-slate-400">
                        (inflasi{" "}
                        {(INFLASI_PER_TAHUN * 100).toFixed(1).replace(".", ",")}
                        % per tahun)
                      </span>
                    </label>
                    <select
                      id="tahun-referensi-harga"
                      value={formData.tahunReferensiHarga || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tahunReferensiHarga: e.target.value,
                        }))
                      }
                      disabled={loadingSave}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                    >
                      <option value="">
                        Tanpa eskalasi (harga sudah final)
                      </option>
                      {formData.tahunReferensiHarga &&
                        !tahunReferensiOptions.includes(
                          formData.tahunReferensiHarga,
                        ) && (
                          <option value={formData.tahunReferensiHarga}>
                            {formData.tahunReferensiHarga}
                          </option>
                        )}
                      {tahunReferensiOptions.map((y) => (
                        <option key={y} value={y}>
                          Harga tahun {y}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Harga Material dan Jasa di atas dianggap harga pada tahun
                      referensi, lalu dinaikkan per tahun sampai tahun program (
                      {formData.tahun || "-"}).
                    </p>
                    {pricing.invalidRef && (
                      <p className="text-xs text-red-600 mt-1" role="alert">
                        Tahun referensi tidak boleh lebih besar dari tahun
                        program.
                      </p>
                    )}
                    {editingProgram && pricing.active && (
                      <p className="text-xs text-amber-600 mt-1">
                        Mode edit: nilai harga di atas akan diperlakukan sebagai
                        harga {pricing.ref} dan menggantikan harga tersimpan.
                        Kosongkan pilihan ini jika hanya mengubah data lain.
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      Harga Total (Otomatis)
                    </label>
                    {pricing.active && (
                      <div className="mb-2 rounded-2xl border border-sky-100 bg-sky-50 p-3 text-xs text-slate-600 space-y-1">
                        <div className="font-semibold text-sky-700">
                          Eskalasi {pricing.ref} → {formData.tahun} (
                          {pricing.selisih} tahun, faktor{" "}
                          {pricing.faktor.toFixed(4).replace(".", ",")})
                        </div>
                        {pricing.hM > 0 && (
                          <div className="flex justify-between gap-3">
                            <span>Material</span>
                            <span>
                              {formatCurrency(pricing.hM)} →{" "}
                              <strong>{formatCurrency(pricing.adjM)}</strong>
                            </span>
                          </div>
                        )}
                        {pricing.hJ > 0 && (
                          <div className="flex justify-between gap-3">
                            <span>Jasa</span>
                            <span>
                              {formatCurrency(pricing.hJ)} →{" "}
                              <strong>{formatCurrency(pricing.adjJ)}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="w-full px-4 py-2.5 border border-emerald-200 bg-emerald-50 rounded-2xl text-emerald-800 font-bold">
                      {formatCurrency(computedHargaTotal)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      TKDN
                    </label>
                    <select
                      value={formData.tkdn || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, tkdn: e.target.value })
                      }
                      disabled={loadingSave}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                    >
                      <option value="">Pilih TKDN</option>
                      {tkdnOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      Strategis RJPU <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.strategisRjpu || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          strategisRjpu: e.target.value,
                        })
                      }
                      disabled={loadingSave || loadingStrategis}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                    >
                      <option value="">
                        {loadingStrategis
                          ? "Memuat strategi..."
                          : "Pilih Strategi RJPU"}
                      </option>
                      {strategis.map((s) => (
                        <option key={s.kodeAwal} value={s.kodeAwal}>
                          {s.kodeAwal} — {s.strategicInitiatives}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-400 mt-1">
                      Menentukan nomor program: MT-P2.3-001
                    </p>
                  </div>

                  {/* ASET (searchable) */}
                  <div className="md:col-span-2 relative">
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      Aset{" "}
                      <span className="text-xs font-normal text-slate-400">
                        (bisa cari berdasarkan nama)
                      </span>
                    </label>
                    {formData.kategori === "Jasa" ? (
                      <input
                        type="text"
                        value="Jasa"
                        disabled
                        className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-2xl text-slate-600 cursor-not-allowed"
                      />
                    ) : (
                      <>
                        <input
                          type="text"
                          value={
                            showAssetDropdown
                              ? assetSearch
                              : formData.aset || ""
                          }
                          onChange={(e) => {
                            setAssetSearch(e.target.value);
                            setShowAssetDropdown(true);
                          }}
                          onFocus={() => {
                            setAssetSearch("");
                            setShowAssetDropdown(true);
                          }}
                          onBlur={() =>
                            setTimeout(() => setShowAssetDropdown(false), 200)
                          }
                          disabled={loadingSave || loadingAssets}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                          placeholder="Ketik nama aset untuk mencari..."
                        />
                        {showAssetDropdown && (
                          <div
                            className="absolute z-[60] mt-1 w-full max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  aset: "",
                                  descriptionAset: "",
                                }));
                                setShowAssetDropdown(false);
                                setAssetSearch("");
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition border-b border-slate-100 font-medium text-sm flex items-center justify-between sticky top-0 bg-white"
                            >
                              <span>Kosongkan Pilihan Aset</span>
                              <FiX size={14} />
                            </button>
                            {filteredAssets.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-slate-400 text-center">
                                Tidak ditemukan aset
                              </div>
                            ) : (
                              filteredAssets.map((a) => (
                                <button
                                  key={a.namaAset}
                                  type="button"
                                  onClick={() => {
                                    handleAsetChange(a.namaAset);
                                    setShowAssetDropdown(false);
                                    setAssetSearch("");
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-sky-50 transition border-b border-slate-100 last:border-0 group"
                                >
                                  <div className="font-medium text-slate-800 text-sm group-hover:text-sky-700">
                                    {a.namaAset}
                                  </div>
                                  {a.deskripsi && (
                                    <div className="text-xs text-slate-400 line-clamp-1 group-hover:text-sky-600">
                                      {a.deskripsi}
                                    </div>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      Deskripsi Aset
                    </label>
                    <input
                      type="text"
                      value={formData.descriptionAset || ""}
                      readOnly
                      disabled
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl bg-slate-50 text-slate-600 cursor-not-allowed"
                      placeholder="Terisi otomatis dari aset"
                    />
                  </div>

                  {/* FILE UPLOAD (AKTIF) */}
                  <div className="md:col-span-2 bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                    <label className="block text-sm font-semibold mb-2 text-slate-700">
                      File Link (Google Drive)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={formData.file || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, file: e.target.value })
                        }
                        disabled={loadingSave || loadingUpload}
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50 text-sm"
                        placeholder="https://drive.google.com/..."
                      />
                      <div className="relative">
                        <input
                          type="file"
                          id="file-upload"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={loadingUpload || loadingSave}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.rar"
                        />
                        <label
                          htmlFor="file-upload"
                          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white transition-all cursor-pointer whitespace-nowrap ${loadingUpload || loadingSave ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 shadow-sm"}`}
                        >
                          {loadingUpload ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                              Mengunggah...
                            </>
                          ) : (
                            <>
                              <FiUpload size={16} /> Upload File
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Mendukung format dokumen, gambar, excel, pdf, dll (Maks.
                      15MB). File akan otomatis masuk ke folder sesuai nama
                      Program Kerja.
                    </p>
                    {formData.file && (
                      <div className="mt-3 flex items-center justify-between bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-2 text-sm text-emerald-700 truncate">
                          <FiFileText size={16} />
                          <span className="truncate">File telah tersedia</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, file: "" }))
                          }
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Hapus File"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="program-keterangan"
                      className="block text-sm font-semibold mb-1 text-slate-700"
                    >
                      Keterangan / Status Program
                    </label>
                    <select
                      id="program-keterangan"
                      value={formData.keterangan || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          keterangan: e.target.value,
                        }))
                      }
                      disabled={loadingSave}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                    >
                      <option value="">Pilih Status Program</option>
                      {formData.keterangan &&
                        !keteranganOptions.includes(formData.keterangan) && (
                          <option value={formData.keterangan}>
                            {formData.keterangan} (keterangan lama)
                          </option>
                        )}
                      {keteranganOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Disimpan ke kolom Y (KETERANGAN). Memilih "Drop" tidak
                      otomatis memindahkan program ke sheet Drop; gunakan tombol
                      arsip untuk itu.
                    </p>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => !loadingSave && setShowModal(false)}
                  disabled={loadingSave || loadingUpload}
                  className="px-4 py-2 border border-slate-200 rounded-2xl hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={loadingSave || loadingUpload}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1e4f91] to-[#2563eb] text-white rounded-2xl hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loadingSave ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <FiSave size={16} /> Simpan Program
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProgramData;
