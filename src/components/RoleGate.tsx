```tsx
import { useEffect, useState } from "react";
import { getRole, Role } from "../utils/session";

/**
 * TEMP MODE: if user is OWNER or ADD_ONLY, allow.
 * Falls back only when unauthenticated or errors out.
 * Remove this relaxation once RBAC is fully verified.
 */
type Props = { allow?: Role | Role[]; children: React.ReactNode; fallback?: React.ReactNode };

export default function RoleGate({ allow, children, fallback }: Props) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const role = await getRole();
        const allowed = role === "OWNER" || role === "ADD_ONLY";
        setOk(allowed);
      } catch (e: any) {
        // unauthenticated → block
        setOk(false);
      }
    })();
  }, []);

  if (ok === null) return <div className="p-4">Loading…</div>;
  if (!ok) return <>{fallback ?? <div>Not allowed</div>}</>;
  return <>{children}</>;
}
```