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
  optimizeDeps: {
    include: ["simple-peer", "buffer"],
  },
});
