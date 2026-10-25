import path from 'node:path';
import { env } from '$env/dynamic/private';

const baseDataFolder = env.HOST_DATA_PATH || 'data';
export const UPLOAD_DIR = path.resolve(baseDataFolder, 'uploads');
