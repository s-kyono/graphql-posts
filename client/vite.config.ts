import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
	plugins: [tailwindcss(), tanstackRouter(), react(), svgr()],
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
			"@graphql-posts/shared": resolve(__dirname, "../graphql/shared/schemas/index.ts"),
			"@graphql-posts/graphql-types": resolve(__dirname, "../graphql/generated/graphql-types.ts"),
		},
	},
	optimizeDeps: {
		include: ['zod'],
	},
	server: {
		host: true,
		port: 5173,
		hmr: {
			protocol: "wss",
			clientPort: 443,
		},
		watch: {
			usePolling: true,
		},
		allowedHosts: ["localhost", "127.0.0.1"],
	},
});
