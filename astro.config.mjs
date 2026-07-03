import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  server: {
    port: 4321,
    host: '127.0.0.1'
  },
  devToolbar: { enabled: false }
});
