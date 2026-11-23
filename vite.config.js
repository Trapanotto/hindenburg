import { defineConfig } from 'vite';

// relative Pfade, damit der fertige Ordner dist/ auch in einem Unterverzeichnis eines Webservers läuft
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // three.js als eigene Datei: ändert sich selten und bleibt bei neuen Ständen im Browser-Cache
        manualChunks: (id) => (id.includes('node_modules/three/build/') ? 'three' : undefined),
      },
    },
  },
});
