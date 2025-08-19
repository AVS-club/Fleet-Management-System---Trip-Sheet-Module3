import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  anchorRef: React.RefObject<HTMLElement>;
  open: boolean;
  onClose?: () => void;
  maxHeight?: number; // px
  matchWidth?: boolean;
  className?: string;
  children: React.ReactNode;
};

const PortalDropdown: React.FC<Props> = ({
  anchorRef,
  open,
  onClose,
  maxHeight = 560,
  matchWidth = true,
  className = "",
  children,
}) => {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Position the panel relative to the anchor
  const recompute = () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Prefer showing below; if not enough space, show above
    const preferredTop = r.bottom + 6;
    const belowSpace = vh - preferredTop;
    const showAbove = belowSpace < 220 && r.top > belowSpace;

    const top = showAbove ? Math.max(8, r.top - maxHeight - 6) : preferredTop;

    setStyle({
      position: "fixed",
      top,
      left: Math.max(8, Math.min(r.left, vw - 8 - (matchWidth ? r.width : 360))),
      width: matchWidth ? r.width : undefined,
      maxHeight,
      zIndex: 10_000,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    recompute();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => recompute();
    const onResize = () => recompute();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (
        containerRef.current.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      onClose?.();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={containerRef}
      style={style}
      className={[
        "shadow-lg ring-1 ring-gray-200 rounded-md bg-white overflow-auto",
        className,
      ].join(" ")}
    >
      {children}
    </div>,
    document.body
  );
};

export default PortalDropdown;