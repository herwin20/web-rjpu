// pages/Dashboard/NotificationPanel.jsx
import React from "react";
import {
  FiCheckCircle,
  FiXCircle,
  FiInfo,
  FiClock,
  FiUser,
  FiMail,
  FiCheck,
  FiBellOff,
  FiBell,
} from "react-icons/fi";

const NotificationPanel = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
  loading,
  userRole,
}) => {
  const getNotificationIcon = (status) => {
    if (status === "READ") {
      return <FiCheckCircle className="text-green-500" />;
    }
    return <FiInfo className="text-blue-500 animate-pulse" />;
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return "";

    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return date.toLocaleDateString("id-ID");
  };

  const groupNotificationsByProgram = () => {
    const grouped = {};
    notifications.forEach((notif) => {
      if (!grouped[notif.programNo]) {
        grouped[notif.programNo] = {
          programNo: notif.programNo,
          programKerja: notif.programKerja,
          notifications: [],
        };
      }
      grouped[notif.programNo].notifications.push(notif);
    });
    return Object.values(grouped);
  };

  const groupedNotifications = groupNotificationsByProgram();

  return (
    <div className="notification-panel absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiBell className="text-white text-lg" />
            <h3 className="text-white font-semibold">Notifikasi</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount} baru
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => onMarkAllAsRead("all")}
                className="text-white/80 hover:text-white text-xs flex items-center gap-1 transition-colors"
              >
                <FiCheck size={14} />
                Tandai semua
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <FiXCircle size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-gray-500 text-sm">Memuat notifikasi...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FiBellOff className="text-gray-300 text-5xl mb-3" />
            <p className="text-gray-500 text-center">Tidak ada notifikasi</p>
            <p className="text-gray-400 text-xs mt-1">
              Notifikasi baru akan muncul di sini
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {groupedNotifications.map((group) => (
              <div
                key={group.programNo}
                className="hover:bg-gray-50 transition-colors"
              >
                {/* Program Header */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-mono">
                        {group.programNo}
                      </p>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {group.programKerja}
                      </p>
                    </div>
                    {group.notifications.some((n) => n.status === "UNREAD") && (
                      <button
                        onClick={() => onMarkAllAsRead(group.programNo)}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 ml-2"
                      >
                        <FiCheck size={12} />
                        Tandai dibaca
                      </button>
                    )}
                  </div>
                </div>

                {/* Notifications List */}
                {group.notifications.map((notif, idx) => (
                  <div
                    key={notif.idNotif || idx}
                    className={`px-4 py-3 transition-colors ${
                      notif.status === "UNREAD" ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notif.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm text-gray-800">
                              Program baru ditambahkan oleh{" "}
                              <span className="font-semibold">
                                {notif.pengirim}
                              </span>
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <FiUser size={10} />
                                {notif.bidangPengirim}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                <FiClock size={10} />
                                {formatTimeAgo(notif.tanggalKirim)}
                              </span>
                            </div>
                          </div>
                          {notif.status === "UNREAD" && (
                            <button
                              onClick={() => onMarkAsRead(notif.idNotif)}
                              className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap"
                              title="Tandai sudah dibaca"
                            >
                              <FiCheck size={14} />
                            </button>
                          )}
                        </div>
                        {notif.status === "READ" && notif.dibacaOleh && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <FiMail size={10} />
                              Dibaca oleh {notif.dibacaOleh} •{" "}
                              {formatTimeAgo(notif.tanggalBaca)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            Total {notifications.length} notifikasi • {unreadCount} belum dibaca
          </p>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
