import { useEffect, useState } from "react";

type Role = "OWNER" | "ADD_ONLY";

type Props = {
  allow: Role | Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function RoleGate({ allow, children, fallback }: Props) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const role = stored ? (JSON.parse(stored).role as Role | undefined) : undefined;
    const current: Role = role === "ADD_ONLY" ? "ADD_ONLY" : "OWNER";
    const allowed = Array.isArray(allow) ? allow.includes(current) : current === allow;
    setOk(allowed);
  }, [allow]);

  if (ok === null) return <div className="p-4">Loading…</div>;
  if (!ok) return <>{fallback ?? null}</>;
  return <>{children}</>;
}