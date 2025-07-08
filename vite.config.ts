import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    include: ["react", "react-dom", "recharts"],
  },
  build: {
    commonjsOptions: {
      include: [/recharts/, /node_modules/],
    },
  },
  define: {
    global: "globalThis",
  },
});
