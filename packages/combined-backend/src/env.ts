// Pre-load environment variables from the monorepo root .env
// This file MUST be imported/required before any other module
import dotenv from 'dotenv';
import path from 'path';

// Resolve to BMCP/.env (3 levels up from src/index.ts → combined-backend → packages → BMCP)
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });
