// pages/Dashboard/Disbursement.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  FiPackage,
  FiTool,
  FiCalendar,
  FiDollarSign,
  FiCheckCircle,
  FiAlertCircle,
  FiEdit2,
  FiSave,
  FiX,
  FiRefreshCw,
  FiSearch,
  FiTrendingUp,
  FiPieChart,
  FiBarChart2,
  FiChevronLeft,
  FiChevronRight,
  FiInfo,
  FiPlusCircle,
  FiUsers,
  FiTrash2,
  FiLock,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import dataSheet from "../../api/dataSheetService";
import disbursementService from "../../api/disbursementSheetService";

const Disbursement = ({ userRole }) => {
  const [programs, setPrograms] = useState([]);
  const [disbursements, setDisbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editData, setEditData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProgramsToCreate, setSelectedProgramsToCreate] = useState([]);
  const itemsPerPage = 10;

  // --- state hapus ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const isAdmin = userRole === "Admin";

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
      const allPrograms = await dataSheet.getAllData();
      setPrograms(allPrograms);
      const allDisbursements = await disbursementService.getAllDisbursement();
      setDisbursements(allDisbursements);
    } catch (error) {
      showToast("Gagal memuat data: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDisbursement = async () => {
    if (!isAdmin) return;
    if (selectedProgramsToCreate.length === 0) {
      showToast("Pilih minimal satu program", "error");
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const programId of selectedProgramsToCreate) {
        const program = programs.find((p) => p.no === programId);
        const existing = disbursements.find((d) => d.programId === programId);

        if (
          !existing &&
          program &&
          program.estLevering &&
          parseInt(program.estLevering) > 0
        ) {
          const result = await disbursementService.createFromProgram(program);
          if (result.success) successCount++;
          else failCount++;
        } else if (existing) {
          successCount++;
        } else {
          failCount++;
        }
      }

      await loadData();
      setShowCreateModal(false);
      setSelectedProgramsToCreate([]);

      if (successCount > 0) {
        showToast(
          `${successCount} program berhasil ditambahkan${failCount > 0 ? `, ${failCount} gagal` : ""}`,
          "success",
        );
      } else {
        showToast("Tidak ada program yang dapat ditambahkan", "error");
      }
    } catch (error) {
      showToast("Gagal membuat disbursement: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (disbursement) => {
    setSelectedProgram(programs.find((p) => p.no === disbursement.programId));

    setEditData({
      programId: disbursement.programId,
      vendor: disbursement.materialVendor || disbursement.serviceVendor || "",
      amount: parseNumberInput(
        disbursement.materialAmount || disbursement.serviceAmount || 0,
      ),

      materialPoDate: disbursement.materialPoDate || "",
      materialDeliveryPlan: disbursement.materialDeliveryPlan || "",
      materialActualDelivery: disbursement.materialActualDelivery || "",
      materialStatus: disbursement.materialStatus || "Planned",

      servicePoDate: disbursement.servicePoDate || "",
      serviceStartPlan: disbursement.serviceStartPlan || "",
      serviceStartActual: disbursement.serviceStartActual || "",
      serviceEndPlan: disbursement.serviceEndPlan || "",
      serviceEndActual: disbursement.serviceEndActual || "",
      serviceStatus: disbursement.serviceStatus || "Planned",

      executionStartPlan: disbursement.executionStartPlan || "",
      executionStartActual: disbursement.executionStartActual || "",
      executionEndPlan: disbursement.executionEndPlan || "",
      executionEndActual: disbursement.executionEndActual || "",

      overallStatus: disbursement.overallStatus || "Not Started",
      progressPercentage: disbursement.progressPercentage || 0,
      notes: disbursement.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        programId: editData.programId,
        vendor: editData.vendor || "",
        amount: parseNumberInput(editData.amount),

        materialPoDate: editData.materialPoDate || "",
        materialDeliveryPlan: editData.materialDeliveryPlan || "",
        materialActualDelivery: editData.materialActualDelivery || "",
        materialStatus: editData.materialStatus || "Planned",

        servicePoDate: editData.servicePoDate || "",
        serviceStartPlan: editData.serviceStartPlan || "",
        serviceStartActual: editData.serviceStartActual || "",
        serviceEndPlan: editData.serviceEndPlan || "",
        serviceEndActual: editData.serviceEndActual || "",
        serviceStatus: editData.serviceStatus || "Planned",

        executionStartPlan: editData.executionStartPlan || "",
        executionStartActual: editData.executionStartActual || "",
        executionEndPlan: editData.executionEndPlan || "",
        executionEndActual: editData.executionEndActual || "",

        overallStatus: editData.overallStatus || "Not Started",
        progressPercentage: Number(editData.progressPercentage) || 0,
        notes: editData.notes || "",
      };

      const result = await disbursementService.updateDisbursement(
        payload.programId,
        payload,
      );

      if (result.success) {
        await loadData();
        setShowModal(false);
        showToast("Data disbursement berhasil disimpan", "success");
      } else {
        showToast("Gagal menyimpan: " + result.message, "error");
      }
    } catch (error) {
      showToast("Terjadi kesalahan: " + error.message, "error");
    }
  };

  // ================== HAPUS ==================
  const openDeleteModal = (disbursement) => {
    setDeleteTarget(disbursement);
    setDeletePassword("");
    setDeleteError("");
    setShowDeleteModal(true);
  };

  const expectedPassword = (d) => {
    if (!d) return "";
    const total =
      (parseFloat(d.materialAmount) || 0) + (parseFloat(d.serviceAmount) || 0);
    return String(Math.round(total));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError("");

    if (deletePassword.trim() !== expectedPassword(deleteTarget)) {
      setDeleteError("Password salah. Masukkan total harga tanpa titik/koma.");
      return;
    }

    setDeleting(true);
    try {
      const result = await disbursementService.deleteDisbursement(
        deleteTarget.programId,
      );
      if (result.success) {
        await loadData();
        setShowDeleteModal(false);
        setDeleteTarget(null);
        showToast("Disbursement berhasil dihapus", "success");
      } else {
        setDeleteError(result.message || "Gagal menghapus");
      }
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelectProgram = (programId) => {
    setSelectedProgramsToCreate((prev) =>
      prev.includes(programId)
        ? prev.filter((id) => id !== programId)
        : [...prev, programId],
    );
  };

  const toggleSelectAll = () => {
    if (
      selectedProgramsToCreate.length === availableProgramsToCreate.length &&
      availableProgramsToCreate.length > 0
    ) {
      setSelectedProgramsToCreate([]);
    } else {
      setSelectedProgramsToCreate(availableProgramsToCreate.map((p) => p.no));
    }
  };

  const statusColors = {
    "Not Started": "bg-gray-100 text-gray-600",
    Planning: "bg-blue-100 text-blue-700",
    "On Progress": "bg-yellow-100 text-yellow-700",
    Completed: "bg-green-100 text-green-700",
    Delayed: "bg-red-100 text-red-700",
  };

  const materialStatusColors = {
    Planned: "bg-blue-100 text-blue-700",
    "In Progress": "bg-yellow-100 text-yellow-700",
    Completed: "bg-green-100 text-green-700",
    Delayed: "bg-red-100 text-red-700",
  };

  const statusOptions = [
    "Not Started",
    "Planning",
    "On Progress",
    "Completed",
    "Delayed",
  ];
  const materialStatusOptions = [
    "Planned",
    "In Progress",
    "Completed",
    "Delayed",
  ];

  const availableProgramsToCreate = useMemo(() => {
    const existingProgramIds = disbursements.map((d) => d.programId);
    return programs.filter(
      (p) =>
        !existingProgramIds.includes(p.no) &&
        p.estLevering &&
        parseInt(p.estLevering) > 0,
    );
  }, [programs, disbursements]);

  const filteredData = useMemo(() => {
    let filtered = disbursements;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.programName?.toLowerCase().includes(term) ||
          d.programId?.toLowerCase().includes(term) ||
          d.kluster?.toLowerCase().includes(term),
      );
    }
    if (filterStatus !== "all") {
      filtered = filtered.filter((d) => d.overallStatus === filterStatus);
    }
    return filtered;
  }, [disbursements, searchTerm, filterStatus]);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const stats = useMemo(() => {
    return {
      total: disbursements.length,
      completed: disbursements.filter((d) => d.overallStatus === "Completed")
        .length,
      onProgress: disbursements.filter((d) => d.overallStatus === "On Progress")
        .length,
      delayed: disbursements.filter((d) => d.overallStatus === "Delayed")
        .length,
      avgProgress: Math.round(
        disbursements.reduce((sum, d) => sum + d.progressPercentage, 0) /
          (disbursements.length || 1),
      ),
    };
  }, [disbursements]);

  // ================== FORMATTER ==================
  const formatCurrency = (amount, compact = false) => {
    const num = parseFloat(amount);
    if (!num || isNaN(num)) return "Rp 0";

    if (compact) {
      if (num >= 1_000_000_000)
        return `Rp ${(num / 1_000_000_000).toLocaleString("id-ID", {
          maximumFractionDigits: 2,
        })} M`;
      if (num >= 1_000_000)
        return `Rp ${(num / 1_000_000).toLocaleString("id-ID", {
          maximumFractionDigits: 1,
        })} Jt`;
    }

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Format angka mentah -> string ribuan: 22500000000 -> "22.500.000.000"
  const formatNumberInput = (value) => {
    if (value === "" || value === null || value === undefined) return "";
    const digits = String(value).replace(/\D/g, "");
    if (!digits) return "";
    return new Intl.NumberFormat("id-ID").format(Number(digits));
  };

  // Parse string berformat -> angka mentah: "22.500.000.000" -> 22500000000
  const parseNumberInput = (value) => {
    if (value === "" || value === null || value === undefined) return 0;
    const digits = String(value).replace(/\D/g, "");
    return digits ? Number(digits) : 0;
  };

  const statusChartData = [
    { name: "Completed", value: stats.completed, color: "#10B981" },
    { name: "On Progress", value: stats.onProgress, color: "#F59E0B" },
    { name: "Delayed", value: stats.delayed, color: "#EF4444" },
    {
      name: "Others",
      value: Math.max(
        0,
        stats.total - stats.completed - stats.onProgress - stats.delayed,
      ),
      color: "#6B7280",
    },
  ];

  return (
    <div className="space-y-6">
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
              <FiCheckCircle size={18} />
            ) : (
              <FiAlertCircle size={18} />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-[22px] border border-[#263b5b] bg-[#101B34] px-5 py-6 shadow-[0_14px_34px_rgba(16,27,52,0.12)] sm:px-7">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Disbursement & Execution
          </h1>
          <p className="text-slate-300 mt-1 text-sm">
            Monitoring pencairan material, jasa, dan levering peralatan
          </p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <button
              onClick={() => {
                setSelectedProgramsToCreate([]);
                setShowCreateModal(true);
              }}
              disabled={availableProgramsToCreate.length === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                availableProgramsToCreate.length === 0
                  ? "bg-gray-300 text-slate-500 cursor-not-allowed"
                  : "bg-sky-600 hover:bg-sky-700 text-white hover:shadow-lg"
              }`}
            >
              <FiPlusCircle size={18} />
              <span>Buat Disbursement</span>
              {availableProgramsToCreate.length > 0 && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                  {availableProgramsToCreate.length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-colors"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white rounded-[20px] border border-slate-200/80 shadow-[0_3px_16px_rgba(15,23,42,0.035)] p-5"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 rounded-xl bg-sky-100">
              <FiPackage className="text-sky-600 text-xl" />
            </div>
            <span className="text-2xl font-bold text-sky-600">
              {stats.total}
            </span>
          </div>
          <h3 className="font-semibold">Total Program</h3>
          <p className="text-xs text-slate-400">Dengan jadwal disbursement</p>
        </motion.div>
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white rounded-[20px] border border-slate-200/80 shadow-[0_3px_16px_rgba(15,23,42,0.035)] p-5"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 rounded-xl bg-emerald-100">
              <FiCheckCircle className="text-emerald-600 text-xl" />
            </div>
            <span className="text-2xl font-bold text-emerald-600">
              {stats.completed}
            </span>
          </div>
          <h3 className="font-semibold">Selesai</h3>
          <p className="text-xs text-slate-400">Program telah tereksekusi</p>
        </motion.div>
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white rounded-[20px] border border-slate-200/80 shadow-[0_3px_16px_rgba(15,23,42,0.035)] p-5"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 rounded-xl bg-amber-100">
              <FiTrendingUp className="text-amber-600 text-xl" />
            </div>
            <span className="text-2xl font-bold text-amber-600">
              {stats.avgProgress}%
            </span>
          </div>
          <h3 className="font-semibold">Rata-rata Progress</h3>
          <p className="text-xs text-slate-400">Keseluruhan program</p>
        </motion.div>
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white rounded-[20px] border border-slate-200/80 shadow-[0_3px_16px_rgba(15,23,42,0.035)] p-5"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 rounded-xl bg-indigo-100">
              <FiDollarSign className="text-indigo-600 text-xl" />
            </div>
            <span className="text-xl font-bold text-indigo-600">
              {formatCurrency(
                disbursements.reduce(
                  (sum, d) =>
                    sum +
                    (parseFloat(d.materialAmount) ||
                      parseFloat(d.serviceAmount) ||
                      0),
                  0,
                ),
                true,
              )}
            </span>
          </div>
          <h3 className="font-semibold">Total Nilai Kontrak</h3>
          <p className="text-xs text-slate-400">Vendor Terpilih</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-[0_3px_18px_rgba(15,23,42,0.035)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiPieChart className="text-sky-600" />
            <h3 className="font-bold">Status Program</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
              >
                {statusChartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-[0_3px_18px_rgba(15,23,42,0.035)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiBarChart2 className="text-emerald-600" />
            <h3 className="font-bold">Progress per Program</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={disbursements.slice(0, 8)}
              layout="vertical"
              margin={{ left: 60 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="programName"
                width={60}
                tick={{ fontSize: 10 }}
              />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar
                dataKey="progressPercentage"
                fill="#3B82F6"
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center gap-3">
          <FiInfo className="text-sky-600 text-lg flex-shrink-0" />
          <p className="text-sm text-sky-800">
            Anda dalam mode tampilan. Hanya Admin yang dapat membuat dan
            mengedit data disbursement.
          </p>
        </div>
      )}

      <div className="bg-white rounded-[20px] shadow-[0_3px_18px_rgba(15,23,42,0.035)] border-slate-200/80 border p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari program..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border rounded-xl"
          >
            <option value="all">Semua Status</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[20px] shadow-[0_3px_18px_rgba(15,23,42,0.035)] border-slate-200/80 border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-4 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500 font-bold">
                  Program ID
                </th>
                <th className="px-4 py-4 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500 font-bold">
                  Program & Vendor
                </th>
                <th className="px-4 py-4 text-center text-[11px] uppercase tracking-[0.08em] text-slate-500 font-bold">
                  Material
                </th>
                <th className="px-4 py-4 text-center text-[11px] uppercase tracking-[0.08em] text-slate-500 font-bold">
                  Jasa
                </th>
                <th className="px-4 py-4 text-center text-[11px] uppercase tracking-[0.08em] text-slate-500 font-bold">
                  Progress
                </th>
                <th className="px-4 py-4 text-center text-[11px] uppercase tracking-[0.08em] text-slate-500 font-bold">
                  Status
                </th>
                <th className="px-4 py-4 text-center text-[11px] uppercase tracking-[0.08em] text-slate-500 font-bold">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <FiPackage className="text-4xl mx-auto mb-2" />
                    <p>Belum ada data disbursement</p>
                  </td>
                </tr>
              ) : (
                paginatedData.map((d) => (
                  <tr
                    key={d.programId}
                    className="border-t border-slate-100 hover:bg-sky-50/40 transition-colors"
                  >
                    <td className="px-3 py-3 font-mono text-sm">
                      {d.programId}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{d.programName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <FiUsers size={12} />{" "}
                        {d.materialVendor || d.serviceVendor || "-"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          materialStatusColors[d.materialStatus] ||
                          "bg-gray-100"
                        }`}
                      >
                        {d.materialStatus || "Planned"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          materialStatusColors[d.serviceStatus] || "bg-gray-100"
                        }`}
                      >
                        {d.serviceStatus || "Planned"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="w-16 bg-slate-200 rounded-full h-2 mx-auto">
                        <div
                          className="bg-sky-600 h-2 rounded-full"
                          style={{ width: `${d.progressPercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs mt-1 block">
                        {d.progressPercentage}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          statusColors[d.overallStatus] || "bg-gray-100"
                        }`}
                      >
                        {d.overallStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(d)}
                          className="p-2 text-sky-600 hover:bg-sky-50 rounded-xl"
                          disabled={!isAdmin}
                          title={!isAdmin ? "Hanya Admin" : "Edit"}
                        >
                          <FiEdit2
                            size={16}
                            className={!isAdmin ? "opacity-50" : ""}
                          />
                        </button>
                        <button
                          onClick={() => openDeleteModal(d)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-xl"
                          disabled={!isAdmin}
                          title={!isAdmin ? "Hanya Admin" : "Hapus"}
                        >
                          <FiTrash2
                            size={16}
                            className={!isAdmin ? "opacity-50" : ""}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t">
            <span className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 border rounded-xl disabled:opacity-50"
              >
                <FiChevronLeft />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 border rounded-xl disabled:opacity-50"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {isAdmin && (
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-[3px] flex items-center justify-center z-50 p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="bg-white rounded-[20px] max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-sky-600 hover:bg-sky-700 px-6 py-4 rounded-t-2xl flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Buat Disbursement Baru
                    </h2>
                    <p className="text-emerald-100 text-sm mt-0.5">
                      Pilih program yang akan dibuatkan jadwal disbursement
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-xl transition"
                  >
                    <FiX size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {availableProgramsToCreate.length === 0 ? (
                    <div className="text-center py-12">
                      <FiCheckCircle className="text-4xl text-green-500 mx-auto mb-3" />
                      <p className="text-slate-500">
                        Semua program sudah memiliki jadwal disbursement
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4 pb-3 border-b">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              selectedProgramsToCreate.length ===
                                availableProgramsToCreate.length &&
                              availableProgramsToCreate.length > 0
                            }
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm font-medium text-slate-700">
                            Pilih Semua
                          </span>
                        </label>
                        <span className="text-xs text-slate-400">
                          {selectedProgramsToCreate.length} dari{" "}
                          {availableProgramsToCreate.length} dipilih
                        </span>
                      </div>
                      <div className="space-y-2">
                        {availableProgramsToCreate.map((program) => (
                          <div
                            key={program.no}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              selectedProgramsToCreate.includes(program.no)
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                            onClick={() => toggleSelectProgram(program.no)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedProgramsToCreate.includes(
                                program.no,
                              )}
                              onChange={() => {}}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-slate-500">
                                  {program.no}
                                </span>
                                <span className="font-medium text-slate-900">
                                  {program.programKerja}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-slate-400">
                                  {program.klusterProgram}
                                </span>
                                <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                                  {program.tahun}
                                </span>
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                  Est Levering: {program.estLevering} bln
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleCreateDisbursement}
                    disabled={selectedProgramsToCreate.length === 0 || loading}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all ${
                      selectedProgramsToCreate.length === 0 || loading
                        ? "bg-gray-300 text-slate-500 cursor-not-allowed"
                        : "bg-sky-600 hover:bg-sky-700 text-white hover:shadow-lg"
                    }`}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <FiPlusCircle size={16} />
                        <span>
                          Buat Disbursement ({selectedProgramsToCreate.length})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* MODAL EDIT */}
      {isAdmin && (
        <AnimatePresence>
          {showModal && selectedProgram && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-[3px] flex items-center justify-center z-50 p-4"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="bg-white rounded-[20px] max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-[#101B34] px-6 py-4 rounded-t-2xl flex justify-between items-center z-10">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Detail Pelaksanaan
                    </h2>
                    <p className="text-sky-100 text-sm mt-0.5">
                      {selectedProgram.programKerja} ({selectedProgram.no})
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-xl transition"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* 1. INFORMASI VENDOR & KONTRAK */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 mb-4">
                      <FiUsers /> 1. Informasi Vendor & Kontrak
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nama Vendor / Pemenang
                        </label>
                        <input
                          type="text"
                          placeholder="Masukkan nama vendor..."
                          value={editData.vendor || ""}
                          onChange={(e) =>
                            setEditData({ ...editData, vendor: e.target.value })
                          }
                          className="w-full px-3 py-2.5 border border-slate-300 bg-white rounded-xl focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Total Nilai Kontrak (Rp)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium pointer-events-none">
                            Rp
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={formatNumberInput(editData.amount)}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                amount: parseNumberInput(e.target.value),
                              })
                            }
                            className="w-full pl-10 pr-3 py-2.5 border border-slate-300 bg-white rounded-xl focus:ring-2 focus:ring-sky-400 font-mono text-right"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {formatCurrency(parseNumberInput(editData.amount))}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. MATERIAL / PERALATAN */}
                  <div className="bg-sky-50 rounded-xl p-4 border border-sky-200">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-sky-800 mb-4">
                      <FiPackage /> 2. Pengadaan Material / Peralatan
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-sky-700 mb-1">
                          Tanggal PO Material
                        </label>
                        <input
                          type="date"
                          value={editData.materialPoDate || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              materialPoDate: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-sky-700 mb-1">
                          Rencana Kedatangan
                        </label>
                        <input
                          type="date"
                          value={editData.materialDeliveryPlan || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              materialDeliveryPlan: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-emerald-700 mb-1">
                          ✅ Realisasi Kedatangan
                        </label>
                        <input
                          type="date"
                          value={editData.materialActualDelivery || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              materialActualDelivery: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 border border-emerald-200 bg-emerald-50 rounded-xl focus:ring-2 focus:ring-emerald-400 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-sky-700 mb-1">
                          Status Material
                        </label>
                        <select
                          value={editData.materialStatus || "Planned"}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              materialStatus: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-sky-400"
                        >
                          {materialStatusOptions.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 3. JASA */}
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-green-800 mb-4">
                      <FiTool /> 3. Pelaksanaan Jasa
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-emerald-700 mb-1">
                          Tanggal PO Jasa
                        </label>
                        <input
                          type="date"
                          value={editData.servicePoDate || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              servicePoDate: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-emerald-700 mb-1">
                          Rencana Mulai
                        </label>
                        <input
                          type="date"
                          value={editData.serviceStartPlan || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              serviceStartPlan: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-emerald-700 mb-1">
                          Rencana Selesai
                        </label>
                        <input
                          type="date"
                          value={editData.serviceEndPlan || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              serviceEndPlan: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-emerald-700 mb-1">
                          ✅ Realisasi Mulai
                        </label>
                        <input
                          type="date"
                          value={editData.serviceStartActual || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              serviceStartActual: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 border border-emerald-200 bg-emerald-50 rounded-xl focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-emerald-700 mb-1">
                          ✅ Realisasi Selesai
                        </label>
                        <input
                          type="date"
                          value={editData.serviceEndActual || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              serviceEndActual: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 border border-emerald-200 bg-emerald-50 rounded-xl focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                    </div>
                    <div className="mt-4 w-1/3">
                      <label className="block text-xs font-semibold text-emerald-700 mb-1">
                        Status Jasa
                      </label>
                      <select
                        value={editData.serviceStatus || "Planned"}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            serviceStatus: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-sky-400"
                      >
                        {materialStatusOptions.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 4. EKSEKUSI */}
                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-indigo-800 mb-4">
                      <FiCalendar /> 4. Eksekusi Akhir
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-indigo-700 mb-1">
                          Rencana Mulai
                        </label>
                        <input
                          type="date"
                          value={editData.executionStartPlan || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              executionStartPlan: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-indigo-700 mb-1">
                          Rencana Selesai
                        </label>
                        <input
                          type="date"
                          value={editData.executionEndPlan || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              executionEndPlan: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-indigo-700 mb-1">
                          ✅ Realisasi Mulai
                        </label>
                        <input
                          type="date"
                          value={editData.executionStartActual || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              executionStartActual: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 border border-emerald-200 bg-emerald-50 rounded-xl focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-indigo-700 mb-1">
                          ✅ Realisasi Selesai
                        </label>
                        <input
                          type="date"
                          value={editData.executionEndActual || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              executionEndActual: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 border border-emerald-200 bg-emerald-50 rounded-xl focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. PROGRESS */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900 mb-4">
                      <FiCheckCircle /> 5. Status Akhir & Progress
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Status Keseluruhan
                        </label>
                        <select
                          value={editData.overallStatus || "Not Started"}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              overallStatus: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 border border-slate-300 bg-white rounded-xl focus:ring-2 focus:ring-sky-400"
                        >
                          {statusOptions.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Progress Pekerjaan (%)
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={editData.progressPercentage || 0}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                progressPercentage: parseInt(e.target.value),
                              })
                            }
                            className="flex-1"
                          />
                          <span className="text-lg font-bold text-sky-600 w-12 text-right">
                            {editData.progressPercentage || 0}%
                          </span>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Catatan Tambahan
                        </label>
                        <textarea
                          rows="2"
                          placeholder="Keterangan kendala, info penting, dll..."
                          value={editData.notes || ""}
                          onChange={(e) =>
                            setEditData({ ...editData, notes: e.target.value })
                          }
                          className="w-full px-3 py-2.5 border border-slate-300 bg-white rounded-xl focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3 rounded-b-2xl z-10">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border rounded-xl hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#101B34] hover:bg-[#1c335b] text-white rounded-xl shadow-lg"
                  >
                    <FiSave /> Simpan Perubahan
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* MODAL HAPUS */}
      {isAdmin && (
        <AnimatePresence>
          {showDeleteModal && deleteTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-[3px] flex items-center justify-center z-50 p-4"
              onClick={() => setShowDeleteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="bg-white rounded-[20px] max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-red-600 px-6 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-white">
                    <FiTrash2 size={20} />
                    <h2 className="text-lg font-bold">Hapus Disbursement</h2>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-xl"
                  >
                    <FiX size={18} />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
                    <p className="font-semibold mb-1">⚠️ Peringatan</p>
                    <p>
                      Data disbursement untuk program{" "}
                      <strong>{deleteTarget.programName}</strong> (
                      {deleteTarget.programId}) akan dihapus permanen.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <FiLock size={12} /> Konfirmasi Password (Total Harga)
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      placeholder="Contoh: 22500000000"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-400 font-mono"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Masukkan total harga tanpa titik/koma.{" "}
                      <span className="text-slate-400">
                        (Nilai:{" "}
                        {formatCurrency(
                          (parseFloat(deleteTarget.materialAmount) || 0) +
                            (parseFloat(deleteTarget.serviceAmount) || 0),
                        )}
                        )
                      </span>
                    </p>
                  </div>

                  {deleteError && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-2">
                      <FiAlertCircle size={16} /> {deleteError}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 border-t px-6 py-4 flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 border rounded-xl hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting || !deletePassword.trim()}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white transition-all ${
                      deleting || !deletePassword.trim()
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700 shadow-lg"
                    }`}
                  >
                    {deleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Menghapus...
                      </>
                    ) : (
                      <>
                        <FiTrash2 size={16} /> Hapus Permanen
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default Disbursement;
