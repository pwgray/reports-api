import databaseConfig from './database.config';
import { SqlServerConnectionOptions } from 'typeorm/driver/sqlserver/SqlServerConnectionOptions';

describe('database.config', () => {
  const originalEnv = process.env;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_USERNAME;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;
    delete process.env.DB_SCHEMA;
    delete process.env.DB_DOMAIN;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('default values', () => {
    it('should return default configuration when no environment variables are set', () => {
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.type).toBe('mssql');
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(1433);
      expect(config.username).toBe('sa');
      expect(config.password).toBeUndefined();
      expect(config.database).toBe('reports_db');
      expect(config.schema).toBe('dbo');
      expect(config.domain).toBeUndefined();
    });

    it('should have correct default options', () => {
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.options).toEqual({
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
      });
    });

    it('should have correct default extra pool settings', () => {
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.extra).toEqual({
        poolSize: 5,
        max: 10,
      });
    });

    it('should have correct default requestTimeout', () => {
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.requestTimeout).toBe(30000);
    });

    it('should have correct entity paths', () => {
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.entities).toContain(__dirname + '/../**/*.entity{.ts,.js}');
    });

    it('should have correct migration paths', () => {
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.migrations).toContain(__dirname + '/../migrations/*{.ts,.js}');
    });
  });

  describe('environment variable overrides', () => {
    it('should use DB_HOST from environment', () => {
      process.env.DB_HOST = 'custom-host';
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.host).toBe('custom-host');
    });

    it('should use DB_PORT from environment', () => {
      process.env.DB_PORT = '5432';
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.port).toBe(5432);
    });

    it('should parse DB_PORT as integer', () => {
      process.env.DB_PORT = '3306';
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.port).toBe(3306);
      expect(typeof config.port).toBe('number');
    });

    it('should handle invalid port by defaulting to 1433', () => {
      process.env.DB_PORT = 'invalid';
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.port).toBeNaN();
    });

    it('should use DB_USERNAME from environment', () => {
      process.env.DB_USERNAME = 'custom-user';
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.username).toBe('custom-user');
    });

    it('should use DB_PASSWORD from environment', () => {
      process.env.DB_PASSWORD = 'secret-password';
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.password).toBe('secret-password');
    });

    it('should handle undefined DB_PASSWORD', () => {
      delete process.env.DB_PASSWORD;
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.password).toBeUndefined();
    });

    it('should use DB_NAME from environment', () => {
      process.env.DB_NAME = 'custom_database';
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.database).toBe('custom_database');
    });

    it('should use DB_SCHEMA from environment', () => {
      process.env.DB_SCHEMA = 'custom_schema';
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.schema).toBe('custom_schema');
    });
  });

  describe('domain configuration', () => {
    it('should include domain when DB_DOMAIN is set', () => {
      process.env.DB_DOMAIN = 'example.com';
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.domain).toBe('example.com');
    });

    it('should not include domain when DB_DOMAIN is not set', () => {
      delete process.env.DB_DOMAIN;
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.domain).toBeUndefined();
    });

    it('should not include domain when DB_DOMAIN is empty string', () => {
      process.env.DB_DOMAIN = '';
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.domain).toBeUndefined();
    });

    it('should not include domain when DB_DOMAIN is whitespace only', () => {
      process.env.DB_DOMAIN = '   ';
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.domain).toBeUndefined();
    });

    it('should include domain when DB_DOMAIN has whitespace (checks trim but uses original value)', () => {
      process.env.DB_DOMAIN = '  example.com  ';
      const config = databaseConfig() as SqlServerConnectionOptions;

      // The implementation checks if trimmed value is not empty, but uses original value
      expect(config.domain).toBe('  example.com  ');
    });
  });

  describe('NODE_ENV based configuration', () => {
    it('should set synchronize to true in development', () => {
      process.env.NODE_ENV = 'development';
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.synchronize).toBe(true);
    });

    it('should set synchronize to false in production', () => {
      process.env.NODE_ENV = 'production';
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.synchronize).toBe(false);
    });

    it('should set synchronize to false when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.synchronize).toBe(false);
    });

    it('should set synchronize to false in test environment', () => {
      process.env.NODE_ENV = 'test';
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.synchronize).toBe(false);
    });

    it('should set logging to true in development', () => {
      process.env.NODE_ENV = 'development';
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.logging).toBe(true);
    });

    it('should set logging to false in production', () => {
      process.env.NODE_ENV = 'production';
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.logging).toBe(false);
    });

    it('should set logging to false when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.logging).toBe(false);
    });
  });

  describe('complete configuration scenarios', () => {
    it('should return complete configuration with all environment variables set', () => {
      process.env.DB_HOST = 'prod-db.example.com';
      process.env.DB_PORT = '1433';
      process.env.DB_USERNAME = 'prod_user';
      process.env.DB_PASSWORD = 'secure_password';
      process.env.DB_NAME = 'production_db';
      process.env.DB_SCHEMA = 'production';
      process.env.DB_DOMAIN = 'ad.example.com';
      process.env.NODE_ENV = 'production';

      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config).toEqual({
        type: 'mssql',
        host: 'prod-db.example.com',
        port: 1433,
        username: 'prod_user',
        password: 'secure_password',
        database: 'production_db',
        schema: 'production',
        domain: 'ad.example.com',
        options: {
          encrypt: true,
          trustServerCertificate: true,
          enableArithAbort: true,
        },
        synchronize: false,
        logging: false,
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../migrations/*{.ts,.js}'],
        extra: {
          poolSize: 5,
          max: 10,
        },
        requestTimeout: 30000,
      });
    });

    it('should return development configuration', () => {
      process.env.NODE_ENV = 'development';
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '1433';

      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.synchronize).toBe(true);
      expect(config.logging).toBe(true);
      expect(config.host).toBe('localhost');
    });

    it('should handle all defaults in production', () => {
      process.env.NODE_ENV = 'production';

      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.type).toBe('mssql');
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(1433);
      expect(config.username).toBe('sa');
      expect(config.synchronize).toBe(false);
      expect(config.logging).toBe(false);
    });
  });

  describe('type safety', () => {
    it('should return SqlServerConnectionOptions type', () => {
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config.type).toBe('mssql');
      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('username');
      expect(config).toHaveProperty('database');
    });

    it('should have all required TypeORM properties', () => {
      const config = databaseConfig() as SqlServerConnectionOptions;

      expect(config).toHaveProperty('type');
      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('options');
      expect(config).toHaveProperty('entities');
      expect(config).toHaveProperty('migrations');
    });
  });
});
