import { useEffect, useState } from "react";
import { getRole, Role } from "../utils/session";

type Props = { 
  allow: Role | Role[]; 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
};

export default function RoleGate({ allow, children, fallback }: Props) {
  const [ok, setOk] = useState<boolean | null>(null);
  
  useEffect(() => {
    (async () => {
      try {
        const role = await getRole();
        const allowed = Array.isArray(allow) ? allow.includes(role) : role === allow;
        setOk(allowed);
      } catch {
        setOk(false);
      }
    })();
  }, [allow]);
  
  if (ok === null) return <div className="p-4">Loading…</div>;
  if (!ok) return <>{fallback ?? null}</>;
  return <>{children}</>;
}