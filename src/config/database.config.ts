import { registerAs } from '@nestjs/config';
import { SqlServerConnectionOptions } from 'typeorm/driver/sqlserver/SqlServerConnectionOptions';

export default registerAs('database', (): SqlServerConnectionOptions => ({
  type: 'mssql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  username: process.env.DB_USERNAME || 'sa',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'reports_db',
  schema: process.env.DB_SCHEMA || 'dbo',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  extra: {
    poolSize: 5,
    max: 10,
  },
  requestTimeout: 30000
}));

// export default () => ({
//   database: {
//     type: "mssql",
//     host: 'localhost',
//     username: 'sa',
//     password: 'Heroguy2025!',
//     database: 'reports_db',
//     options: {
//       encrypt: true,
//       trustServerCertificate: true,
//       port: 1433,  // SQL Server default port
//       enableArithAbort: true,
//     },
//     synchronize: process.env.NODE_ENV === 'development',
//     logging: process.env.NODE_ENV === 'development',
//     entities: [__dirname + '/../**/*.entity{.ts,.js}'],
//     migrations: [__dirname + '/../migrations/*{.ts,.js}'],
//     extra: {
//       poolSize: 5,
//       max: 10,
//     },
//   },
//   redis: {
//     host: process.env.REDIS_HOST || 'localhost',
//     port: parseInt(process.env.REDIS_PORT || '6379'),
//   },
//   jwt: {
//     secret: process.env.JWT_SECRET,
//     signOptions: { expiresIn: '24h' },
//   },
// });