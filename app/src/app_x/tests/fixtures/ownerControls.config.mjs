import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Isolated in-memory fixture: never imports Firebase or writes production data.
export default defineConfig({
  root: fileURLToPath(new URL('../../../../', import.meta.url)),
  plugins: [{ name: 'fixture-actions', enforce: 'pre', resolveId(source, importer) {
    if (source === '../data/actions' && importer?.endsWith('/forms/useLogEditor.ts'))
      return fileURLToPath(new URL('./ownerControls.actions.ts', import.meta.url));
  } }, react()],
  server: { host: '127.0.0.1', port: 5176, strictPort: true },
});
