import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: "../static",
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            onwarn: (warning) => {
              if (warning.code === 'Module level directives cause errors when bundled, "use client" in "node_modules/react-pdf/dist/esm/Page/PageCanvas.js" was ignored.') {
                throw new Error(warning.message);
              }
            },
          },
    },
    server: {
        proxy: {
            "/ask": "http://localhost:5000",
            "/chat": "http://localhost:5000",
        }
    }
});
