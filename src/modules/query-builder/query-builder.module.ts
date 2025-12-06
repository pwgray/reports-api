import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { QueryBuilderService } from "./query-builder.service";
import { DataSourceService } from "./data-source.service";
import { DataSource } from "../../entities/data-source.entity";
import { DataSourceController } from "./data-source.controller";

/**
 * Query Builder Module
 * 
 * This NestJS module provides functionality for building and executing SQL queries,
 * managing data sources, and performing database schema introspection. It serves
 * as the core module for query construction and data source management in the reports system.
 * 
 * @module QueryBuilderModule
 * 
 * @description
 * The QueryBuilderModule encapsulates:
 * - **Query Building**: Dynamic SQL query construction from structured configurations
 * - **Data Source Management**: CRUD operations for database connections
 * - **Schema Introspection**: Discovery and analysis of database structures
 * - **Database Connections**: Connection pooling and management for multiple database types
 * 
 * @exports
 * - `QueryBuilderService`: Service for building and executing SQL queries
 * - `DataSourceService`: Service for managing data sources and database connections
 * 
 * @imports
 * - `TypeOrmModule.forFeature([DataSource])`: Provides TypeORM repository for DataSource entity
 * 
 * @controllers
 * - `DataSourceController`: REST API endpoints for data source management
 * 
 * @example
 * ```typescript
 * // Import the module in your app module
 * import { QueryBuilderModule } from './modules/query-builder/query-builder.module';
 * 
 * @Module({
 *   imports: [QueryBuilderModule],
 * })
 * export class AppModule {}
 * 
 * // Use the exported services in other modules
 * import { QueryBuilderService, DataSourceService } from './modules/query-builder/query-builder.module';
 * ```
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DataSource])
  ],
  controllers: [DataSourceController],
  providers: [QueryBuilderService, DataSourceService],
  exports: [QueryBuilderService, DataSourceService],
})
export class QueryBuilderModule {}