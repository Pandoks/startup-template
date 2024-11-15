import { defineConfig } from 'drizzle-kit';

const USER_DB_USERNAME = process.env.USER_DB_USERNAME;
const USER_DB_PASSWORD = process.env.USER_DB_PASSWORD;
const USER_DB_HOST = process.env.USER_DB_HOST;
const USER_DB_PORT = process.env.USER_DB_PORT;
const USER_DB_DATABASE = process.env.USER_DB_DATABASE;

if (
  !USER_DB_DATABASE ||
  !USER_DB_PORT ||
  !USER_DB_HOST ||
  USER_DB_PASSWORD === undefined ||
  USER_DB_PASSWORD === null ||
  !USER_DB_USERNAME
) {
  throw new Error('Database credentials is required');
}

export default defineConfig({
  schema: './src/lib/db/postgres/schema/*',
  dialect: 'postgresql',
  out: './src/lib/db/postgres/migrations',
  migrations: {
    prefix: 'timestamp' // compatible with Supabase
  },
  dbCredentials: {
    user: USER_DB_USERNAME,
    password: USER_DB_PASSWORD,
    host: USER_DB_HOST,
    port: parseInt(USER_DB_PORT),
    database: USER_DB_DATABASE,
    ssl: false // enable ssl for production
  },
  verbose: true,
  strict: true
});
