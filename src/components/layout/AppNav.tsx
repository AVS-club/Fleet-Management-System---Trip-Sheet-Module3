import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_LINKS } from './navLinks';
import { CircleEllipsis as Ellipsis } from 'lucide-react';
import clsx from 'clsx';

const Tip: React.FC<{ text: string }> = ({ text }) => (
  <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity z-50">
    {text}
  </span>
);

const Brand: React.FC = () => (
  <Link to="/" className="flex items-center gap-2 shrink-0">
    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
      <span className="text-white font-bold text-sm">AV</span>
    </div>
    <span className="hidden md:inline xl:hidden font-semibold tracking-tight text-gray-900">AVS</span>
    <span className="hidden xl:inline font-semibold tracking-tight text-gray-900">Auto Vital</span>
  </Link>
);

const AppNav: React.FC = () => {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const sorted = useMemo(
    () => [...NAV_LINKS].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99)),
    []
  );

  const NavButton: React.FC<{
    to: string;
    label: string;
    icon: any;
    active: boolean;
    showLabel: boolean;
  }> = ({ to, label, icon: Icon, active, showLabel }) => (
    <Link
      to={to}
      className={clsx(
        'group relative inline-flex items-center rounded-lg px-3 py-2 text-sm transition-colors',
        active 
          ? 'bg-blue-50 text-blue-700' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
    >
      <Icon className="h-5 w-5" />
      {showLabel && <span className="ml-2">{label}</span>}
      {!showLabel && <Tip text={label} />}
    </Link>
  );

  const visibleSm = 5;
  const headSm = sorted.slice(0, visibleSm);
  const overflowSm = sorted.slice(visibleSm);

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between">
          <Brand />

          {/* NAV: no horizontal scrollbars */}
          <nav className="flex items-center gap-1 overflow-visible">
            {/* xl: icon + label */}
            <div className="hidden xl:flex items-center gap-1">
              {sorted.map(link => (
                <NavButton
                  key={link.to}
                  to={link.to}
                  label={link.label}
                  icon={link.icon}
                  active={pathname === link.to || (link.to !== '/' && pathname.startsWith(link.to))}
                  showLabel
                />
              ))}
            </div>

            {/* md–lg: icons only */}
            <div className="hidden md:flex xl:hidden items-center gap-1">
              {sorted.map(link => (
                <NavButton
                  key={link.to}
                  to={link.to}
                  label={link.label}
                  icon={link.icon}
                  active={pathname === link.to || (link.to !== '/' && pathname.startsWith(link.to))}
                  showLabel={false}
                />
              ))}
            </div>

            {/* <md: top N icons + More */}
            <div className="flex md:hidden items-center gap-1">
              {headSm.map(link => (
                <NavButton
                  key={link.to}
                  to={link.to}
                  label={link.label}
                  icon={link.icon}
                  active={pathname === link.to || (link.to !== '/' && pathname.startsWith(link.to))}
                  showLabel={false}
                />
              ))}
              {overflowSm.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setMoreOpen(v => !v)}
                    className="inline-flex items-center rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    aria-haspopup="menu"
                    aria-expanded={moreOpen}
                  >
                    <Ellipsis className="h-5 w-5" />
                  </button>
                  {moreOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-44 rounded-lg border bg-white p-1 shadow-lg"
                      onMouseLeave={() => setMoreOpen(false)}
                    >
                      {overflowSm.map(link => (
                        <Link
                          key={link.to}
                          to={link.to}
                          className={clsx(
                            'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50',
                            (pathname === link.to || (link.to !== '/' && pathname.startsWith(link.to))) && 'bg-blue-50 text-blue-700'
                          )}
                          onClick={() => setMoreOpen(false)}
                          role="menuitem"
                        >
                          <link.icon className="h-4 w-4" />
                          <span>{link.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Right side: placeholder for existing actions */}
          <div className="flex items-center gap-2">
            {/* Your existing dark mode toggle and logout buttons go here */}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppNav;