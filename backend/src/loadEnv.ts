import path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnvFile } from 'dotenv';

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnvFile({ path: path.join(backendRoot, '.env') });
