// components/UserManagement.jsx
import React, { useState, useEffect } from "react";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiX,
  FiSave,
  FiUserPlus,
  FiRefreshCw,
  FiShield,
  FiUser,
  FiCheckCircle,
  FiXCircle,
  FiUsers,
  FiTrendingUp,
  FiCalendar,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import loginService from "../../api/loginSheetService";

// Skeleton Components
const SkeletonStatsCard = () => (
  <div className="group relative border border-slate-200/80 bg-white rounded-[22px] shadow-[0_3px_18px_rgba(15,23,42,0.045)] overflow-hidden animate-pulse">
    <div className="relative p-5 md:p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-slate-200">
          <div className="w-6 h-6"></div>
        </div>
        <div className="text-right">
          <div className="h-8 bg-slate-200 rounded w-16"></div>
        </div>
      </div>
      <div className="h-5 bg-slate-200 rounded w-24 mb-1"></div>
      <div className="h-3 bg-slate-200 rounded w-32"></div>
    </div>
  </div>
);

const SkeletonTableRow = () => (
  <tr className="border-t border-slate-200/80">
    <td className="px-4 py-3">
      <div className="h-4 bg-slate-200 rounded w-8 animate-pulse"></div>
    </td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse"></div>
        <div className="h-4 bg-slate-200 rounded w-32 animate-pulse"></div>
      </div>
    </td>
    <td className="px-4 py-3">
      <div className="h-5 bg-slate-200 rounded w-16 animate-pulse"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-4 bg-slate-200 rounded w-20 animate-pulse"></div>
    </td>
    <td className="px-4 py-3">
      <div className="flex gap-2 justify-center">
        <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse"></div>
        <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse"></div>
      </div>
    </td>
  </tr>
);

const UserManagement = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nama: "",
    password: "",
    role: "User",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  useEffect(() => {
    loadUsers();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await loginService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      showToast("Gagal memuat data user: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      nama: "",
      password: "",
      role: "User",
    });
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      nama: user.nama,
      password: "",
      role: user.role,
    });
    setShowModal(true);
  };

  const handleDelete = async (user) => {
    if (user.nama === currentUser.nama) {
      showToast("Anda tidak dapat menghapus akun sendiri!", "error");
      return;
    }

    if (
      window.confirm(`Apakah Anda yakin ingin menghapus user "${user.nama}"?`)
    ) {
      try {
        const result = await loginService.deleteUser(user.no);
        if (result.success) {
          await loadUsers();
          showToast(`User "${user.nama}" berhasil dihapus`, "success");
        } else {
          showToast("Gagal menghapus user: " + result.message, "error");
        }
      } catch (error) {
        showToast("Terjadi kesalahan: " + error.message, "error");
      }
    }
  };

  const handleSave = async () => {
    if (!formData.nama.trim()) {
      showToast("Nama user wajib diisi", "error");
      return;
    }

    if (!editingUser && !formData.password) {
      showToast("Password wajib diisi untuk user baru", "error");
      return;
    }

    if (formData.password && formData.password.length < 4) {
      showToast("Password minimal 4 karakter", "error");
      return;
    }

    try {
      if (editingUser) {
        const updateData = {};
        if (formData.nama !== editingUser.nama) updateData.nama = formData.nama;
        if (formData.password) updateData.password = formData.password;
        if (formData.role !== editingUser.role) updateData.role = formData.role;

        const result = await loginService.updateUser(
          editingUser.no,
          updateData,
        );
        if (result.success) {
          await loadUsers();
          setShowModal(false);
          showToast("User berhasil diupdate", "success");
        } else {
          showToast("Gagal mengupdate user: " + result.message, "error");
        }
      } else {
        const result = await loginService.register(formData, "Admin");
        if (result.success) {
          await loadUsers();
          setShowModal(false);
          showToast("User berhasil ditambahkan", "success");
        } else {
          showToast("Gagal menambahkan user: " + result.message, "error");
        }
      }
    } catch (error) {
      showToast("Terjadi kesalahan: " + error.message, "error");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const stats = {
    total: users.length,
    admin: users.filter((u) => u.role === "Admin").length,
    user: users.filter((u) => u.role === "User").length,
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
  };

  // Loading Skeleton View
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
        </div>

        <div className="bg-white rounded-[22px] shadow-[0_3px_18px_rgba(15,23,42,0.045)] border border-slate-200/80 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="h-11 bg-slate-200 rounded-xl animate-pulse"></div>
            </div>
            <div className="w-32 h-11 bg-slate-200 rounded-xl animate-pulse"></div>
            <div className="w-24 h-11 bg-slate-200 rounded-xl animate-pulse"></div>
          </div>
        </div>

        <div className="bg-white rounded-[22px] shadow-[0_3px_18px_rgba(15,23,42,0.045)] border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 w-16">
                    <div className="h-3 bg-slate-200 rounded w-8 animate-pulse"></div>
                  </th>
                  <th className="px-4 py-4">
                    <div className="h-3 bg-slate-200 rounded w-24 animate-pulse"></div>
                  </th>
                  <th className="px-4 py-4">
                    <div className="h-3 bg-slate-200 rounded w-16 animate-pulse"></div>
                  </th>
                  <th className="px-4 py-4">
                    <div className="h-3 bg-slate-200 rounded w-20 animate-pulse"></div>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <div className="h-3 bg-slate-200 rounded w-16 mx-auto animate-pulse"></div>
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
              <FiCheckCircle size={18} />
            ) : (
              <FiXCircle size={18} />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium visual section heading — presentation only */}
      <div className="relative overflow-hidden rounded-[24px] border border-[#274368] bg-[#101B34] px-5 py-6 shadow-[0_14px_36px_rgba(16,27,52,0.13)] sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border border-sky-300/10 bg-sky-400/[0.04]" />
        <div className="relative flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Manajemen Pengguna
            </h1>
            <p className="mt-1 text-xs text-slate-300 sm:text-sm">
              Kelola akun, peran, dan pengguna sistem RJPU.
            </p>
          </div>
        </div>
      </div>

      {/* Header with Stats Cards - Same style as Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div
          whileHover={{ y: -4 }}
          className="group relative border border-slate-200/80 bg-white rounded-[22px] shadow-[0_3px_18px_rgba(15,23,42,0.045)] hover:shadow-[0_12px_35px_rgba(15,23,42,0.09)] transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-sky-50 to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative p-5 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 shadow-lg">
                <FiUsers className="text-white text-xl" />
              </div>
              <div className="text-right">
                <div className="text-2xl md:text-3xl font-bold text-sky-600">
                  {stats.total}
                </div>
              </div>
            </div>
            <h3 className="text-slate-700 font-semibold mb-1">Total User</h3>
            <p className="text-xs text-slate-400">Seluruh pengguna sistem</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-[#234B7D] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="group relative border border-slate-200/80 bg-white rounded-[22px] shadow-[0_3px_18px_rgba(15,23,42,0.045)] hover:shadow-[0_12px_35px_rgba(15,23,42,0.09)] transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative p-5 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
                <FiShield className="text-white text-xl" />
              </div>
              <div className="text-right">
                <div className="text-2xl md:text-3xl font-bold text-indigo-600">
                  {stats.admin}
                </div>
              </div>
            </div>
            <h3 className="text-slate-700 font-semibold mb-1">Administrator</h3>
            <p className="text-xs text-slate-400">Akses penuh sistem</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-pink-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="group relative border border-slate-200/80 bg-white rounded-[22px] shadow-[0_3px_18px_rgba(15,23,42,0.045)] hover:shadow-[0_12px_35px_rgba(15,23,42,0.09)] transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-sky-50 to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative p-5 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 shadow-lg">
                <FiUser className="text-white text-xl" />
              </div>
              <div className="text-right">
                <div className="text-2xl md:text-3xl font-bold text-sky-700">
                  {stats.user}
                </div>
              </div>
            </div>
            <h3 className="text-slate-700 font-semibold mb-1">Regular User</h3>
            <p className="text-xs text-slate-400">Akses terbatas</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-sky-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </motion.div>
      </div>

      {/* Search and Add - Same style as Dashboard filters */}
      <div className="bg-white rounded-[22px] shadow-[0_3px_18px_rgba(15,23,42,0.045)] border border-slate-200/80 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari user berdasarkan nama atau role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadUsers}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              title="Refresh data"
            >
              <FiRefreshCw size={16} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#132748] to-[#234B7D] text-white rounded-xl hover:shadow-lg transition-all"
            >
              <FiUserPlus size={18} />
              <span>Tambah User</span>
            </button>
          </div>
        </div>
        {searchTerm && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
            <FiSearch size={14} />
            <span>Ditemukan {filteredUsers.length} user</span>
            <button
              onClick={() => setSearchTerm("")}
              className="text-sky-600 hover:underline"
            >
              Hapus filter
            </button>
          </div>
        )}
      </div>

      {/* Users Table - Same style as Dashboard table */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-[22px] p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiUser className="text-3xl text-slate-400" />
          </div>
          <p className="text-slate-500">Tidak ada data user</p>
          <button
            onClick={handleAdd}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-[#132748] to-[#234B7D] text-white rounded-xl hover:shadow-lg transition-all"
          >
            Tambah User Pertama
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-[22px] shadow-[0_3px_18px_rgba(15,23,42,0.045)] border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    NO
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Nama User
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {filteredUsers.map((user, idx) => (
                    <motion.tr
                      key={user.no}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-sky-50/60 transition-all duration-200 group"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 text-sm">
                          {user.no}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              user.role === "Admin"
                                ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                                : "bg-gradient-to-br from-sky-500 to-blue-600"
                            } shadow-lg`}
                          >
                            {user.role === "Admin" ? (
                              <FiShield className="text-white" size={16} />
                            ) : (
                              <FiUser className="text-white" size={16} />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {user.nama}
                            </div>
                            <div className="text-xs text-slate-400">
                              ID: {user.no}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-bold rounded-lg ${
                            user.role === "Admin"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-sky-700 bg-sky-50 px-2 py-1 rounded-full">
                          <FiCheckCircle size={12} />
                          Active
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Edit User"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className={`p-2 rounded-lg transition ${
                              user.nama === currentUser.nama
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                            }`}
                            title={
                              user.nama === currentUser.nama
                                ? "Tidak dapat menghapus akun sendiri"
                                : "Hapus User"
                            }
                            disabled={user.nama === currentUser.nama}
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form - Same style as Dashboard modals */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="border border-slate-200/80 bg-white rounded-[22px] max-w-md w-full shadow-[0_24px_75px_rgba(15,23,42,0.22)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-[#132748] to-[#234B7D] px-6 py-4 flex justify-between items-center rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    {editingUser ? (
                      <FiEdit2 className="text-white text-xl" />
                    ) : (
                      <FiUserPlus className="text-white text-xl" />
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {editingUser ? "Edit User" : "Tambah User Baru"}
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition text-white"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700">
                    Nama User <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nama}
                    onChange={(e) =>
                      setFormData({ ...formData, nama: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                    placeholder="Masukkan nama user"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700">
                    {editingUser
                      ? "Password Baru (kosongkan jika tidak diubah)"
                      : "Password *"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-transparent pr-11 transition-all"
                      placeholder="Minimal 4 karakter"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-gray-600 transition"
                    >
                      {showPassword ? (
                        <FiX size={18} />
                      ) : (
                        <FiCheckCircle size={18} />
                      )}
                    </button>
                  </div>
                  {formData.password &&
                    formData.password.length < 4 &&
                    formData.password.length > 0 && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <FiXCircle size={10} /> Password minimal 4 karakter
                      </p>
                    )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all"
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                  <div className="mt-2 p-3 bg-gradient-to-r from-sky-50 to-slate-50 rounded-xl">
                    <p className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="text-sky-500">ℹ️</span>
                      {formData.role === "Admin"
                        ? "Admin memiliki akses penuh ke sistem termasuk manajemen user, data program, dan statistik"
                        : "User hanya dapat melihat dan mengelola data program, serta melihat statistik"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#132748] to-[#234B7D] text-white rounded-xl hover:shadow-lg transition-all"
                >
                  <FiSave size={16} /> Simpan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagement;
