import ThemeToggle from "../ui/ThemeToggle"; // correct path from layout/ → ui/

const Header = () => {
  return (
    <header className="border-b p-3 flex items-center gap-3">
      <div className="font-semibold">AVS</div>
      <nav className="ml-auto flex gap-3 text-sm">
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
      </nav>
      <ThemeToggle />
    </header>
  );
};

export default Header;
