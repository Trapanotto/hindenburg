import { defineConfig } from 'vite';

// relative Pfade, damit der fertige Ordner dist/ auch in einem Unterverzeichnis eines Webservers läuft
export default defineConfig({ base: './', build: { chunkSizeWarningLimit: 1200 } });
