import React from "react";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/nav";
import { cn } from "../../utils/cn";

const AppNav: React.FC = () => {
  return (
    <nav
      className="flex items-center gap-1 md:gap-2 overflow-x-auto scrollbar-none"
      aria-label="Primary"
    >
      {NAV_ITEMS.map(({ to, label, Icon, ariaLabel }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "group inline-flex items-center rounded-lg px-2.5 py-2 md:px-3 transition",
              "text-gray-600 hover:text-primary-700 hover:bg-primary-50",
              isActive ? "bg-primary-100 text-primary-700 font-medium" : ""
            )
          }
          aria-label={ariaLabel ?? label}
          title={label} // tooltip when labels collapse
          end={to === "/"}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {/* label visible from md+; hidden on tight widths */}
          <span className="ml-2 hidden md:inline">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default AppNav;