// pages/Dashboard/DataMapping.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  FiTrendingUp,
  FiDollarSign,
  FiPieChart,
  FiBarChart2,
  FiCalendar,
  FiTarget,
  FiDownload,
  FiFilter,
  FiRefreshCw,
  FiMap,
  FiGrid,
  FiList,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  ComposedChart,
} from "recharts";
import dataSheet from "../../api/dataSheetService";

// Skeleton Components
const SkeletonChart = () => (
  <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(15,23,42,0.035)] border border-slate-200/80 p-6 animate-pulse">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded-xl"></div>
        <div className="h-6 bg-gray-200 rounded w-32"></div>
      </div>
      <div className="w-24 h-8 bg-gray-200 rounded-lg"></div>
    </div>
    <div className="h-64 bg-gray-100 rounded-xl"></div>
  </div>
);

const SkeletonStatsCard = () => (
  <div className="bg-white rounded-[22px] border border-slate-200/80 shadow-sm p-5 animate-pulse">
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
      <div className="w-16 h-8 bg-gray-200 rounded-lg"></div>
    </div>
    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-32"></div>
  </div>
);

const DataMapping = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedCluster, setSelectedCluster] = useState("all");
  const [chartType, setChartType] = useState("bar");
  const [viewMode, setViewMode] = useState("chart");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const COLORS = [
    "#3B82F6",
    "#10B981",
    "#8B5CF6",
    "#F59E0B",
    "#EF4444",
    "#06B6D4",
    "#EC4899",
    "#6366F1",
  ];

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const allData = await dataSheet.getAllData();
      setData(allData);
    } catch (error) {
      showToast("Gagal memuat data: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Process data for visualizations
  const processedData = useMemo(() => {
    let filtered = [...data];

    if (selectedYear !== "all") {
      filtered = filtered.filter((item) => item.tahun === selectedYear);
    }
    if (selectedCluster !== "all") {
      filtered = filtered.filter(
        (item) => item.klusterProgram === selectedCluster,
      );
    }

    // Data per tahun
    const yearlyData = {};
    filtered.forEach((item) => {
      const year = item.tahun;
      if (!year) return;
      if (!yearlyData[year]) {
        yearlyData[year] = {
          year,
          totalPrograms: 0,
          totalBudget: 0,
          avgBudget: 0,
        };
      }
      yearlyData[year].totalPrograms++;
      yearlyData[year].totalBudget += parseFloat(item.hargaTotal) || 0;
    });

    Object.keys(yearlyData).forEach((year) => {
      yearlyData[year].avgBudget =
        yearlyData[year].totalBudget / yearlyData[year].totalPrograms;
    });

    const yearlyChartData = Object.values(yearlyData).sort(
      (a, b) => a.year - b.year,
    );

    // Data per cluster
    const clusterData = {};
    filtered.forEach((item) => {
      const cluster = item.klusterProgram;
      if (!cluster) return;
      if (!clusterData[cluster]) {
        clusterData[cluster] = {
          name: cluster,
          value: 0,
          budget: 0,
        };
      }
      clusterData[cluster].value++;
      clusterData[cluster].budget += parseFloat(item.hargaTotal) || 0;
    });

    const clusterChartData = Object.values(clusterData)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Data per sumber anggaran
    const budgetSourceData = {};
    filtered.forEach((item) => {
      const source = item.sumberAnggaran;
      if (!source) return;
      if (!budgetSourceData[source]) {
        budgetSourceData[source] = {
          name: source,
          value: 0,
          budget: 0,
        };
      }
      budgetSourceData[source].value++;
      budgetSourceData[source].budget += parseFloat(item.hargaTotal) || 0;
    });

    const budgetSourceChartData = Object.values(budgetSourceData);

    // Cumulative budget over years
    let cumulativeBudget = 0;
    const cumulativeData = yearlyChartData.map((item) => {
      cumulativeBudget += item.totalBudget;
      return {
        year: item.year,
        totalBudget: item.totalBudget,
        cumulativeBudget,
      };
    });

    // Top programs by budget
    const topPrograms = [...filtered]
      .sort(
        (a, b) =>
          (parseFloat(b.hargaTotal) || 0) - (parseFloat(a.hargaTotal) || 0),
      )
      .slice(0, 10)
      .map((item, idx) => ({
        rank: idx + 1,
        name:
          item.programKerja?.substring(0, 30) +
          (item.programKerja?.length > 30 ? "..." : ""),
        budget: parseFloat(item.hargaTotal) || 0,
        cluster: item.klusterProgram,
      }));

    // Risk distribution
    const riskData = {};
    filtered.forEach((item) => {
      const risk = item.levelResikoInherent;
      if (!risk) return;
      if (!riskData[risk]) {
        riskData[risk] = { name: risk, value: 0 };
      }
      riskData[risk].value++;
    });

    const riskChartData = Object.values(riskData);

    // Statistics
    const stats = {
      totalPrograms: filtered.length,
      totalBudget: filtered.reduce(
        (sum, item) => sum + (parseFloat(item.hargaTotal) || 0),
        0,
      ),
      uniqueYears: new Set(filtered.map((item) => item.tahun)).size,
      uniqueClusters: new Set(filtered.map((item) => item.klusterProgram)).size,
      avgBudgetPerProgram:
        filtered.length > 0
          ? filtered.reduce(
              (sum, item) => sum + (parseFloat(item.hargaTotal) || 0),
              0,
            ) / filtered.length
          : 0,
    };

    return {
      yearlyChartData,
      clusterChartData,
      budgetSourceChartData,
      cumulativeData,
      topPrograms,
      riskChartData,
      stats,
      filteredData: filtered,
    };
  }, [data, selectedYear, selectedCluster]);

  const years = useMemo(() => {
    const allYears = [
      ...new Set(data.map((item) => item.tahun).filter(Boolean)),
    ];
    return ["all", ...allYears.sort().reverse()];
  }, [data]);

  const clusters = useMemo(() => {
    const allClusters = [
      ...new Set(data.map((item) => item.klusterProgram).filter(Boolean)),
    ];
    return ["all", ...allClusters];
  }, [data]);

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
    if (num >= 1_000_000_000_000)
      return `Rp ${(num / 1_000_000_000_000).toFixed(1)}T`;
    if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)}M`;
    if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(1)}JT`;
    if (num >= 1_000) return `Rp ${(num / 1_000).toFixed(1)}RB`;
    return formatCurrency(amount);
  };

  const handleExport = () => {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        filters: { selectedYear, selectedCluster },
        statistics: processedData.stats,
        yearlyData: processedData.yearlyChartData,
        clusterData: processedData.clusterChartData,
        budgetSourceData: processedData.budgetSourceChartData,
        topPrograms: processedData.topPrograms,
        riskDistribution: processedData.riskChartData,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pemetaan-data-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Data berhasil diekspor", "success");
    } catch (error) {
      showToast("Gagal mengekspor data: " + error.message, "error");
    }
  };

  const resetFilters = () => {
    setSelectedYear("all");
    setSelectedCluster("all");
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white rounded-xl shadow-[0_12px_34px_rgba(15,23,42,.14)] p-3 border border-slate-200">
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          {payload.map((p, idx) => (
            <p key={idx} className="text-sm" style={{ color: p.color }}>
              {p.name}:{" "}
              {typeof p.value === "number" && p.name.includes("Budget")
                ? formatCurrencyShort(p.value)
                : p.value.toLocaleString("id-ID")}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-7">
        <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-5 rounded-[26px] border border-slate-700/40 bg-gradient-to-br from-[#101b34] via-[#172b4a] to-[#203e62] p-6 sm:p-8 shadow-[0_16px_34px_rgba(16,27,52,0.13)]">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="w-32 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonStatsCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => (
            <SkeletonChart key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-20 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
              toast.type === "success"
                ? "bg-teal-600 text-white"
                : "bg-rose-600 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <FiCheckCircle size={18} />
            ) : (
              <FiAlertCircle size={18} />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-5 rounded-[26px] border border-slate-700/40 bg-gradient-to-br from-[#101b34] via-[#172b4a] to-[#203e62] p-6 sm:p-8 shadow-[0_16px_34px_rgba(16,27,52,0.13)]">
        <div>
          <h1 className="text-2xl md:text-[30px] font-extrabold tracking-tight text-white">
            Pemetaan Data
          </h1>
          <p className="text-slate-300 mt-2 text-sm leading-6">
            Visualisasi data program dari tahun ke tahun
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() =>
              setViewMode(viewMode === "chart" ? "table" : "chart")
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-[13px] font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            {viewMode === "chart" ? <FiGrid size={16} /> : <FiMap size={16} />}
            <span>
              {viewMode === "chart" ? "Tampilan Tabel" : "Tampilan Grafik"}
            </span>
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-[13px] font-semibold text-white shadow-[0_6px_18px_rgba(14,165,233,0.22)] hover:bg-sky-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <FiDownload size={16} />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ y: -4 }}
          className="group relative overflow-hidden rounded-[22px] border border-slate-200/85 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.035)] hover:border-sky-200 hover:shadow-[0_12px_26px_rgba(15,23,42,0.075)] transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-sky-50/80 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative p-5 md:p-6 min-h-[172px]">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-2xl bg-sky-50 text-sky-700 border border-sky-100">
                <FiBarChart2 className="text-current text-xl" />
              </div>
              <div className="text-right">
                <div className="text-[28px] md:text-[32px] font-extrabold tracking-tight text-slate-900 tabular-nums">
                  {processedData.stats.totalPrograms}
                </div>
              </div>
            </div>
            <h3 className="text-slate-700 font-semibold mb-1 text-sm">
              Total Program
            </h3>
            <p className="text-xs text-slate-500">
              Dari {processedData.stats.uniqueYears} tahun aktif
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-sky-500 transform scale-x-0 group-hover:scale-x-100 transition-transform"></div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="group relative overflow-hidden rounded-[22px] border border-slate-200/85 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.035)] hover:border-sky-200 hover:shadow-[0_12px_26px_rgba(15,23,42,0.075)] transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-50/80 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative p-5 md:p-6 min-h-[172px]">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-2xl bg-teal-50 text-teal-700 border border-teal-100">
                <FiDollarSign className="text-current text-xl" />
              </div>
              <div className="text-right">
                <div className="text-[25px] md:text-[27px] font-extrabold tracking-tight text-slate-900 tabular-nums">
                  {formatCurrencyShort(processedData.stats.totalBudget)}
                </div>
              </div>
            </div>
            <h3 className="text-slate-700 font-semibold mb-1 text-sm">
              Total Anggaran
            </h3>
            <p className="text-xs text-slate-500">Keseluruhan program</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-teal-500 transform scale-x-0 group-hover:scale-x-100 transition-transform"></div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="group relative overflow-hidden rounded-[22px] border border-slate-200/85 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.035)] hover:border-sky-200 hover:shadow-[0_12px_26px_rgba(15,23,42,0.075)] transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative p-5 md:p-6 min-h-[172px]">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                <FiTrendingUp className="text-current text-xl" />
              </div>
              <div className="text-right">
                <div className="text-[25px] md:text-[28px] font-extrabold tracking-tight text-slate-900 tabular-nums">
                  {formatCurrencyShort(processedData.stats.avgBudgetPerProgram)}
                </div>
              </div>
            </div>
            <h3 className="text-slate-700 font-semibold mb-1 text-sm">
              Rata-rata per Program
            </h3>
            <p className="text-xs text-slate-500">Nilai anggaran rata-rata</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform"></div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="group relative overflow-hidden rounded-[22px] border border-slate-200/85 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.035)] hover:border-sky-200 hover:shadow-[0_12px_26px_rgba(15,23,42,0.075)] transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/70 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative p-5 md:p-6 min-h-[172px]">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100">
                <FiTarget className="text-current text-xl" />
              </div>
              <div className="text-right">
                <div className="text-[28px] md:text-[32px] font-extrabold tracking-tight text-slate-900 tabular-nums">
                  {processedData.stats.uniqueClusters}
                </div>
              </div>
            </div>
            <h3 className="text-slate-700 font-semibold mb-1 text-sm">
              Kluster Aktif
            </h3>
            <p className="text-xs text-slate-500">Kategori program</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform"></div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="rounded-[22px] border border-slate-200/85 bg-white p-4 sm:p-5 shadow-[0_4px_20px_rgba(15,23,42,.035)]">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          <div className="flex-1 flex items-center gap-2">
            <FiCalendar className="text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
            >
              <option value="all">Semua Tahun</option>
              {years
                .filter((y) => y !== "all")
                .map((year) => (
                  <option key={year} value={year}>
                    Tahun {year}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <FiTarget className="text-slate-400" />
            <select
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
            >
              <option value="all">Semua Kluster</option>
              {clusters
                .filter((c) => c !== "all")
                .map((cluster) => (
                  <option key={cluster} value={cluster}>
                    {cluster}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={resetFilters}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[13px] font-semibold text-slate-700 hover:border-sky-300 hover:bg-sky-50 transition-all"
            >
              <FiRefreshCw size={16} /> Reset
            </button>
          </div>
        </div>
        {(selectedYear !== "all" || selectedCluster !== "all") && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <FiFilter size={14} />
            <span>Menampilkan {processedData.filteredData.length} program</span>
            <button
              onClick={resetFilters}
              className="text-sky-700 font-semibold hover:underline"
            >
              Hapus filter
            </button>
          </div>
        )}
      </div>

      {/* Visualization Content */}
      {viewMode === "chart" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Chart 1: Trend Program per Tahun */}
          <div className="min-w-0 rounded-[22px] border border-slate-200/85 bg-white p-4 sm:p-6 shadow-[0_4px_20px_rgba(15,23,42,.035)] hover:shadow-[0_12px_26px_rgba(15,23,42,.065)] transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100">
                  <FiTrendingUp className="text-sky-700 text-lg" />
                </div>
                <h3 className="text-[15px] sm:text-base font-bold tracking-tight text-slate-800">
                  Trend Program per Tahun
                </h3>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setChartType("bar")}
                  className={`p-1.5 rounded-lg transition ${chartType === "bar" ? "bg-blue-100 text-blue-600" : "text-slate-400"}`}
                >
                  <FiBarChart2 size={16} />
                </button>
                <button
                  onClick={() => setChartType("line")}
                  className={`p-1.5 rounded-lg transition ${chartType === "line" ? "bg-blue-100 text-blue-600" : "text-slate-400"}`}
                >
                  <FiTrendingUp size={16} />
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              {chartType === "bar" ? (
                <BarChart data={processedData.yearlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="year" stroke="#6B7280" fontSize={12} />
                  <YAxis
                    yAxisId="left"
                    stroke="#6B7280"
                    fontSize={12}
                    tickFormatter={(v) => formatCurrencyShort(v)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#6B7280"
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="totalBudget"
                    name="Total Anggaran"
                    fill="#3B82F6"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="totalPrograms"
                    name="Jumlah Program"
                    fill="#10B981"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              ) : (
                <LineChart data={processedData.yearlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="year" stroke="#6B7280" fontSize={12} />
                  <YAxis
                    yAxisId="left"
                    stroke="#6B7280"
                    fontSize={12}
                    tickFormatter={(v) => formatCurrencyShort(v)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#6B7280"
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="totalBudget"
                    name="Total Anggaran"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ fill: "#3B82F6", r: 5 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalPrograms"
                    name="Jumlah Program"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: "#10B981", r: 5 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Chart 2: Distribusi Kluster */}
          <div className="min-w-0 rounded-[22px] border border-slate-200/85 bg-white p-4 sm:p-6 shadow-[0_4px_20px_rgba(15,23,42,.035)] hover:shadow-[0_12px_26px_rgba(15,23,42,.065)] transition-all">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                <FiPieChart className="text-indigo-700 text-lg" />
              </div>
              <h3 className="text-[15px] sm:text-base font-bold tracking-tight text-slate-800">
                Distribusi per Kluster
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={processedData.clusterChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                  labelLine={{ stroke: "#9CA3AF", strokeWidth: 1 }}
                >
                  {processedData.clusterChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 3: Cumulative Budget Growth */}
          <div className="min-w-0 rounded-[22px] border border-slate-200/85 bg-white p-4 sm:p-6 shadow-[0_4px_20px_rgba(15,23,42,.035)] hover:shadow-[0_12px_26px_rgba(15,23,42,.065)] transition-all">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-100">
                <FiDollarSign className="text-teal-700 text-lg" />
              </div>
              <h3 className="text-[15px] sm:text-base font-bold tracking-tight text-slate-800">
                Akumulasi Anggaran per Tahun
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={processedData.cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="year" stroke="#6B7280" fontSize={12} />
                <YAxis
                  stroke="#6B7280"
                  fontSize={12}
                  tickFormatter={(v) => formatCurrencyShort(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="cumulativeBudget"
                  name="Akumulasi Anggaran"
                  stackId="1"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="totalBudget"
                  name="Anggaran Tahunan"
                  stackId="2"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 4: Top 10 Programs by Budget */}
          <div className="min-w-0 rounded-[22px] border border-slate-200/85 bg-white p-4 sm:p-6 shadow-[0_4px_20px_rgba(15,23,42,.035)] hover:shadow-[0_12px_26px_rgba(15,23,42,.065)] transition-all">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <FiBarChart2 className="text-amber-700 text-lg" />
              </div>
              <h3 className="text-[15px] sm:text-base font-bold tracking-tight text-slate-800">
                Top 10 Program (Anggaran Tertinggi)
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={processedData.topPrograms}
                layout="vertical"
                margin={{ left: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCurrencyShort(v)}
                  stroke="#6B7280"
                  fontSize={12}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#6B7280"
                  fontSize={11}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="budget"
                  name="Anggaran"
                  fill="#F59E0B"
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 5: Risk Distribution */}
          <div className="min-w-0 rounded-[22px] border border-slate-200/85 bg-white p-4 sm:p-6 shadow-[0_4px_20px_rgba(15,23,42,.035)] hover:shadow-[0_12px_26px_rgba(15,23,42,.065)] transition-all">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                <FiAlertCircle className="text-rose-700 text-lg" />
              </div>
              <h3 className="text-[15px] sm:text-base font-bold tracking-tight text-slate-800">
                Distribusi Level Risiko
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={processedData.riskChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {processedData.riskChartData.map((entry, index) => {
                    const riskColors = {
                      Rendah: "#10B981",
                      Moderat: "#F59E0B",
                      Tinggi: "#EF4444",
                      "Sangat Tinggi": "#7C3AED",
                      Ekstrem: "#991B1B",
                    };
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          riskColors[entry.name] ||
                          COLORS[index % COLORS.length]
                        }
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 6: Sumber Anggaran Distribution */}
          <div className="min-w-0 rounded-[22px] border border-slate-200/85 bg-white p-4 sm:p-6 shadow-[0_4px_20px_rgba(15,23,42,.035)] hover:shadow-[0_12px_26px_rgba(15,23,42,.065)] transition-all">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100">
                <FiPieChart className="text-sky-700 text-lg" />
              </div>
              <h3 className="text-[15px] sm:text-base font-bold tracking-tight text-slate-800">
                Distribusi Sumber Anggaran
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={processedData.budgetSourceChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {processedData.budgetSourceChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        // Table View
        <div className="overflow-hidden rounded-[22px] border border-slate-200/85 bg-white shadow-[0_4px_20px_rgba(15,23,42,.035)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/90 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    No
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Program Kerja
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Kluster
                  </th>
                  <th className="px-4 py-4 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Tahun
                  </th>
                  <th className="px-4 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Anggaran
                  </th>
                  <th className="px-4 py-4 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Risiko
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Sumber
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedData.filteredData.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-sky-50/50 transition-all duration-200"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">
                        {item.programKerja}
                      </div>
                      {item.alasanProgram && (
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {item.alasanProgram}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                        {item.klusterProgram
                          ?.split(" ")
                          .slice(0, 2)
                          .join(" ") || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex px-2 py-1 text-xs font-bold rounded-lg bg-gray-100 text-gray-700">
                        {item.tahun || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrencyShort(item.hargaTotal)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.levelResikoInherent && (
                        <span
                          className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            item.levelResikoInherent === "Rendah"
                              ? "bg-emerald-100 text-emerald-700"
                              : item.levelResikoInherent === "Moderat"
                                ? "bg-amber-100 text-amber-700"
                                : item.levelResikoInherent === "Tinggi"
                                  ? "bg-orange-100 text-orange-700"
                                  : item.levelResikoInherent === "Sangat Tinggi"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {item.levelResikoInherent}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {item.sumberAnggaran || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {processedData.filteredData.length === 0 && (
            <div className="p-12 text-center">
              <FiAlertCircle className="text-4xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                Tidak ada data untuk filter yang dipilih
              </p>
            </div>
          )}
        </div>
      )}

      {/* Summary Footer */}
      <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 text-center">
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <FiClock size={12} />
            <span>
              Terakhir diperbarui: {new Date().toLocaleString("id-ID")}
            </span>
          </div>
          <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
          <div className="flex items-center gap-1">
            <FiBarChart2 size={12} />
            <span>{processedData.stats.totalPrograms} Program</span>
          </div>
          <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
          <div className="flex items-center gap-1">
            <FiDollarSign size={12} />
            <span>{formatCurrencyShort(processedData.stats.totalBudget)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataMapping;
