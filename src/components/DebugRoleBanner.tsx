```tsx
import { useEffect, useState } from "react";
import { __debugGetRole } from "../utils/session";

export default function DebugRoleBanner() {
  const [text, setText] = useState<string>("role: …");
  useEffect(() => {
    (async () => {
      const r = await __debugGetRole();
      setText(\`role: ${r}`);
    })();
  }, []);
  return (
    <div style={{
      position: "fixed",
      bottom: 8,
      left: 8,
      zIndex: 9999,
      padding: "6px 10px",
      borderRadius: 8,
      background: "#111827",
      color: "white",
      fontSize: 12,
      opacity: 0.8
    }}>
      {text}
    </div>
  );
}
```