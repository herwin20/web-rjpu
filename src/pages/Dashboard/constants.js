export const NOTIFICATION_POLL_INTERVAL = 30 * 1000;
export const STATS_REFRESH_INTERVAL = 5 * 60 * 1000;
export const MOBILE_BREAKPOINT = 1024;
export const BADGE_MAX_DISPLAY = 99;
export const SIDEBAR_WIDTH_OPEN = "w-72";
export const SIDEBAR_WIDTH_CLOSED = "w-20";

export const MENU_ITEMS = [
  {
    id: "home",
    label: "Beranda",
    icon: "home",
    path: "/dashboard",
    exact: true,
    roles: ["Admin", "User"],
    description: "Ringkasan dashboard",
  },
  {
    id: "yearly-data",
    label: "Data Pertahun",
    icon: "calendar",
    path: "/dashboard/mapping-data",
    roles: ["Admin", "User"],
    description: "Lihat data per tahun",
  },
  {
    id: "programs",
    label: "Data Program",
    icon: "database",
    path: "/dashboard/programs",
    roles: ["Admin", "User"],
    description: "Kelola program kerja",
  },
  {
    id: "drop-data",
    label: "Program Drop",
    icon: "archive",
    path: "/dashboard/drop-data",
    roles: ["Admin", "User"],
    description: "Lihat data drop",
  },
  {
    id: "statistics",
    label: "Perencanaan",
    icon: "activity",
    path: "/dashboard/statistics",
    roles: ["Admin", "User"],
    description: "Analisis dan statistik",
  },
  {
    id: "users",
    label: "Kelola User",
    icon: "users",
    path: "/dashboard/users",
    roles: ["Admin"],
    description: "Manajemen pengguna",
  },
];
