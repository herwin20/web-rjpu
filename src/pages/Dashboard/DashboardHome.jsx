// pages/Dashboard/DashboardHome.jsx
import React, { useState, useMemo } from "react";
import {
  FiDatabase,
  FiDollarSign,
  FiCalendar,
  FiPieChart,
  FiTrendingUp,
  FiTarget,
  FiBarChart2,
  FiActivity,
  FiAward,
  FiClock,
  FiChevronRight,
  FiUsers,
  FiBriefcase,
  FiLayers,
  FiRefreshCw,
  FiInfo,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

const DashboardHome = ({ stats, loading, user }) => {
  const [selectedYear, setSelectedYear] = useState("all");
  const [showAllPrograms, setShowAllPrograms] = useState(false);

  // Format currency dengan truncate untuk tampilan card
  const formatCurrency = (amount, truncate = false) => {
    if (!amount || amount === 0) return "Rp 0";

    const formatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    const fullAmount = formatter.format(amount);

    if (truncate) {
      // Truncate untuk tampilan card
      if (amount >= 1_000_000_000_000) {
        return `Rp ${(amount / 1_000_000_000_000).toFixed(1)}T`;
      }
      if (amount >= 1_000_000_000) {
        return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`;
      }
      if (amount >= 1_000_000) {
        return `Rp ${(amount / 1_000_000).toFixed(1)}JT`;
      }
      if (amount >= 1_000) {
        return `Rp ${(amount / 1_000).toFixed(1)}RB`;
      }
      return fullAmount;
    }

    return fullAmount;
  };

  const formatNumber = (num) => {
    if (!num) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  // Filter stats berdasarkan tahun yang dipilih
  const filteredStats = useMemo(() => {
    if (selectedYear === "all" || !stats.programsByYear[selectedYear]) {
      return stats;
    }

    const yearData = stats.programsByYear[selectedYear];
    return {
      ...stats,
      totalPrograms: yearData.totalProgram,
      totalBudget: yearData.totalAnggaran,
      programsByYear: { [selectedYear]: yearData },
      programsByCluster: yearData.programsByCluster || {},
      programsByBudget: yearData.programsByBudget || {},
    };
  }, [stats, selectedYear]);

  // Calculate additional stats
  const averageBudget = useMemo(() => {
    if (filteredStats.totalPrograms === 0) return 0;
    return filteredStats.totalBudget / filteredStats.totalPrograms;
  }, [filteredStats.totalBudget, filteredStats.totalPrograms]);

  const topCluster = useMemo(() => {
    if (Object.keys(filteredStats.programsByCluster).length === 0) return null;
    return Object.entries(filteredStats.programsByCluster).reduce((a, b) =>
      a[1].totalProgram > b[1].totalProgram ? a : b,
    );
  }, [filteredStats.programsByCluster]);

  const topYear = useMemo(() => {
    if (Object.keys(filteredStats.programsByYear).length === 0) return null;
    return Object.entries(filteredStats.programsByYear).reduce((a, b) =>
      a[1].totalProgram > b[1].totalProgram ? a : b,
    );
  }, [filteredStats.programsByYear]);

  // Get recent programs with proper budget
  const recentPrograms = useMemo(() => {
    const programs = [];
    Object.entries(stats.programsByYear).forEach(([year, data]) => {
      if (data.programList && Array.isArray(data.programList)) {
        data.programList.forEach((program) => {
          if (program) {
            programs.push({
              year,
              program: program.nama || program.programKerja || program,
              anggaran: program.anggaran || program.estimasiAnggaran || 0,
            });
          }
        });
      }
    });
    return programs.slice(0, showAllPrograms ? 10 : 5);
  }, [stats.programsByYear, showAllPrograms]);

  // Skeleton Loading Component
  const SkeletonLoader = () => (
    <div className="min-h-0 bg-transparent p-0">
      <div className="mx-auto max-w-[1600px] space-y-6 lg:space-y-7">
        {/* Welcome Section Skeleton */}
        <div className="bg-gradient-to-br from-[#101b34] via-[#172c50] to-[#234b7d] rounded-[26px] p-6 md:p-8 animate-pulse">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-white/20 rounded-[22px]"></div>
                <div>
                  <div className="h-7 w-48 bg-white/20 rounded"></div>
                  <div className="h-4 w-64 bg-white/20 rounded mt-2"></div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-24 h-16 bg-white/20 rounded-xl"></div>
              <div className="w-24 h-16 bg-white/20 rounded-xl"></div>
            </div>
          </div>
        </div>

        {/* Stat Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200/80 rounded-[22px] p-5 animate-pulse"
            >
              <div className="flex justify-between">
                <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                <div className="w-20 h-8 bg-gray-200 rounded"></div>
              </div>
              <div className="w-32 h-4 bg-gray-200 rounded mt-4"></div>
              <div className="w-24 h-3 bg-slate-100 rounded mt-2"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Empty State Component
  const EmptyState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200/80 rounded-[22px] shadow-[0_3px_18px_rgba(16,27,52,.035)] p-8 md:p-12 text-center"
    >
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FiDatabase className="text-4xl text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">
        Belum Ada Program
      </h3>
      <p className="text-slate-400 text-sm max-w-md mx-auto">
        Silakan tambahkan program kerja baru melalui menu Program Kerja untuk
        mulai melihat statistik dashboard.
      </p>
    </motion.div>
  );

  // Tooltip Component
  const Tooltip = ({ children, content }) => (
    <div className="relative inline-flex items-center group cursor-help ml-1">
      <FiInfo className="text-slate-400 text-xs" />
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
        {content}
      </div>
    </div>
  );

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <div className="min-h-0 bg-transparent p-0">
      <div className="mx-auto max-w-[1600px] space-y-6 lg:space-y-7">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-[#101b34] via-[#172c50] to-[#234b7d] rounded-[26px] shadow-[0_20px_55px_rgba(16,27,52,.14)]"
        >
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>

          <div className="relative p-6 md:p-8 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-12 h-12 bg-white/20 rounded-[22px] flex items-center justify-center backdrop-blur-sm">
                    <FiUsers className="text-2xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                      Selamat datang, {user?.nama || "User"}!
                    </h1>
                    <p className="text-sky-100 text-sm md:text-base mt-1">
                      Sistem Informasi Rencana Jangka Panjang Unit (RJPU)
                    </p>
                  </div>
                </div>
              </div>

              {/* Year Filter */}
              <div className="flex flex-wrap gap-3 items-center">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white border border-white/30 cursor-pointer hover:bg-white/30 transition-colors"
                  aria-label="Filter tahun program"
                >
                  <option value="all" className="text-gray-900">
                    Semua Tahun
                  </option>
                  {Object.keys(stats.programsByYear)
                    .sort()
                    .reverse()
                    .map((year) => (
                      <option key={year} value={year} className="text-gray-900">
                        Tahun {year}
                      </option>
                    ))}
                </select>

                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                  <p className="text-xs text-sky-100">Total Program</p>
                  <p className="text-2xl font-bold">
                    {filteredStats.totalPrograms}
                  </p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                  <p className="text-xs text-sky-100">Total Anggaran</p>
                  <p className="text-base font-bold tracking-tight truncate max-w-[140px]">
                    {formatCurrency(filteredStats.totalBudget, true)}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-white/20">
              <div>
                <p className="text-xs text-sky-100">Rata-rata Anggaran</p>
                <p className="text-sm font-semibold truncate">
                  {formatCurrency(averageBudget, true)}
                </p>
              </div>
              <div>
                <p className="text-xs text-sky-100">Program per Kluster</p>
                <p className="text-sm font-semibold">
                  {(
                    filteredStats.totalPrograms /
                    Math.max(
                      1,
                      Object.keys(filteredStats.programsByCluster).length,
                    )
                  ).toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-xs text-sky-100">Sumber Anggaran</p>
                <p className="text-sm font-semibold">
                  {Object.keys(filteredStats.programsByBudget).length} jenis
                </p>
              </div>
              <div>
                <p className="text-xs text-sky-100">Efisiensi</p>
                <p className="text-sm font-semibold">
                  {filteredStats.totalPrograms > 0 ? "Aktif" : "Belum ada"}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Empty State */}
        {filteredStats.totalPrograms === 0 && <EmptyState />}

        {/* Main Content - Only show if data exists */}
        {filteredStats.totalPrograms > 0 && (
          <>
            {/* Stat Cards - Enhanced with better text handling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  title: "Total Program",
                  value: filteredStats.totalPrograms,
                  displayValue:
                    filteredStats.totalPrograms.toLocaleString("id-ID"),
                  icon: FiDatabase,
                  gradient: "from-blue-500 to-blue-600",
                  bgGradient: "from-blue-50 to-blue-100",
                  textColor: "text-blue-600",
                  desc: `${Object.keys(filteredStats.programsByCluster).length} kluster aktif`,
                  fullValue:
                    filteredStats.totalPrograms.toLocaleString("id-ID"),
                },
                {
                  title: "Total Anggaran",
                  value: filteredStats.totalBudget,
                  displayValue: formatCurrency(filteredStats.totalBudget, true),
                  fullValue: formatCurrency(filteredStats.totalBudget, false),
                  icon: FiDollarSign,
                  gradient: "from-emerald-500 to-emerald-600",
                  bgGradient: "from-emerald-50 to-emerald-100",
                  textColor: "text-emerald-600",
                  desc: `Rata-rata ${formatCurrency(averageBudget, true)} per program`,
                },
                {
                  title: "Tahun Aktif",
                  value: Object.keys(filteredStats.programsByYear).length,
                  displayValue: Object.keys(filteredStats.programsByYear)
                    .length,
                  icon: FiCalendar,
                  gradient: "from-purple-500 to-purple-600",
                  bgGradient: "from-purple-50 to-purple-100",
                  textColor: "text-purple-600",
                  desc: topYear ? `Terbanyak ${topYear[0]}` : "Belum ada data",
                  fullValue: `${Object.keys(filteredStats.programsByYear).length} tahun`,
                },
                {
                  title: "Kluster Program",
                  value: Object.keys(filteredStats.programsByCluster).length,
                  displayValue: Object.keys(filteredStats.programsByCluster)
                    .length,
                  icon: FiBriefcase,
                  gradient: "from-orange-500 to-orange-600",
                  bgGradient: "from-orange-50 to-orange-100",
                  textColor: "text-orange-600",
                  desc: topCluster
                    ? `Terbanyak ${topCluster[0]}`
                    : "Belum ada data",
                  fullValue: `${Object.keys(filteredStats.programsByCluster).length} kluster`,
                },
              ].map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -4 }}
                    className="group relative bg-white border border-slate-200/80 rounded-[22px] shadow-[0_3px_18px_rgba(16,27,52,.035)] hover:shadow-[0_20px_55px_rgba(16,27,52,.14)] transition-all duration-300 overflow-hidden"
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                    ></div>
                    <div className="relative p-5 md:p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg shrink-0`}
                        >
                          <Icon className="text-white text-xl" />
                        </div>
                        <div className="text-right">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: index * 0.1 + 0.2 }}
                            className={`text-2xl md:text-3xl font-extrabold tracking-tight ${card.textColor} break-words max-w-[150px] md:max-w-[180px]`}
                            title={card.fullValue}
                          >
                            {card.displayValue}
                          </motion.div>
                          {card.fullValue &&
                            card.fullValue !== card.displayValue && (
                              <p className="text-[10px] text-slate-400 mt-1 hidden md:block">
                                {card.fullValue}
                              </p>
                            )}
                        </div>
                      </div>
                      <h3 className="text-slate-700 font-semibold mb-1 text-sm md:text-base">
                        {card.title}
                        <Tooltip content={card.fullValue} />
                      </h3>
                      <p className="text-xs text-slate-400 truncate">
                        {card.desc}
                      </p>
                    </div>
                    <div
                      className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}
                    ></div>
                  </motion.div>
                );
              })}
            </div>

            {/* Achievement Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-r from-[#172c50] to-[#244b7c] rounded-[22px] p-4 text-white shadow-lg"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <FiAward className="text-2xl" />
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Pencapaian</p>
                    <p className="font-bold text-sm sm:text-base">
                      {filteredStats.totalPrograms} Program •{" "}
                      {Object.keys(filteredStats.programsByYear).length} Tahun
                      Aktif •{" "}
                      {Object.keys(filteredStats.programsByCluster).length}{" "}
                      Kluster
                    </p>
                  </div>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-xs opacity-80">Total Anggaran Terkelola</p>
                  <p className="text-lg sm:text-xl font-bold">
                    {formatCurrency(filteredStats.totalBudget, true)}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Program distribution — presentation only */}
            <div className="flex flex-wrap items-end justify-between gap-2 pt-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-600">
                  PORTFOLIO OVERVIEW
                </p>
                <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">
                  Distribusi Program
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Berdasarkan tahun dan kluster
              </p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Program by Year */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white border border-slate-200/80 rounded-[22px] shadow-[0_3px_18px_rgba(16,27,52,.035)] hover:shadow-[0_12px_30px_rgba(16,27,52,.08)] transition-all overflow-hidden"
              >
                <div className="bg-slate-50 px-6 py-4 border-b">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                      <FiBarChart2 className="text-sky-600" />
                      Program per Tahun
                    </h3>
                    <span className="text-xs px-2 py-1 bg-sky-100 text-sky-600 rounded-full whitespace-nowrap">
                      Total: {filteredStats.totalPrograms} program
                    </span>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {Object.entries(filteredStats.programsByYear)
                    .sort((a, b) => b[0] - a[0])
                    .map(([year, data], idx) => (
                      <motion.div
                        key={year}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-semibold text-slate-700 flex items-center gap-2">
                            <span className="w-2 h-2 bg-sky-600 rounded-full"></span>
                            Tahun {year}
                          </span>
                          <span className="text-slate-500 font-medium">
                            {data.totalProgram} program
                          </span>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(data.totalProgram / filteredStats.totalPrograms) * 100}%`,
                              }}
                              transition={{ duration: 0.8, delay: idx * 0.1 }}
                              className="bg-gradient-to-r from-sky-500 to-blue-600 h-3 rounded-full relative"
                            >
                              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </motion.div>
                          </div>
                          <span className="absolute right-0 -top-5 text-xs text-slate-400">
                            {Math.round(
                              (data.totalProgram /
                                filteredStats.totalPrograms) *
                                100,
                            )}
                            %
                          </span>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </motion.div>

              {/* Program by Cluster */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white border border-slate-200/80 rounded-[22px] shadow-[0_3px_18px_rgba(16,27,52,.035)] hover:shadow-[0_12px_30px_rgba(16,27,52,.08)] transition-all overflow-hidden"
              >
                <div className="bg-slate-50 px-6 py-4 border-b">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                      <FiTarget className="text-indigo-600" />
                      Program per Kluster
                    </h3>
                    <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-600 rounded-full whitespace-nowrap">
                      {Object.keys(filteredStats.programsByCluster).length}{" "}
                      kluster
                    </span>
                  </div>
                </div>
                <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto">
                  {Object.entries(filteredStats.programsByCluster)
                    .sort((a, b) => b[1].totalProgram - a[1].totalProgram)
                    .map(([cluster, data], idx) => (
                      <motion.div
                        key={cluster}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="font-medium text-slate-700 truncate flex-1 mr-2"
                            title={cluster}
                          >
                            {cluster}
                          </span>
                          <span className="text-sm font-semibold text-indigo-600 shrink-0">
                            {data.totalProgram}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(data.totalProgram / filteredStats.totalPrograms) * 100}%`,
                              }}
                              transition={{ duration: 0.6, delay: idx * 0.1 }}
                              className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-2 rounded-full"
                            ></motion.div>
                          </div>
                          <span className="text-xs text-slate-400 w-12 text-right shrink-0">
                            {Math.round(
                              (data.totalProgram /
                                filteredStats.totalPrograms) *
                                100,
                            )}
                            %
                          </span>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </motion.div>
            </div>

            {/* Financial insights — presentation only */}
            <div className="flex flex-wrap items-end justify-between gap-2 pt-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-600">
                  BUDGET INSIGHTS
                </p>
                <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">
                  Analisis Anggaran
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Berdasarkan tahun dan sumber dana
              </p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Budget by Year */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white border border-slate-200/80 rounded-[22px] shadow-[0_3px_18px_rgba(16,27,52,.035)] hover:shadow-[0_12px_30px_rgba(16,27,52,.08)] transition-all overflow-hidden"
              >
                <div className="bg-slate-50 px-6 py-4 border-b">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                      <FiTrendingUp className="text-emerald-600" />
                      Anggaran per Tahun
                    </h3>
                  </div>
                </div>
                <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto">
                  {Object.entries(filteredStats.programsByYear)
                    .sort((a, b) => b[1].totalAnggaran - a[1].totalAnggaran)
                    .map(([year, data], idx) => (
                      <motion.div
                        key={year}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-slate-100 hover:border-sky-200 transition-all gap-3"
                      >
                        <div>
                          <p className="font-bold text-slate-900 text-lg">
                            Tahun {year}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {data.totalProgram} program
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="font-bold text-emerald-600 text-base md:text-lg break-words max-w-[200px] md:max-w-none">
                            {formatCurrency(data.totalAnggaran, true)}
                          </p>
                          <p className="text-xs text-slate-400">
                            Rata-rata:{" "}
                            {formatCurrency(
                              data.totalAnggaran / data.totalProgram,
                              true,
                            )}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </motion.div>

              {/* Budget by Source */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white border border-slate-200/80 rounded-[22px] shadow-[0_3px_18px_rgba(16,27,52,.035)] hover:shadow-[0_12px_30px_rgba(16,27,52,.08)] transition-all overflow-hidden"
              >
                <div className="bg-slate-50 px-6 py-4 border-b">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                      <FiPieChart className="text-amber-600" />
                      Anggaran per Sumber
                    </h3>
                  </div>
                </div>
                <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto">
                  {Object.entries(filteredStats.programsByBudget)
                    .sort((a, b) => b[1].totalAnggaran - a[1].totalAnggaran)
                    .map(([source, data], idx) => (
                      <motion.div
                        key={source}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ x: 4 }}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0"></div>
                            <p className="font-semibold text-slate-900">
                              {source}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {data.totalProgram} program
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="font-bold text-amber-600 text-base md:text-lg break-words max-w-[200px] md:max-w-none">
                            {formatCurrency(data.totalAnggaran, true)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {Math.round(
                              (data.totalAnggaran / filteredStats.totalBudget) *
                                100,
                            )}
                            % dari total
                          </p>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </motion.div>
            </div>

            {/* Recent Programs Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-slate-200/80 rounded-[22px] shadow-[0_3px_18px_rgba(16,27,52,.035)] hover:shadow-[0_12px_30px_rgba(16,27,52,.08)] transition-all overflow-hidden"
            >
              <div className="bg-slate-50 px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <FiClock className="text-sky-600" />
                  Program Terbaru
                </h3>
                <button
                  onClick={() => setShowAllPrograms(!showAllPrograms)}
                  className="flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 transition-colors"
                  aria-expanded={showAllPrograms}
                  aria-label={
                    showAllPrograms
                      ? "Sembunyikan program"
                      : "Lihat semua program"
                  }
                >
                  {showAllPrograms
                    ? "Tampilkan lebih sedikit"
                    : "Lihat semua program"}
                  <FiChevronRight
                    className={`text-sm transition-transform ${showAllPrograms ? "rotate-90" : ""}`}
                  />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Program Kerja
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Tahun
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Estimasi Anggaran
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <AnimatePresence>
                      {recentPrograms.map((item, index) => (
                        <motion.tr
                          key={index}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-sky-50/30 transition-colors group"
                        >
                          <td className="px-6 py-3 text-sm text-slate-500">
                            {index + 1}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-8 bg-sky-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <span className="text-slate-900 font-medium line-clamp-2">
                                {item.program}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <span className="inline-flex px-2 py-1 text-xs rounded-full bg-sky-100 text-sky-700 font-medium whitespace-nowrap">
                              {item.year}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className="text-emerald-600 font-semibold whitespace-nowrap">
                              {formatCurrency(item.anggaran, true)}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
              {recentPrograms.length === 0 && (
                <div className="text-center py-12">
                  <FiDatabase className="text-4xl text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400">
                    Belum ada program yang ditambahkan
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardHome;
