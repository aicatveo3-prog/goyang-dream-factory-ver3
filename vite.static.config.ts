/**
 * 정적(서버 없는) 배포 전용 Vite 설정.
 *
 * 참가자용 게임(Home)은 서버 호출이 전혀 없으므로 순수 정적 사이트로
 * 배포할 수 있다. Manus 전용 플러그인과 디버그 수집기는 제외한다.
 *
 * 사용법:  pnpm exec vite build --config vite.static.config.ts
 */
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// 기본값은 루트 도메인 배포(Vercel 등)를 가정한다.
// GitHub Pages처럼 하위 경로에 올릴 때만 DEPLOY_BASE로 덮어쓴다.
//   예: DEPLOY_BASE=/goyang-dream-factory-ver3/ pnpm exec vite build --config vite.static.config.ts
const base = process.env.DEPLOY_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist-static"),
    emptyOutDir: true,
    sourcemap: false,
  },
});
