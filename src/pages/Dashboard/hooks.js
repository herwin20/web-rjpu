import { useCallback, useEffect, useRef, useState } from "react";
import dataSheet from "../../api/dataSheetService";
import {
  NOTIFICATION_POLL_INTERVAL,
  STATS_REFRESH_INTERVAL,
  MOBILE_BREAKPOINT,
} from "./constants";

const EMPTY_STATS = {
  totalPrograms: 0,
  totalBudget: 0,
  programsByYear: {},
  programsByCluster: {},
  programsByBudget: {},
};

export function useStatistics() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allData, byYear, byCluster, byBudget] = await Promise.all([
        dataSheet.getAllData(),
        dataSheet.getSummaryByYear(),
        dataSheet.getSummaryByKluster(),
        dataSheet.getSummaryBySumberAnggaran(),
      ]);

      if (!mountedRef.current) return;

      let totalBudget = 0;
      for (const year of Object.values(byYear)) {
        totalBudget += year.totalAnggaran || 0;
      }

      const enhancedByYear = Object.fromEntries(
        Object.entries(byYear).map(([year, data]) => {
          const yearPrograms = allData.filter(
            (item) => item.tahun?.toString() === year.toString(),
          );
          return [
            year,
            {
              ...data,
              programList: yearPrograms.map((p) => ({
                nama: p.programKerja || p.namaProgram,
                anggaran: p.anggaran || p.estimasiAnggaran || 0,
              })),
              programsByCluster: {},
              programsByBudget: {},
            },
          ];
        }),
      );

      setStats({
        totalPrograms: allData.length,
        totalBudget,
        programsByYear: enhancedByYear,
        programsByCluster: byCluster,
        programsByBudget: byBudget,
      });
      setLastUpdated(new Date());
    } catch (err) {
      if (!mountedRef.current) return;
      console.error("Failed to load statistics:", err);
      setError("Gagal memuat data statistik. Silakan coba lagi.");
      setStats(EMPTY_STATS);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, STATS_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  return { stats, loading, error, lastUpdated, reload: load };
}

export function useNotifications(user) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);

  const load = useCallback(async () => {
    if (!user || inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    try {
      const all = await dataSheet.getAllNotifications();
      setNotifications(all);
      setUnreadCount(all.filter((n) => n.status === "UNREAD").length);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
    const interval = setInterval(load, NOTIFICATION_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  const markAsRead = useCallback(
    async (notificationId) => {
      try {
        const result = await dataSheet.markNotificationAsRead(
          notificationId,
          user?.nama || "System",
        );
        if (result.success) await load();
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    },
    [user, load],
  );

  const markAllAsRead = useCallback(
    async (programNo) => {
      try {
        const result = await dataSheet.markAllNotificationsAsRead(
          programNo,
          user?.nama || "System",
        );
        if (result.success) await load();
      } catch (err) {
        console.error("Failed to mark all notifications as read:", err);
      }
    },
    [user, load],
  );

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    reload: load,
  };
}

export function useSidebarAutoCollapse(pathname) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < MOBILE_BREAKPOINT) setOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth < MOBILE_BREAKPOINT) setOpen(false);
  }, [pathname]);

  return [open, setOpen];
}

export function useClickOutside(active, onOutside, ignoreSelectors = []) {
  useEffect(() => {
    if (!active) return;
    const handler = (event) => {
      const target = event.target;
      const ignored = ignoreSelectors.some((sel) => target.closest(sel));
      if (!ignored) onOutside();
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [active, onOutside, ignoreSelectors]);
}

export function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}
