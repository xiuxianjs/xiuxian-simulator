import { defineConfig } from 'lvyjs';
import postcss from 'lvyjs-plugin-postcss';
import tailwindcss from 'lvyjs-plugin-tailwindcss';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  env: process.env,
  plugins: [
    postcss(),
    tailwindcss()
  ],
  watch: [
    'src/**/*.{ts,tsx,js,jsx,json,html}'
  ],
  alias: {
    entries: [{ find: '@src', replacement: join(__dirname, 'src') }]
  },
  assets: {
    filter: /\.(png|jpg|jpeg|gif|svg|webp|ico|yaml|txt|ttf)$/
  },
  build: {
    // dts: true
  }
});
