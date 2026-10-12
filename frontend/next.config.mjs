import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Set the Turbopack root directory to the workspace root
    root: path.join(__dirname, '..'),
  },
};

export default nextConfig;
