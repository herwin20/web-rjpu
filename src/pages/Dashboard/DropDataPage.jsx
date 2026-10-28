// components/DropData.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FiRefreshCw,
  FiSearch,
  FiDownload,
  FiX,
  FiEye,
  FiRotateCcw,
  FiTrash2,
  FiInfo,
  FiCheck,
  FiAlertCircle,
  FiCalendar,
  FiFolder,
  FiDollarSign,
  FiUser,
  FiClock,
  FiTag,
  FiArchive,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import sheetsService from "../../api/googleSheetService";
import dataSheet from "../../api/dataSheetService";

// Skeleton Components
const SkeletonStatsCard = () => (
  <div className="group relative bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
    <div className="relative p-5 md:p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-gray-200">
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

const SkeletonTableRow = () => (
  <tr className="border-t border-slate-100">
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
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
      <div className="h-4 bg-gray-200 rounded w-24 mx-auto animate-pulse"></div>
    </td>
    <td className="px-4 py-3 text-center">
      <div className="h-6 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
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

const DropData = ({ userRole }) => {
  const [dropData, setDropData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [itemToRestore, setItemToRestore] = useState(null);
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] =
    useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [loadingRestore, setLoadingRestore] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    loadDropData();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  const loadDropData = async () => {
    setLoading(true);
    try {
      const data = await getDropSheetData();
      setDropData(data);
    } catch (error) {
      console.error("Error loading drop data:", error);
      showToast("Gagal memuat data Drop: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const getDropSheetData = async () => {
    try {
      await sheetsService.init();
      const dropExists = await sheetsService.sheetExists("Drop");

      if (!dropExists) {
        return [];
      }

      const data = await sheetsService.getAllData("Drop", "A:U");

      // Log untuk debugging
      console.log("Drop sheet data:", data);
      console.log("Data length:", data.length);

      // Process data - skip header row if exists
      const processedData = [];
      const startIndex =
        data.length > 0 && (data[0]["NO"] === "NO" || data[0]["NO"] === "NO")
          ? 1
          : 0;

      for (let i = startIndex; i < data.length; i++) {
        const row = data[i];
        // Skip empty rows
        if (
          !row["PROGRAM KERJA"] ||
          row["PROGRAM KERJA"].toString().trim() === ""
        ) {
          continue;
        }

        processedData.push({
          id: i,
          no: row["NO"] || "",
          programKerja: row["PROGRAM KERJA"] || "",
          alasanProgram: row["ALASAN PROGRAM"] || "",
          klusterProgram: row["KLUSTER PROGRAM"] || "",
          oemNonOem: row["OEM/NON OEM"] || "",
          dasarInputProgram: row["DASAR INPUT PROGRAM"] || "",
          sasaranRjpp: row["SASARAN RJPP"] || "",
          sumberAnggaran: row["SUMBER ANGGARAN"] || "",
          estLevering: row["EST LEVERING"] || "",
          levelResikoInherent: row["LEVEL RESIKO INHERENT"] || "",
          levelRisikoResidual: row["LEVEL RISIKO RESIDUAL"] || "",
          sat: row["SAT"] || "",
          vol: row["VOL"] || "",
          tahun: row["TAHUN"] || "",
          hargaTotal: row["HARGA TOTAL"] || "",
          file: row["FILE"] || "",
          bidang: row["BIDANG"] || "",
          keterangan: row["KETERANGAN"] || "",
          dropDate: row["DROP DATE"] || row["DROP_DATE"] || "",
          dropStatus: row["DROP STATUS"] || row["DROP_STATUS"] || "DROP",
          originalNo:
            row["ORIGINAL NO"] || row["ORIGINAL_NO"] || row["NO"] || "",
        });
      }

      console.log("Processed drop data:", processedData);
      return processedData;
    } catch (error) {
      console.error("Error getting drop sheet data:", error);
      return [];
    }
  };

  const handleRestore = async () => {
    if (!itemToRestore) return;

    setLoadingRestore(true);
    try {
      // Prepare data to restore
      const restoredData = {
        programKerja: itemToRestore.programKerja,
        alasanProgram: itemToRestore.alasanProgram,
        klusterProgram: itemToRestore.klusterProgram,
        oemNonOem: itemToRestore.oemNonOem,
        dasarInputProgram: itemToRestore.dasarInputProgram,
        sasaranRjpp: itemToRestore.sasaranRjpp,
        sumberAnggaran: itemToRestore.sumberAnggaran,
        estLevering: itemToRestore.estLevering,
        levelResikoInherent: itemToRestore.levelResikoInherent,
        levelRisikoResidual: itemToRestore.levelRisikoResidual,
        sat: itemToRestore.sat,
        vol: itemToRestore.vol,
        tahun: itemToRestore.tahun,
        hargaTotal: itemToRestore.hargaTotal,
        file: itemToRestore.file,
        bidang: itemToRestore.bidang,
        keterangan: itemToRestore.keterangan,
      };

      // Add back to Data sheet
      const result = await dataSheet.addData(restoredData);

      if (result.success) {
        // Remove from Drop sheet (clear the row)
        await removeFromDropSheet(itemToRestore.originalNo || itemToRestore.no);

        await loadDropData();
        showToast(
          `Program "${itemToRestore.programKerja}" berhasil direstore dengan NO baru: ${result.no}`,
          "success",
        );
      } else {
        showToast("Gagal merestore program: " + result.message, "error");
      }
    } catch (error) {
      showToast("Terjadi kesalahan: " + error.message, "error");
    } finally {
      setLoadingRestore(false);
      setShowRestoreConfirm(false);
      setItemToRestore(null);
    }
  };

  const removeFromDropSheet = async (originalNo) => {
    try {
      const allDataRaw = await sheetsService.getRawData("Drop", "A:U");

      let rowIndex = -1;
      for (let i = 0; i < allDataRaw.length; i++) {
        const row = allDataRaw[i];
        // Check multiple possible column indices for original NO
        if (
          row &&
          ((row[20] && row[20].toString() === originalNo.toString()) ||
            (row[0] && row[0].toString() === originalNo.toString()))
        ) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex !== -1) {
        const sheetRow = rowIndex + 1;
        const emptyRow = Array(21).fill("");
        const range = `Drop!A${sheetRow}:U${sheetRow}`;
        await sheetsService.writeData(range, [emptyRow]);
        console.log(`Removed row ${sheetRow} from Drop sheet`);
      } else {
        console.log(
          `Row with originalNo ${originalNo} not found in Drop sheet`,
        );
      }

      return true;
    } catch (error) {
      console.error("Error removing from drop sheet:", error);
      return false;
    }
  };

  const handlePermanentDelete = async () => {
    if (!itemToDelete) return;

    setLoadingDelete(true);
    try {
      await removeFromDropSheet(itemToDelete.originalNo || itemToDelete.no);
      await loadDropData();
      showToast(
        `Program "${itemToDelete.programKerja}" berhasil dihapus permanen`,
        "success",
      );
    } catch (error) {
      showToast("Gagal menghapus program: " + error.message, "error");
    } finally {
      setLoadingDelete(false);
      setShowPermanentDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  const handleViewDetail = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const confirmRestore = (item) => {
    setItemToRestore(item);
    setShowRestoreConfirm(true);
  };

  const confirmPermanentDelete = (item) => {
    setItemToDelete(item);
    setShowPermanentDeleteConfirm(true);
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

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleString("id-ID");
    } catch {
      return dateString;
    }
  };

  const getFilteredData = useCallback(() => {
    let filtered = dropData;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          (item.programKerja || "").toLowerCase().includes(term) ||
          (item.klusterProgram || "").toLowerCase().includes(term) ||
          (item.tahun || "").includes(term) ||
          (item.originalNo || "").toLowerCase().includes(term) ||
          (item.dropStatus || "").toLowerCase().includes(term),
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((item) => item.dropStatus === filterStatus);
    }

    return filtered;
  }, [dropData, searchTerm, filterStatus]);

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

  const getStatusBadgeColor = (status) => {
    const colors = {
      DROP: "bg-red-100 text-red-700",
      RESTORED: "bg-green-100 text-green-700",
      ARCHIVED: "bg-gray-100 text-gray-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalAnggaran = useMemo(() => {
    return filteredData.reduce(
      (sum, item) => sum + (parseFloat(item.hargaTotal) || 0),
      0,
    );
  }, [filteredData]);

  const resetFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setCurrentPage(1);
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
  };

  // Loading Overlay
  const LoadingOverlay = ({ message }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
    >
      <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4 shadow-xl">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-700 font-medium">{message}</p>
      </div>
    </motion.div>
  );

  // Loading Skeleton View
  if (loading) {
    return (
      <div className="min-h-screen bg-transparent p-0 text-slate-800">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-6 rounded-[26px] bg-[#101b34] px-5 py-6 md:px-7 md:py-7 shadow-[0_16px_38px_rgba(16,27,52,.13)]">
            <div>
              <div className="h-10 bg-gray-200 rounded w-48 animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded-xl w-24 animate-pulse"></div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
          </div>

          {/* Filters Bar Skeleton */}
          <div className="bg-white rounded-[22px] shadow-[0_3px_20px_rgba(15,23,42,0.035)] border border-slate-200/80 p-4 animate-pulse">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 h-11 bg-gray-200 rounded-xl"></div>
              <div className="w-40 h-11 bg-gray-200 rounded-xl"></div>
              <div className="w-24 h-11 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-[22px] shadow-[0_3px_20px_rgba(15,23,42,0.035)] border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4">
                    <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
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
                    <div className="h-3 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <div className="h-3 bg-gray-200 rounded w-12 mx-auto animate-pulse"></div>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <div className="h-3 bg-gray-200 rounded w-12 mx-auto animate-pulse"></div>
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
    <div className="min-h-screen bg-transparent p-0 text-slate-800">
      {/* Loading Overlays */}
      <AnimatePresence>
        {(loadingRestore || loadingDelete) && (
          <LoadingOverlay
            message={
              loadingRestore
                ? "Merestore program..."
                : loadingDelete
                  ? "Menghapus permanen..."
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
            className={`fixed top-20 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-[0_8px_24px_rgba(15,23,42,.12)] ${
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

      {/* Restore Confirmation Modal */}
      <AnimatePresence>
        {showRestoreConfirm && itemToRestore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !loadingRestore && setShowRestoreConfirm(false)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-[24px] border border-white/70 max-w-md w-full shadow-[0_25px_90px_rgba(15,23,42,0.24)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <FiRotateCcw className="text-emerald-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      Konfirmasi Restore
                    </h3>
                    <p className="text-slate-500 text-sm">
                      Program akan dikembalikan ke Data sheet
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-slate-600 mb-2">
                    Apakah Anda yakin ingin merestore program berikut?
                  </p>
                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                    <p className="font-semibold text-slate-900">
                      {itemToRestore.programKerja}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Original NO:{" "}
                      {itemToRestore.originalNo || itemToRestore.no}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-3 mb-6">
                  <div className="flex items-start gap-2">
                    <FiInfo className="text-sky-600 text-sm mt-0.5" />
                    <p className="text-xs text-blue-700">
                      Program akan mendapatkan NO baru di sheet Data sesuai
                      urutan saat ini. Data akan dihapus dari sheet Drop setelah
                      direstore.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowRestoreConfirm(false)}
                    disabled={loadingRestore}
                    className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleRestore}
                    disabled={loadingRestore}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-md transition disabled:opacity-50"
                  >
                    {loadingRestore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Merestore...</span>
                      </>
                    ) : (
                      <>
                        <FiRotateCcw size={16} /> Restore Program
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permanent Delete Confirmation Modal */}
      <AnimatePresence>
        {showPermanentDeleteConfirm && itemToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() =>
              !loadingDelete && setShowPermanentDeleteConfirm(false)
            }
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-[24px] border border-white/70 max-w-md w-full shadow-[0_25px_90px_rgba(15,23,42,0.24)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <FiTrash2 className="text-red-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                      Konfirmasi Hapus Permanen
                    </h3>
                    <p className="text-slate-500 text-sm">
                      Data akan dihapus selamanya
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-slate-600 mb-2">
                    Apakah Anda yakin ingin menghapus permanen program berikut?
                  </p>
                  <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                    <p className="font-semibold text-slate-900">
                      {itemToDelete.programKerja}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Original NO: {itemToDelete.originalNo || itemToDelete.no}
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50 rounded-xl p-3 mb-6">
                  <div className="flex items-start gap-2">
                    <FiAlertCircle className="text-amber-600 text-sm mt-0.5" />
                    <p className="text-xs text-amber-700">
                      Tindakan ini tidak dapat dibatalkan. Data akan dihapus
                      permanen dari sheet Drop.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowPermanentDeleteConfirm(false)}
                    disabled={loadingDelete}
                    className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handlePermanentDelete}
                    disabled={loadingDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-md transition disabled:opacity-50"
                  >
                    {loadingDelete ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Menghapus...</span>
                      </>
                    ) : (
                      <>
                        <FiTrash2 size={16} /> Hapus Permanen
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
              Program Drop
            </h1>
            <p className="text-slate-300 mt-1">
              Kelola program yang telah dihapus dan restore jika diperlukan
            </p>
          </div>
          <button
            onClick={loadDropData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white border border-white/20 rounded-xl shadow-sm hover:bg-white/20 transition-all disabled:opacity-50"
          >
            <FiRefreshCw
              className={`${loading ? "animate-spin" : ""}`}
              size={18}
            />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <motion.div
            whileHover={{ y: -4 }}
            className="group relative bg-white rounded-[22px] border border-slate-200/80 shadow-[0_3px_20px_rgba(15,23,42,0.035)] hover:border-sky-200 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-sm">
                  <FiArchive className="text-white text-xl" />
                </div>
                <div className="text-right">
                  <div className="text-2xl md:text-3xl font-bold text-sky-600">
                    {dropData.length}
                  </div>
                </div>
              </div>
              <h3 className="text-slate-700 font-semibold mb-1">
                Total Terhapus
              </h3>
              <p className="text-xs text-slate-400">Program di arsip Drop</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="group relative bg-white rounded-[22px] border border-slate-200/80 shadow-[0_3px_20px_rgba(15,23,42,0.035)] hover:border-sky-200 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-sm">
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
              <p className="text-xs text-slate-400">Nilai program terhapus</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-600 to-slate-800 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="group relative bg-white rounded-[22px] border border-slate-200/80 shadow-[0_3px_20px_rgba(15,23,42,0.035)] hover:border-sky-200 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50 to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg">
                  <FiCalendar className="text-white text-xl" />
                </div>
                <div className="text-right">
                  <div className="text-2xl md:text-3xl font-bold text-sky-600">
                    {new Set(dropData.map((d) => d.tahun)).size}
                  </div>
                </div>
              </div>
              <h3 className="text-slate-700 font-semibold mb-1">
                Tahun Program
              </h3>
              <p className="text-xs text-slate-400">Periode terhapus</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="group relative bg-white rounded-[22px] border border-slate-200/80 shadow-[0_3px_20px_rgba(15,23,42,0.035)] hover:border-sky-200 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg">
                  <FiFolder className="text-white text-xl" />
                </div>
                <div className="text-right">
                  <div className="text-2xl md:text-3xl font-bold text-sky-600">
                    {new Set(dropData.map((d) => d.klusterProgram)).size}
                  </div>
                </div>
              </div>
              <h3 className="text-slate-700 font-semibold mb-1">
                Kluster Program
              </h3>
              <p className="text-xs text-slate-400">Kategori terhapus</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
          </motion.div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-[22px] shadow-[0_3px_20px_rgba(15,23,42,0.035)] border border-slate-200/80 p-5">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari program, kluster, tahun, atau original NO..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">Semua Status</option>
              <option value="DROP">DROP</option>
            </select>
            <div className="flex gap-3">
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                <FiRefreshCw size={16} /> Reset
              </button>
            </div>
          </div>
          {(searchTerm || filterStatus !== "all") && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <FiFilter size={14} />
              <span>Ditemukan {filteredData.length} program terhapus</span>
              <button
                onClick={resetFilters}
                className="text-sky-600 hover:underline"
              >
                Hapus filter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {filteredData.length === 0 ? (
        <div className="bg-white rounded-[22px] border border-slate-200/80 p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiArchive className="text-3xl text-slate-400" />
          </div>
          <p className="text-slate-500">Tidak ada data di arsip Drop</p>
          <p className="text-sm text-slate-400 mt-2">
            Program yang dihapus akan muncul di sini
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[22px] shadow-[0_3px_20px_rgba(15,23,42,0.035)] border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Original NO
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
                    Drop Date
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {paginatedData.map((item, idx) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-sky-50/50 transition-all duration-200 group"
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-slate-600">
                          {item.originalNo || item.no || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {item.programKerja}
                        </div>
                        {item.alasanProgram && (
                          <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {item.alasanProgram}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          {item.klusterProgram
                            ?.split(" ")
                            .slice(0, 2)
                            .join(" ") || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-700">
                          {item.sumberAnggaran || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex px-2 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700">
                          {item.tahun || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-emerald-600">
                          {formatCurrencyShort(item.hargaTotal)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                          <FiClock size={12} />
                          {formatDate(item.dropDate)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(item.dropStatus)}`}
                        >
                          {item.dropStatus || "DROP"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleViewDetail(item)}
                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-blue-50 rounded-lg transition"
                            title="Detail"
                          >
                            <FiEye size={15} />
                          </button>
                          {userRole === "Admin" && (
                            <>
                              <button
                                onClick={() => confirmRestore(item)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Restore"
                              >
                                <FiRotateCcw size={15} />
                              </button>
                              <button
                                onClick={() => confirmPermanentDelete(item)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Hapus Permanen"
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
                {Math.min(currentPage * itemsPerPage, filteredData.length)} dari{" "}
                {filteredData.length} data
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
                        className={`w-9 h-9 text-sm rounded-lg transition ${
                          currentPage === pageNum
                            ? "bg-sky-600 text-white shadow-sm"
                            : "hover:bg-slate-200"
                        }`}
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
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition"
                >
                  Next <FiChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedItem && (
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
              className="bg-white rounded-[24px] border border-white/70 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-[0_25px_90px_rgba(15,23,42,0.24)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-[#172b4d] px-6 py-5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <FiArchive className="text-white text-xl" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    Detail Program Terhapus
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
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <span className="text-xs text-slate-400">
                        Original NO
                      </span>
                      <p className="text-2xl font-bold text-slate-900">
                        {selectedItem.originalNo || selectedItem.no || "-"}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      {selectedItem.tahun && (
                        <span className="inline-flex px-3 py-1.5 text-sm font-bold rounded-lg bg-slate-100 text-slate-700">
                          <FiCalendar className="mr-1" /> {selectedItem.tahun}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full bg-red-100 text-red-700">
                        <FiClock size={14} />
                        {formatDate(selectedItem.dropDate)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Program Kerja
                  </label>
                  <p className="text-lg font-semibold text-slate-900 mt-1">
                    {selectedItem.programKerja}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Kluster Program
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedItem.klusterProgram || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Sumber Anggaran
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedItem.sumberAnggaran || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Harga Total
                    </label>
                    <p className="font-bold text-emerald-600 mt-1 text-lg">
                      {formatCurrency(selectedItem.hargaTotal)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Bidang
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedItem.bidang || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      OEM / NON OEM
                    </label>
                    <p className="font-medium text-slate-700 mt-1">
                      {selectedItem.oemNonOem || "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Level Resiko
                    </label>
                    <p
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getRiskColor(selectedItem.levelResikoInherent)}`}
                    >
                      {selectedItem.levelResikoInherent || "-"}
                    </p>
                  </div>
                </div>

                {selectedItem.alasanProgram && (
                  <div className="mb-5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Alasan Program
                    </label>
                    <p className="text-slate-600 mt-1 p-3 bg-blue-50 rounded-xl">
                      {selectedItem.alasanProgram}
                    </p>
                  </div>
                )}

                {selectedItem.keterangan && (
                  <div className="mb-5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Keterangan
                    </label>
                    <p className="text-slate-600 mt-1 p-3 bg-amber-50 rounded-xl">
                      {selectedItem.keterangan}
                    </p>
                  </div>
                )}

                <div className="bg-red-50 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <FiInfo className="text-red-600 text-sm mt-0.5" />
                    <div className="text-xs text-red-700">
                      <p>
                        Program ini dihapus pada:{" "}
                        {formatDate(selectedItem.dropDate)}
                      </p>
                      <p className="mt-1">
                        Status: {selectedItem.dropStatus || "DROP"}
                      </p>
                      <p className="mt-1">
                        Original NO:{" "}
                        {selectedItem.originalNo || selectedItem.no}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                >
                  Tutup
                </button>
                {userRole === "Admin" && (
                  <>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        confirmRestore(selectedItem);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-md transition"
                    >
                      <FiRotateCcw size={16} /> Restore Program
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        confirmPermanentDelete(selectedItem);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-md transition"
                    >
                      <FiTrash2 size={16} /> Hapus Permanen
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DropData;
