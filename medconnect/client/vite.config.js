import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify(
      process.env.VITE_API_URL || "http://localhost:3000"
    ),
    global: "globalThis",
    // giữ nguyên cấu trúc process.env bạn đang dùng
    process: {
      env: {
        VITE_SIGNALING_SERVER_URL: JSON.stringify(
          process.env.VITE_SIGNALING_SERVER_URL || "http://localhost:9999"
        ),
        VITE_VIDEO_QUALITY: JSON.stringify(
          process.env.VITE_VIDEO_QUALITY || "medium"
        ),
        VITE_AUDIO_QUALITY: JSON.stringify(
          process.env.VITE_AUDIO_QUALITY || "medium"
        ),
        VITE_MAX_CALL_DURATION: JSON.stringify(
          process.env.VITE_MAX_CALL_DURATION || "3600"
        ),
        VITE_DEBUG_WEBRTC: JSON.stringify(
          process.env.VITE_DEBUG_WEBRTC || "false"
        ),
        VITE_ENABLE_VIDEO_CALL: JSON.stringify(
          process.env.VITE_ENABLE_VIDEO_CALL || "true"
        ),
        VITE_API_BASE_URL: JSON.stringify(
          process.env.VITE_API_BASE_URL || "http://localhost:9999/api"
        ),
      },
    },
  },
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },

  // ==== quan trọng: xử lý dependency gây lỗi (immer/recharts)
  optimizeDeps: {
    // buộc pre-bundle khi dev để esbuild hiểu module
    include: ["simple-peer", "buffer", "immer", "recharts"],
  },

  // Đảm bảo build (Rollup + @rollup/plugin-commonjs) xử lý đúng các module trong node_modules
  build: {
    commonjsOptions: {
      // include toàn bộ node_modules (an toàn) — giúp xử lý các .mjs/.cjs trong deps
      include: [/node_modules/],
      // nếu cần, có thể bỏ comment và thêm namedExports/transformMixedEsModules tuỳ lib
      // transformMixedEsModules: true,
    },
  },

  // Nếu bạn dùng SSR trên Vercel hoặc target bundle có SSR, bất cứ khi nào
  // một dependency cần được đóng gói thay vì external, dùng noExternal:
  // ssr: {
  //   noExternal: ['recharts', 'immer']
  // }
});
