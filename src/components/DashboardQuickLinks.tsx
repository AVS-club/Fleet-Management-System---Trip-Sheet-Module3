import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { FolderOpen, Car, Users, Wrench, MapPin, AlertTriangle } from "lucide-react";

type LinkTile = { label: string; path: string; icon: JSX.Element; };

const tiles: LinkTile[] = [
  { label: "Trips",       path: "/trips",       icon: <MapPin className="h-5 w-5" /> },
  { label: "Vehicles",    path: "/vehicles",    icon: <Car className="h-5 w-5" /> },
  { label: "Drivers",     path: "/drivers",     icon: <Users className="h-5 w-5" /> },
  { label: "Maintenance", path: "/maintenance", icon: <Wrench className="h-5 w-5" /> },
  { label: "Documents",   path: "/documents",   icon: <FolderOpen className="h-5 w-5" /> },
  { label: "AI Alerts",   path: "/alerts",      icon: <AlertTriangle className="h-5 w-5" /> },
];

export default function DashboardQuickLinks() {
  const navigate = useNavigate();

  const onKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, path: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate(path);
      }
    },
    [navigate]
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          role="button"
          tabIndex={0}
          aria-label={`Open ${t.label}`}
          onClick={() => navigate(t.path)}
          onKeyDown={(e) => onKey(e, t.path)}
          className="group rounded-2xl border border-neutral-200/60 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-xl p-2 bg-neutral-100 dark:bg-neutral-800">
              {t.icon}
            </span>
            <div className="text-lg font-semibold">{t.label}</div>
          </div>
          <div className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200">
            View and manage {t.label.toLowerCase()}
          </div>
        </div>
      ))}
    </div>
  );
}