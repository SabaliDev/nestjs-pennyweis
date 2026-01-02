import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const isProduction = process.env.NODE_ENV === 'production';
const dbUrl = process.env.DATABASE_URL;

const configOptions: any = {
  type: 'postgres',
  synchronize: false,
  logging: true,
  entities: ['src/**/*.entity.ts'],
  migrations: ['database/migrations/*.ts'],
  ssl: isProduction ? { rejectUnauthorized: false } : false,
};

if (dbUrl) {
  configOptions.url = dbUrl;
} else {
  configOptions.host = process.env.DB_HOST || process.env.PGHOST || 'localhost';
  configOptions.port = parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10);
  configOptions.username = process.env.DB_USERNAME || process.env.PGUSER || 'postgres';
  configOptions.password = process.env.DB_PASSWORD || process.env.PGPASSWORD || 'postgres';
  configOptions.database = process.env.DB_DATABASE || process.env.PGDATABASE || 'pennyweis_db';
}

export default new DataSource(configOptions);