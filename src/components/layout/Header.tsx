import ThemeToggle from "../ui/ThemeToggle"; // correct path from layout/ → ui/

type Role = "OWNER" | "ADD_ONLY";

const Header: React.FC = () => {
  const stored = localStorage.getItem("user");
  const role = stored ? (JSON.parse(stored).role as Role | undefined) : undefined;
  const isOwner = role !== "ADD_ONLY";

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
