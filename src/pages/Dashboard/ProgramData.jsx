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
  FiCopy,
  FiCheck,
  FiAlertCircle,
  FiTrendingUp,
  FiCalendar,
  FiFolder,
  FiDollarSign,
  FiEye,
  FiAlertTriangle,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import dataSheet from "../../api/dataSheetService";

// Skeleton Components
const SkeletonCard = () => (
  <div className="bg-white rounded-[22px] p-5 shadow-sm animate-pulse">
    <div className="flex items-start justify-between mb-3">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
      <div className="h-6 bg-gray-200 rounded w-20"></div>
    </div>
    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
    <div className="flex flex-wrap gap-2 mb-3">
      <div className="h-6 bg-gray-200 rounded w-20"></div>
      <div className="h-6 bg-gray-200 rounded w-16"></div>
      <div className="h-6 bg-gray-200 rounded w-24"></div>
    </div>
    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
      <div className="h-5 bg-gray-200 rounded w-24"></div>
      <div className="flex gap-1">
        <div className="w-7 h-7 bg-gray-200 rounded-lg"></div>
        <div className="w-7 h-7 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  </div>
);

const SkeletonTableRow = () => (
  <tr className="border-t border-slate-100">
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
      <div className="h-3 bg-gray-200 rounded w-64 mt-1 animate-pulse"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
    </td>
    <td className="px-4 py-3 text-center">
      <div className="h-6 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
    </td>
    <td className="px-4 py-3 text-right">
      <div className="h-4 bg-gray-200 rounded w-24 ml-auto animate-pulse"></div>
    </td>
    <td className="px-4 py-3 text-center">
      <div className="h-6 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
    </td>
    <td className="px-4 py-3 text-center">
      <div className="h-4 bg-gray-200 rounded w-12 mx-auto animate-pulse"></div>
    </td>
    <td className="px-4 py-3 text-center">
      <div className="h-4 bg-gray-200 rounded w-12 mx-auto animate-pulse"></div>
    </td>
    <td className="px-4 py-3 text-center">
      <div className="flex gap-1 justify-center">
        <div className="w-7 h-7 bg-gray-200 rounded-lg"></div>
        <div className="w-7 h-7 bg-gray-200 rounded-lg"></div>
        <div className="w-7 h-7 bg-gray-200 rounded-lg"></div>
      </div>
    </td>
  </tr>
);

const SkeletonStatsCard = () => (
  <div className="group relative bg-white rounded-[22px] border border-slate-200/80 shadow-[0_4px_24px_rgba(15,23,42,0.035)] overflow-hidden animate-pulse">
    <div className="relative p-5 md:p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-2xl bg-gray-200">
          <div className="w-6 h-6"></div>
        </div>
        <div className="text-right">
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
      <div className="h-5 bg-gray-200 rounded w-24 mb-1"></div>
      <div className="h-3 bg-gray-200 rounded w-32"></div>
    </div>
  </div>
);

const ProgramData = ({ userRole }) => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [formData, setFormData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [filterYear, setFilterYear] = useState("all");
  const [filterCluster, setFilterCluster] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [programToDelete, setProgramToDelete] = useState(null);
  const itemsPerPage = 10;
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingBulkDelete, setLoadingBulkDelete] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);

  // Dropdown options
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
    "Kimia",
    "K3",
  ];

  useEffect(() => {
    loadPrograms();
  }, []);

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

  const handleAdd = () => {
    setEditingProgram(null);
    setFormData({
      programKerja: "",
      alasanProgram: "",
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
      keterangan: "",
    });
    setShowModal(true);
  };

  const handleEdit = (program) => {
    setEditingProgram(program);
    setFormData({ ...program });
    setShowModal(true);
  };

  const handleViewDetail = (program) => {
    setSelectedProgram(program);
    setShowDetailModal(true);
  };

  const confirmDelete = (no, programName) => {
    setProgramToDelete({ no, programName });
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
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
    if (selectedPrograms.length === 0) return;

    setLoadingBulkDelete(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const no of selectedPrograms) {
        const result = await dataSheet.moveToDrop(no, "DROP");
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      await loadPrograms();
      setSelectedPrograms([]);

      if (successCount > 0) {
        showToast(
          `${successCount} program berhasil dipindahkan ke arsip Drop${failCount > 0 ? `, ${failCount} gagal` : ""}`,
          successCount > 0 ? "success" : "error",
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
    setSelectedPrograms((prev) =>
      prev.includes(no) ? prev.filter((n) => n !== no) : [...prev, no],
    );
  };

  const toggleSelectAll = () => {
    if (selectedPrograms.length === paginatedPrograms.length) {
      setSelectedPrograms([]);
    } else {
      setSelectedPrograms(paginatedPrograms.map((p) => p.no));
    }
  };

  const handleSave = async () => {
    if (!formData.programKerja) {
      showToast("Program Kerja wajib diisi", "error");
      return;
    }
    if (!formData.tahun) {
      showToast("Tahun wajib diisi", "error");
      return;
    }

    setLoadingSave(true);
    try {
      if (editingProgram) {
        const result = await dataSheet.updateData(editingProgram.no, formData);
        if (result.success) {
          await loadPrograms();
          setShowModal(false);
          showToast("Program berhasil diupdate", "success");
        } else {
          showToast("Gagal mengupdate program: " + result.message, "error");
        }
      } else {
        const result = await dataSheet.addData(formData);
        if (result.success) {
          await loadPrograms();
          setShowModal(false);
          showToast("Program berhasil ditambahkan", "success");
        } else {
          showToast("Gagal menambahkan program: " + result.message, "error");
        }
      }
    } catch (error) {
      showToast("Terjadi kesalahan: " + error.message, "error");
    } finally {
      setLoadingSave(false);
    }
  };

  const handleExport = async () => {
    setLoadingExport(true);
    try {
      const filtered = getFilteredPrograms();
      const csv = convertToCSV(filtered);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `programs_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Data berhasil diekspor", "success");
    } catch (error) {
      showToast("Gagal mengekspor data: " + error.message, "error");
    } finally {
      setLoadingExport(false);
    }
  };

  const convertToCSV = (data) => {
    const headers = [
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
    const rows = data.map((item) =>
      headers.map((h) => {
        const key = h.toLowerCase().replace(/ /g, "");
        return item[key] || item[h] || "";
      }),
    );
    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell || ""}"`).join(","))
      .join("\n");
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
    const colors = {
      Rendah: "bg-emerald-100 text-emerald-700",
      Moderat: "bg-amber-100 text-amber-700",
      Tinggi: "bg-orange-100 text-orange-700",
      "Sangat Tinggi": "bg-red-100 text-red-700",
      Ekstrem: "bg-purple-100 text-purple-700",
    };
    return colors[risk] || "bg-gray-100 text-gray-700";
  };

  const getRiskIcon = (risk) => {
    const icons = {
      Rendah: <FiCheck className="w-3 h-3" />,
      Moderat: <FiAlertCircle className="w-3 h-3" />,
      Tinggi: <FiAlertCircle className="w-3 h-3" />,
      "Sangat Tinggi": <FiAlertCircle className="w-3 h-3" />,
      Ekstrem: <FiAlertCircle className="w-3 h-3" />,
    };
    return icons[risk] || null;
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
          p.bidang?.toLowerCase().includes(term),
      );
    }
    if (filterYear !== "all")
      filtered = filtered.filter((p) => p.tahun === filterYear);
    if (filterCluster !== "all")
      filtered = filtered.filter((p) => p.klusterProgram === filterCluster);
    return filtered;
  }, [programs, searchTerm, filterYear, filterCluster]);

  const filteredPrograms = getFilteredPrograms();
  const totalPages = Math.ceil(filteredPrograms.length / itemsPerPage);
  const paginatedPrograms = filteredPrograms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalAnggaran = useMemo(() => {
    return filteredPrograms.reduce(
      (sum, p) => sum + (parseFloat(p.hargaTotal) || 0),
      0,
    );
  }, [filteredPrograms]);

  const resetFilters = () => {
    setSearchTerm("");
    setFilterYear("all");
    setFilterCluster("all");
    setCurrentPage(1);
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
    const colors = {
      2024: "bg-indigo-100 text-indigo-700",
      2025: "bg-purple-100 text-purple-700",
    };
    return colors[year] || "bg-gray-100 text-gray-700";
  };

  // Loading overlay component
  const LoadingOverlay = ({ message }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
    >
      <div className="bg-white rounded-[22px] p-6 flex flex-col items-center gap-4 shadow-xl">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-700 font-medium">{message}</p>
      </div>
    </motion.div>
  );

  // Loading Skeleton View
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] p-0 text-slate-800">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-6 rounded-[26px] bg-[#101b34] px-5 py-6 md:px-7 md:py-7 shadow-[0_16px_38px_rgba(16,27,52,.13)]">
            <div>
              <div className="h-10 bg-gray-200 rounded w-48 animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="h-10 bg-gray-200 rounded-2xl w-32 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded-2xl w-32 animate-pulse"></div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
          </div>

          {/* Filters Bar Skeleton */}
          <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(15,23,42,0.035)] border border-slate-200/80 p-4 animate-pulse">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 h-11 bg-gray-200 rounded-2xl"></div>
              <div className="w-40 h-11 bg-gray-200 rounded-2xl"></div>
              <div className="w-48 h-11 bg-gray-200 rounded-2xl"></div>
              <div className="flex flex-wrap gap-3">
                <div className="w-24 h-11 bg-gray-200 rounded-2xl"></div>
                <div className="w-24 h-11 bg-gray-200 rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Table/Grid View Skeleton */}
        <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(15,23,42,0.035)] border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 w-10">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-4">
                    <div className="h-3 bg-gray-200 rounded w-8 animate-pulse"></div>
                  </th>
                  <th className="px-4 py-4">
                    <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </th>
                  <th className="px-4 py-4">
                    <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </th>
                  <th className="px-4 py-4">
                    <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <div className="h-3 bg-gray-200 rounded w-12 mx-auto animate-pulse"></div>
                  </th>
                  <th className="px-4 py-4 text-right">
                    <div className="h-3 bg-gray-200 rounded w-16 ml-auto animate-pulse"></div>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <div className="h-3 bg-gray-200 rounded w-12 mx-auto animate-pulse"></div>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <div className="h-3 bg-gray-200 rounded w-12 mx-auto animate-pulse"></div>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <div className="h-3 bg-gray-200 rounded w-8 mx-auto animate-pulse"></div>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <div className="h-3 bg-gray-200 rounded w-8 mx-auto animate-pulse"></div>
                  </th>
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

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-0 text-slate-800">
      {/* Loading Overlays */}
      <AnimatePresence>
        {(loadingSave ||
          loadingDelete ||
          loadingBulkDelete ||
          loadingExport) && (
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
                      : "Memproses..."
            }
          />
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-20 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg ${
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && programToDelete && (
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
                      Data akan dipindahkan ke sheet <strong>"Drop"</strong>{" "}
                      dengan keterangan <strong>DROP</strong> dan timestamp.
                      Data dapat dipulihkan kembali jika diperlukan.
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

      {/* Header Section */}
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
            {/* Tombol Grid/Table View */}
            <button
              onClick={() =>
                setViewMode(viewMode === "table" ? "grid" : "table")
              }
              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white border border-white/20 rounded-2xl shadow-sm hover:bg-white/20 transition-all"
              disabled={loading}
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

            {/* Tombol Drop Data / Arsip (hanya untuk Admin) */}
            {userRole === "Admin" && (
              <button
                onClick={() => (window.location.href = "/drop-data")}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-2xl shadow-sm hover:shadow-md transition-all"
              >
                <FiArchive size={18} />
                <span className="hidden sm:inline">Program Drop</span>
              </button>
            )}

            {/* Tombol Hapus Massal */}
            {userRole === "Admin" && selectedPrograms.length > 0 && (
              <motion.button
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                onClick={() => setShowBulkDelete(true)}
                disabled={loadingBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-2xl shadow-sm hover:shadow-md transition-all disabled:opacity-50"
              >
                <FiTrash2 size={18} />
                <span>Hapus ({selectedPrograms.length})</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <motion.div
            whileHover={{ y: -4 }}
            className="group relative bg-white rounded-[22px] border border-slate-200/80 shadow-[0_4px_24px_rgba(15,23,42,0.035)] hover:shadow-[0_12px_35px_rgba(15,23,42,0.09)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="group relative bg-white rounded-[22px] border border-slate-200/80 shadow-[0_4px_24px_rgba(15,23,42,0.035)] hover:shadow-[0_12px_35px_rgba(15,23,42,0.09)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
              <p className="text-xs text-slate-400">Keseluruhan anggaran</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="group relative bg-white rounded-[22px] border border-slate-200/80 shadow-[0_4px_24px_rgba(15,23,42,0.035)] hover:shadow-[0_12px_35px_rgba(15,23,42,0.09)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="group relative bg-white rounded-[22px] border border-slate-200/80 shadow-[0_4px_24px_rgba(15,23,42,0.035)] hover:shadow-[0_12px_35px_rgba(15,23,42,0.09)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
          </motion.div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(15,23,42,0.035)] border border-slate-200/80 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari program, kluster, tahun, sumber anggaran, atau bidang..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={loading}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>
            <select
              value={filterYear}
              onChange={(e) => {
                setFilterYear(e.target.value);
                setCurrentPage(1);
              }}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50"
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
              }}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50"
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
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                <FiRefreshCw size={16} />{" "}
                <span className="hidden sm:inline">Reset</span>
              </button>
              <button
                onClick={handleExport}
                disabled={loadingExport || loading}
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
              {
                <button
                  onClick={handleAdd}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1e4f91] to-[#2563eb] text-white rounded-2xl hover:shadow-lg transition-all disabled:opacity-50"
                >
                  <FiPlus size={18} /> <span>Tambah</span>
                </button>
              }
            </div>
          </div>
          {(searchTerm || filterYear !== "all" || filterCluster !== "all") && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <FiFilter size={14} />
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

      {/* Main Content - Only show when not loading */}
      {filteredPrograms.length === 0 ? (
        <div className="bg-white rounded-[22px] p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiFileText className="text-3xl text-slate-400" />
          </div>
          <p className="text-slate-500">Tidak ada data program</p>
          {userRole === "Admin" && (
            <button
              onClick={handleAdd}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-2xl"
            >
              Tambah Program Pertama
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        // Table View
        <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(15,23,42,0.035)] border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {userRole === "Admin" && (
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
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    No
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Program Kerja
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Kluster
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Sumber
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Tahun
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Anggaran
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Resiko
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Bidang
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    File
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
                      {userRole === "Admin" && (
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
                        <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-sky-100 text-sky-800">
                          {program.klusterProgram
                            ?.split(" ")
                            .slice(0, 2)
                            .join(" ") || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-700">
                          {program.sumberAnggaran || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-bold rounded-lg ${getYearBadgeColor(program.tahun)}`}
                        >
                          {program.tahun || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-emerald-600">
                          {formatCurrencyShort(program.hargaTotal)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {program.levelResikoInherent && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getRiskColor(program.levelResikoInherent)}`}
                          >
                            {getRiskIcon(program.levelResikoInherent)}
                            {program.levelResikoInherent}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-slate-600">
                          {program.bidang || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {program.file ? (
                          <a
                            href={program.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-800 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FiExternalLink size={14} /> Lihat
                          </a>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleViewDetail(program)}
                            disabled={loading}
                            className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition disabled:opacity-50"
                            title="Detail"
                          >
                            <FiEye size={15} />
                          </button>
                          {userRole === "Admin" && (
                            <>
                              <button
                                onClick={() => handleEdit(program)}
                                disabled={loadingSave}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition disabled:opacity-50"
                                title="Edit"
                              >
                                <FiEdit2 size={15} />
                              </button>
                              <button
                                onClick={() =>
                                  confirmDelete(
                                    program.no,
                                    program.programKerja,
                                  )
                                }
                                disabled={loadingDelete}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                title="Hapus"
                              >
                                <FiTrash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <div className="text-sm text-slate-500">
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{" "}
                {Math.min(currentPage * itemsPerPage, filteredPrograms.length)}{" "}
                dari {filteredPrograms.length} data
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition"
                >
                  <FiChevronLeft size={16} /> Prev
                </button>
                <div className="flex gap-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    if (pageNum < 1 || pageNum > totalPages) return null;
                    return (
                      <button
                        key={`page-${pageNum}`}
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={loading}
                        className={`w-9 h-9 text-sm rounded-lg transition ${
                          currentPage === pageNum
                            ? "bg-blue-600 text-white shadow-sm"
                            : "hover:bg-gray-200"
                        } disabled:opacity-50`}
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
                  disabled={currentPage === totalPages || loading}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition"
                >
                  Next <FiChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Grid View
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
                {userRole === "Admin" && (
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
                    <span className="inline-flex px-2 py-1 text-xs rounded-lg bg-sky-50 text-sky-700">
                      {program.klusterProgram || "-"}
                    </span>
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-lg ${getYearBadgeColor(program.tahun)}`}
                    >
                      {program.tahun || "-"}
                    </span>
                    <span className="inline-flex px-2 py-1 text-xs rounded-lg bg-emerald-50 text-emerald-600">
                      {program.sumberAnggaran || "-"}
                    </span>
                    <span className="inline-flex px-2 py-1 text-xs rounded-lg bg-purple-50 text-purple-600">
                      {program.bidang || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-sm font-bold text-emerald-600">
                      {formatCurrencyShort(program.hargaTotal)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleViewDetail(program)}
                        disabled={loading}
                        className="p-1.5 text-slate-400 hover:text-sky-700 rounded-lg transition disabled:opacity-50"
                        title="Detail"
                      >
                        <FiEye size={14} />
                      </button>
                      {userRole === "Admin" && (
                        <>
                          <button
                            onClick={() => handleEdit(program)}
                            disabled={loadingSave}
                            className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg transition disabled:opacity-50"
                            title="Edit"
                          >
                            <FiEdit2 size={14} />
                          </button>
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
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination for Grid View */}
      {viewMode === "grid" && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-6 py-4 bg-white rounded-[22px] shadow-[0_4px_24px_rgba(15,23,42,0.035)] border border-slate-200/80">
          <div className="text-sm text-slate-500">
            Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{" "}
            {Math.min(currentPage * itemsPerPage, filteredPrograms.length)} dari{" "}
            {filteredPrograms.length} data
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              <FiChevronLeft size={16} /> Prev
            </button>
            <div className="flex gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                if (pageNum < 1 || pageNum > totalPages) return null;
                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => setCurrentPage(pageNum)}
                    disabled={loading}
                    className={`w-9 h-9 text-sm rounded-lg transition ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white shadow-sm"
                        : "hover:bg-gray-100"
                    } disabled:opacity-50`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              Next <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      <AnimatePresence>
        {showBulkDelete && (
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
              <div className="sticky top-0 bg-gradient-to-r from-[#1e4f91] to-[#2563eb] px-6 py-4 flex justify-between items-center">
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
                      {selectedProgram.levelResikoInherent && (
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full ${getRiskColor(selectedProgram.levelResikoInherent)}`}
                        >
                          {getRiskIcon(selectedProgram.levelResikoInherent)}
                          {selectedProgram.levelResikoInherent}
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
                      SAT
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedProgram.sat || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      VOL
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedProgram.vol || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Harga Total
                    </label>
                    <p className="font-bold text-emerald-600 mt-1 text-lg">
                      {formatCurrency(selectedProgram.hargaTotal)}
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

                {selectedProgram.keterangan && (
                  <div className="mb-5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Keterangan
                    </label>
                    <p className="text-slate-600 mt-1 p-3 bg-amber-50 rounded-2xl">
                      {selectedProgram.keterangan}
                    </p>
                  </div>
                )}

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
                {userRole === "Admin" && (
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
            onClick={() => !loadingSave && setShowModal(false)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-[22px] max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-[#1e4f91] to-[#2563eb] px-6 py-4 flex justify-between items-center">
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
                  onClick={() => !loadingSave && setShowModal(false)}
                  disabled={loadingSave}
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

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      EST Levering
                    </label>
                    <input
                      type="text"
                      value={formData.estLevering || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estLevering: e.target.value,
                        })
                      }
                      disabled={loadingSave}
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
                      Harga Total (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.hargaTotal || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, hargaTotal: e.target.value })
                      }
                      disabled={loadingSave}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                      placeholder="0"
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
                      File Link (Google Drive)
                    </label>
                    <input
                      type="text"
                      value={formData.file || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, file: e.target.value })
                      }
                      disabled={loadingSave}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                      placeholder="https://drive.google.com/..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1 text-slate-700">
                      Keterangan
                    </label>
                    <textarea
                      value={formData.keterangan || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, keterangan: e.target.value })
                      }
                      disabled={loadingSave}
                      rows="3"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-400 transition disabled:bg-gray-100 disabled:opacity-50"
                      placeholder="Tambahkan keterangan tambahan tentang program..."
                    />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => !loadingSave && setShowModal(false)}
                  disabled={loadingSave}
                  className="px-4 py-2 border border-slate-200 rounded-2xl hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={loadingSave}
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
