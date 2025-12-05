import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource as DataSourceEntity, DatabaseType } from '../entities/data-source.entity';
import { DatabaseSchema, DatabaseType as SchemaDatabaseType } from '../types/database-schema.type';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn']
  });

  try {
    const repo = app.get<Repository<DataSourceEntity>>(
      getRepositoryToken(DataSourceEntity)
    );

    const name = 'Northwind Demo';

    let existing = await repo.findOne({ where: { name } });
    if (existing) {
      console.log(`Data source already exists: ${existing.id} (${existing.name})`);
      return;
    }

    // Load the comprehensive Northwind schema
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '../data/northwind-schema.json');
    const demoSchema: DatabaseSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

    // Use environment variables or defaults
    const server = process.env.DB_SERVER || 'localhost';
    const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 1433;
    const database = process.env.DB_NAME || 'Northwind';
    const username = process.env.DB_USER || 'sa';
    const password = process.env.DB_PASSWORD || 'strongPassword!';

    const entity = repo.create({
      name,
      type: DatabaseType.SQLSERVER,
      server,
      port,
      database,
      username,
      password,
      schema: demoSchema
    });

    const saved = await repo.save(entity);
    console.log('Inserted data source:', saved);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

run();

