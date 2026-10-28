// pages/Dashboard/Statistics.jsx
import React, { useState } from "react";
import {
  FiTrendingUp,
  FiDollarSign,
  FiPieChart,
  FiBarChart2,
  FiDownload,
  FiCalendar,
  FiTarget,
  FiRefreshCw,
  FiAlertCircle,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

// Skeleton Loader Components
const SkeletonStatsCard = () => (
  <div className="group relative bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
    <div className="relative p-5 md:p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-gray-200">
          <div className="w-6 h-6"></div>
        </div>
        <div className="text-right">
          <div className="h-8 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
      <div className="h-5 bg-gray-200 rounded w-32 mb-1"></div>
      <div className="h-3 bg-gray-200 rounded w-40"></div>
    </div>
  </div>
);

const SkeletonTable = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
    <div className="flex items-center gap-2 mb-6">
      <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
      <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
    </div>
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
);

const SkeletonMetrics = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
    <div className="flex items-center gap-2 mb-6">
      <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
      <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
    </div>
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i}>
          <div className="h-4 bg-gray-200 rounded w-40 mb-2 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
);

const Statistics = ({ stats, loading }) => {
  const [selectedYear, setSelectedYear] = useState("all");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  const formatCurrency = (amount) => {
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

  const handleExport = () => {
    try {
      const data = {
        summary: stats,
        exportDate: new Date().toISOString(),
        totalPrograms: stats.totalPrograms,
        totalBudget: stats.totalBudget,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rjpu-statistics-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Data berhasil diekspor", "success");
    } catch (error) {
      showToast("Gagal mengekspor data: " + error.message, "error");
    }
  };

  // Skeleton Loading View
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="w-32 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
        </div>

        {/* Detailed Tables Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonTable />
          <SkeletonTable />
          <SkeletonTable />
          <SkeletonMetrics />
        </div>
      </div>
    );
  }

  const totalYears = Object.keys(stats.programsByYear).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-20 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
              toast.type === "success"
                ? "bg-emerald-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <FiTrendingUp size={18} />
            ) : (
              <FiAlertCircle size={18} />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Statistik Program
          </h1>
          <p className="text-gray-500 mt-1">
            Analisis data Rencana Jangka Panjang Unit
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
        >
          <FiDownload size={16} />
          <span>Export Data</span>
        </button>
      </div>

      {/* Summary Cards - Same style as Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <motion.div
          whileHover={{ y: -4 }}
          className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative p-5 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <FiTrendingUp className="text-white text-xl" />
              </div>
              <div className="text-right">
                <div className="text-2xl md:text-3xl font-bold text-blue-600">
                  {stats.totalPrograms}
                </div>
              </div>
            </div>
            <h3 className="text-gray-700 font-semibold mb-1">Total Program</h3>
            <p className="text-xs text-gray-400">Keseluruhan program kerja</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative p-5 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
                <FiDollarSign className="text-white text-xl" />
              </div>
              <div className="text-right">
                <div className="text-xl md:text-2xl font-bold text-emerald-600 break-words max-w-[180px]">
                  {formatCurrencyShort(stats.totalBudget)}
                </div>
              </div>
            </div>
            <h3 className="text-gray-700 font-semibold mb-1">Total Anggaran</h3>
            <p className="text-xs text-gray-400">Keseluruhan anggaran</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative p-5 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                <FiPieChart className="text-white text-xl" />
              </div>
              <div className="text-right">
                <div className="text-2xl md:text-3xl font-bold text-purple-600">
                  {formatCurrencyShort(
                    stats.totalBudget / (stats.totalPrograms || 1),
                  )}
                </div>
              </div>
            </div>
            <h3 className="text-gray-700 font-semibold mb-1">
              Rata-rata per Program
            </h3>
            <p className="text-xs text-gray-400">Nilai rata-rata anggaran</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative p-5 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
                <FiTarget className="text-white text-xl" />
              </div>
              <div className="text-right">
                <div className="text-2xl md:text-3xl font-bold text-orange-600">
                  {Object.keys(stats.programsByCluster).length}
                </div>
              </div>
            </div>
            <h3 className="text-gray-700 font-semibold mb-1">Kluster Aktif</h3>
            <p className="text-xs text-gray-400">Kategori program</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </motion.div>
      </div>

      {/* Year Filter */}
      {totalYears > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-blue-600 text-lg" />
              <span className="text-sm text-gray-600">
                Filter berdasarkan tahun:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedYear("all")}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                  selectedYear === "all"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Semua Tahun
              </button>
              {Object.keys(stats.programsByYear)
                .sort()
                .reverse()
                .map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                      selectedYear === year
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Tahun {year}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Year Detail */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-xl bg-blue-100">
                <FiCalendar className="text-blue-600 text-lg" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">
                Detail per Tahun
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Tahun
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Anggaran
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Rata-rata
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(stats.programsByYear)
                    .filter(
                      ([year]) =>
                        selectedYear === "all" || year === selectedYear,
                    )
                    .sort((a, b) => b[0] - a[0])
                    .map(([year, data]) => (
                      <tr
                        key={year}
                        className="hover:bg-blue-50/30 transition-all duration-200"
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                          {year}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {data.totalProgram}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">
                          {formatCurrencyShort(data.totalAnggaran)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-500">
                          {formatCurrencyShort(
                            data.totalAnggaran / data.totalProgram,
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {Object.entries(stats.programsByYear).filter(
                ([year]) => selectedYear === "all" || year === selectedYear,
              ).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Tidak ada data tahunan untuk filter ini
                </div>
              )}
            </div>
          </div>
        </div>

        {/* By Cluster Detail */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-xl bg-purple-100">
                <FiTarget className="text-purple-600 text-lg" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">
                Detail per Kluster
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Kluster
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Anggaran
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Persentase
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(stats.programsByCluster)
                    .sort((a, b) => b[1].totalAnggaran - a[1].totalAnggaran)
                    .map(([cluster, data]) => (
                      <tr
                        key={cluster}
                        className="hover:bg-purple-50/30 transition-all duration-200"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          {cluster}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {data.totalProgram}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">
                          {formatCurrencyShort(data.totalAnggaran)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, (data.totalAnggaran / stats.totalBudget) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-gray-600 min-w-[45px]">
                              {Math.round(
                                (data.totalAnggaran / stats.totalBudget) * 100,
                              )}
                              %
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {Object.entries(stats.programsByCluster).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Tidak ada data kluster
                </div>
              )}
            </div>
          </div>
        </div>

        {/* By Budget Source */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-xl bg-orange-100">
                <FiPieChart className="text-orange-600 text-lg" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">
                Detail per Sumber Anggaran
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Sumber Anggaran
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Anggaran
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Persentase
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(stats.programsByBudget)
                    .sort((a, b) => b[1].totalAnggaran - a[1].totalAnggaran)
                    .map(([source, data]) => (
                      <tr
                        key={source}
                        className="hover:orange-blue-50/30 transition-all duration-200"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          {source}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {data.totalProgram}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">
                          {formatCurrencyShort(data.totalAnggaran)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, (data.totalAnggaran / stats.totalBudget) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-gray-600 min-w-[45px]">
                              {Math.round(
                                (data.totalAnggaran / stats.totalBudget) * 100,
                              )}
                              %
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {Object.entries(stats.programsByBudget).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Tidak ada data sumber anggaran
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-xl bg-green-100">
                <FiBarChart2 className="text-green-600 text-lg" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">
                Indikator Kinerja
              </h3>
            </div>
            <div className="space-y-5">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                <p className="text-sm text-blue-600 mb-1 font-semibold">
                  Rata-rata Program per Tahun
                </p>
                <p className="text-3xl font-bold text-blue-700">
                  {(stats.totalPrograms / totalYears).toFixed(1)}
                </p>
                <p className="text-xs text-blue-400 mt-1">
                  dari {totalYears} tahun aktif
                </p>
              </div>
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl">
                <p className="text-sm text-emerald-600 mb-1 font-semibold">
                  Rata-rata Anggaran per Tahun
                </p>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatCurrencyShort(stats.totalBudget / totalYears)}
                </p>
                <p className="text-xs text-emerald-400 mt-1">
                  total {formatCurrencyShort(stats.totalBudget)}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                <p className="text-sm text-purple-600 mb-1 font-semibold">
                  Efisiensi Anggaran
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-purple-200 rounded-full overflow-hidden">
                    <div
                      className="h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: "75%" }}
                    />
                  </div>
                  <span className="text-lg font-bold text-purple-600">75%</span>
                </div>
                <p className="text-xs text-purple-400 mt-2">
                  Target efisiensi 80% • Realisasi 75%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 text-center">
        <p className="text-xs text-gray-500">
          Data diperbarui secara real-time dari Google Sheets •{" "}
          {new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
};

export default Statistics;
