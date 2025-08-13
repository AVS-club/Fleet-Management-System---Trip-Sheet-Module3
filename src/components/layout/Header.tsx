import { useEffect, useState } from "react";
import { getRole, Role } from "../../utils/session";
import ThemeToggle from "../ui/ThemeToggle"; // correct path from layout/ → ui/

const Header: React.FC = () => {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await getRole();
        setRole(r);
      } catch {
        // ignore if not logged in yet
      }
    })();
  }, []);

  const isOwner = role === "OWNER";

  return (
    <header className="border-b p-3 flex items-center gap-3">
      <div className="font-semibold">AVS</div>
      <nav className="ml-auto flex gap-3 text-sm">
        {isOwner ? (
          <>
            <a href="/">Dashboard</a>
            <a href="/vehicles">Vehicles</a>
            <a href="/trips">Trips</a>
            <a href="/maintenance">Maintenance</a>
            <a href="/drivers">Drivers</a>
            <a href="/alerts">AI Alerts</a>
            <a href="/admin">Admin</a>
            <a href="/trip-pnl-reports">Trip P&amp;L</a>
            <a href="/parts-health">Parts Health</a>
            <a href="/notifications">Notifications</a>
            <a href="/drivers/insights">Driver Insights</a>
          </>
        ) : (
          <a href="/add">Add</a>
        )}
      </nav>
      <ThemeToggle />
    </header>
  );
};

export default Header;
