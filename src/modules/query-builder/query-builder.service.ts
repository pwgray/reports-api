import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createConnection, Repository, DataSource as TypeOrmDataSource } from 'typeorm';
import { DataSource } from '../../entities/data-source.entity';

import {
  QueryConfiguration,
  FieldConfiguration,
  FilterConfiguration,
  JoinConfiguration,
  FieldDataType,
  AggregationType,
  FilterOperator,
  JoinType,
  LogicalOperator,
  SortOrder
} from '../../types/query-configuration.type';

@Injectable()
export class QueryBuilderService {
  constructor(
    @InjectRepository(DataSource)
    private dataSourceRepository: Repository<DataSource>,
  ) {}

  /**
   * Build SQL query from QueryConfiguration
   */
  async buildQuery(
    config: QueryConfiguration,
    parameters: Record<string, any> = {},
    databaseType: string = 'mssql' // Default to SQL Server
  ): Promise<string> {
    this.validateQueryConfiguration(config);
    
    let query = '';
    
    // Build SELECT clause with TOP for SQL Server if needed
    const useTop = databaseType === 'mssql' && config.limit && (!config.offset || config.offset === 0);
    query += this.buildSelectClause(config.fields, useTop ? config.limit : undefined);
    
    // Build FROM clause
    query += this.buildFromClause(config.tables[0]); // Primary table
    
    // Build JOIN clauses
    if (config.joins?.length) {
      query += this.buildJoinClauses(config.joins);
    }
    
    // Build WHERE clause
    if (config.filters?.length) {
      query += this.buildWhereClause(config.filters, parameters);
    }
    
    // Build GROUP BY clause (only if there are valid groupBy fields)
    if (config.groupBy?.length && this.hasValidGroupByFields(config.groupBy)) {
      query += this.buildGroupByClause(config.groupBy);
    }
    
    // Build HAVING clause
    if (config.having?.length) {
      query += this.buildHavingClause(config.having, parameters);
    }
    
    // Build ORDER BY clause (only if there are valid orderBy fields)
    if (config.orderBy?.length && this.hasValidOrderByFields(config.orderBy)) {
      query += this.buildOrderByClause(config.orderBy);
    } else if (databaseType === 'mssql' && config.limit) {
      // SQL Server requires ORDER BY when using OFFSET/FETCH
      // Default to ordering by the first field
      query += this.buildDefaultOrderByClause(config.fields);
    }
    
    // Build LIMIT clause with database-specific syntax
    if (config.limit) {
      query += this.buildLimitClause(config.limit, config.offset, databaseType);
    }
    
    return query.trim();
  }

  /**
   * Execute query against specified data source
   */
  async executeQuery(
    dataSourceId: string,
    query: string,
    parameters: Record<string, any> = {}
  ): Promise<any[]> {
    const dataSource = await this.dataSourceRepository.findOne({
      where: { id: dataSourceId }
    });
    
    if (!dataSource) {
      throw new NotFoundException('Data source not found');
    }

    // Create dynamic connection
    const connection = await this.createConnection(dataSource);
    
    try {
      // Replace parameters in query
      const parameterizedQuery = this.replaceParameters(query, parameters);
      
      // Execute query with timeout
      const startTime = Date.now();
      const result = await Promise.race([
        connection.query(parameterizedQuery),
        this.createTimeoutPromise(30000) // 30 second timeout
      ]);
      
      const executionTime = Date.now() - startTime;
      
      // Log query execution for monitoring
      this.logQueryExecution(dataSourceId, query, executionTime, result.length);
      
      return result;
    } finally {
      await connection.destroy();
    }
  }

  /**
   * Build SELECT clause with field aggregations and aliases
   */
  private buildSelectClause(fields: FieldConfiguration[], topLimit?: number): string {
    const selectFields = fields.map(field => {
      let fieldExpression = '';
      
      if (field.expression) {
        // Custom expression
        fieldExpression = field.expression;
      } else if (field.aggregation) {
        // Aggregated field
        fieldExpression = this.buildAggregateExpression(field);
      } else {
        // Simple field reference with schema qualification
        const tableRef = this.buildTableReference(field.schemaName, field.tableName);
        fieldExpression = `${tableRef}.${this.escapeIdentifier(field.fieldName)}`;
      }
      
      return `${fieldExpression} AS ${this.escapeIdentifier(field.alias)}`;
    });
    
    // Add TOP for SQL Server if specified
    const topClause = topLimit ? `TOP ${topLimit} ` : '';
    return `SELECT ${topClause}${selectFields.join(', ')}\n`;
  }
  
  /**
   * Build a schema-qualified table reference
   */
  private buildTableReference(schemaName?: string, tableName?: string): string {
    if (!tableName) return '';
    if (schemaName) {
      return `${this.escapeIdentifier(schemaName)}.${this.escapeIdentifier(tableName)}`;
    }
    return this.escapeIdentifier(tableName);
  }

  /**
   * Build aggregate expression for field
   */
  private buildAggregateExpression(field: FieldConfiguration): string {
    console.log('🔧 buildAggregateExpression called:', {
      fieldName: field.fieldName,
      aggregation: field.aggregation,
      tableName: field.tableName,
      schemaName: field.schemaName
    });

    // Special case for COUNT(*) - handle both string comparison and enum
    // Check fieldName first to avoid escaping asterisk
    if (field.fieldName === '*') {
      console.log('✅ Detected asterisk field, returning COUNT(*)');
      return 'COUNT(*)';
    }
    
    const tableRef = this.buildTableReference(field.schemaName, field.tableName);
    const fieldRef = `${tableRef}.${this.escapeIdentifier(field.fieldName)}`;
    
    switch (field.aggregation) {
      case AggregationType.SUM:
        return `SUM(${fieldRef})`;
      case AggregationType.COUNT:
        return `COUNT(${fieldRef})`;
      case AggregationType.COUNT_DISTINCT:
        return `COUNT(DISTINCT ${fieldRef})`;
      case AggregationType.AVG:
        return `AVG(${fieldRef})`;
      case AggregationType.MIN:
        return `MIN(${fieldRef})`;
      case AggregationType.MAX:
        return `MAX(${fieldRef})`;
      case AggregationType.CONCAT:
        return `STRING_AGG(${fieldRef}, ', ')`;
      default:
        return fieldRef;
    }
  }

  /**
   * Build FROM clause
   */
  private buildFromClause(tableName: string): string {
    // Support schema.table format
    const parts = tableName.split('.');
    if (parts.length === 2) {
      return `FROM ${this.buildTableReference(parts[0], parts[1])}\n`;
    }
    return `FROM ${this.escapeIdentifier(tableName)}\n`;
  }

  /**
   * Build JOIN clauses
   */
  private buildJoinClauses(joins: JoinConfiguration[]): string {
    return joins.map(join => {
      const joinType = join.type.toUpperCase();
      const leftTableRef = this.buildTableReference(join.leftSchema, join.leftTable);
      const rightTableRef = this.buildTableReference(join.rightSchema, join.rightTable);
      
      const conditions = join.conditions.map(condition => {
        return `${leftTableRef}.${this.escapeIdentifier(condition.leftField)} ${condition.operator} ${rightTableRef}.${this.escapeIdentifier(condition.rightField)}`;
      }).join(' AND ');
      
      return `${joinType} JOIN ${rightTableRef} ON ${conditions}`;
    }).join('\n') + '\n';
  }

  /**
   * Build WHERE clause with complex filter logic
   */
  private buildWhereClause(
    filters: FilterConfiguration[],
    parameters: Record<string, any>
  ): string {
    if (!filters.length) return '';
    
    const conditions = this.buildFilterConditions(filters, parameters);
    return `WHERE ${conditions}\n`;
  }

  /**
   * Build filter conditions with proper grouping and logical operators
   */
  private buildFilterConditions(
    filters: FilterConfiguration[],
    parameters: Record<string, any>
  ): string {
    const conditions: string[] = [];
    
    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i];
      let condition = this.buildSingleFilterCondition(filter, parameters);
      
      // Add logical operator for next condition
      if (i < filters.length - 1 && filter.logicalOperator) {
        condition += ` ${filter.logicalOperator.toUpperCase()}`;
      }
      
      conditions.push(condition);
    }
    
    return conditions.join(' ');
  }

  /**
   * Build single filter condition
   */
  private buildSingleFilterCondition(
    filter: FilterConfiguration,
    parameters: Record<string, any>
  ): string {
    const tableRef = this.buildTableReference(filter.field.schemaName, filter.field.tableName);
    const fieldRef = `${tableRef}.${this.escapeIdentifier(filter.field.fieldName)}`;
    const value = filter.isParameter ? parameters[filter.parameterName!] : filter.value;
    
    switch (filter.operator) {
      case FilterOperator.EQUALS:
        return `${fieldRef} = ${this.formatValue(value, filter.field.dataType)}`;
      
      case FilterOperator.NOT_EQUALS:
        return `${fieldRef} != ${this.formatValue(value, filter.field.dataType)}`;
      
      case FilterOperator.GREATER_THAN:
        return `${fieldRef} > ${this.formatValue(value, filter.field.dataType)}`;
      
      case FilterOperator.LESS_THAN:
        return `${fieldRef} < ${this.formatValue(value, filter.field.dataType)}`;
      
      case FilterOperator.BETWEEN:
        const startValue = this.formatValue(value.start, filter.field.dataType);
        const endValue = this.formatValue(value.end, filter.field.dataType);
        return `${fieldRef} BETWEEN ${startValue} AND ${endValue}`;
      
      case FilterOperator.IN:
        const inValues = Array.isArray(value) ? value : [value];
        const formattedValues = inValues.map(v => this.formatValue(v, filter.field.dataType)).join(', ');
        return `${fieldRef} IN (${formattedValues})`;
      
      case FilterOperator.LIKE:
      case 'contains': // Support 'contains' as alias for LIKE
        return `${fieldRef} LIKE ${this.formatValue(`%${value}%`, FieldDataType.STRING)}`;
      
      case FilterOperator.STARTS_WITH:
        return `${fieldRef} LIKE ${this.formatValue(`${value}%`, FieldDataType.STRING)}`;
      
      case FilterOperator.ENDS_WITH:
        return `${fieldRef} LIKE ${this.formatValue(`%${value}`, FieldDataType.STRING)}`;
      
      case FilterOperator.IS_NULL:
        return `${fieldRef} IS NULL`;
      
      case FilterOperator.IS_NOT_NULL:
        return `${fieldRef} IS NOT NULL`;
      
      default:
        throw new BadRequestException(`Unsupported filter operator: ${filter.operator}`);
    }
  }

  /**
   * Build GROUP BY clause
   */
  private buildGroupByClause(groupBy: any[]): string {
    const groupFields = groupBy.map(group => {
      const tableRef = this.buildTableReference(group.field.schemaName, group.field.tableName);
      return `${tableRef}.${this.escapeIdentifier(group.field.fieldName)}`;
    });
    
    return `GROUP BY ${groupFields.join(', ')}\n`;
  }

  /**
   * Build HAVING clause (similar to WHERE but for grouped results)
   */
  private buildHavingClause(
    having: FilterConfiguration[],
    parameters: Record<string, any>
  ): string {
    const conditions = this.buildFilterConditions(having, parameters);
    return `HAVING ${conditions}\n`;
  }

  /**
   * Build ORDER BY clause
   */
  private buildOrderByClause(orderBy: any[]): string {
    const sortFields = orderBy
      .sort((a, b) => a.priority - b.priority) // Sort by priority
      .map(order => {
        const fieldRef = order.field.aggregation
          ? this.buildAggregateExpression(order.field)
          : `${this.buildTableReference(order.field.schemaName, order.field.tableName)}.${this.escapeIdentifier(order.field.fieldName)}`;
        
        return `${fieldRef} ${order.direction.toUpperCase()}`;
      });
    
    return `ORDER BY ${sortFields.join(', ')}\n`;
  }

  /**
   * Build default ORDER BY clause (required for SQL Server OFFSET/FETCH)
   */
  private buildDefaultOrderByClause(fields: FieldConfiguration[]): string {
    if (fields.length === 0) {
      // Fallback to (SELECT NULL) if no fields
      return `ORDER BY (SELECT NULL)\n`;
    }
    
    // Order by the first field
    const firstField = fields[0];
    const tableRef = this.buildTableReference(firstField.schemaName, firstField.tableName);
    const fieldRef = `${tableRef}.${this.escapeIdentifier(firstField.fieldName)}`;
    return `ORDER BY ${fieldRef} ASC\n`;
  }

  /**
   * Build LIMIT clause with database-specific syntax
   */
  private buildLimitClause(limit: number, offset: number = 0, databaseType: string = 'mssql'): string {
    // SQL Server: Use TOP if no offset, otherwise use OFFSET/FETCH (which requires ORDER BY)
    if (databaseType === 'mssql') {
      if (offset === 0) {
        // Use TOP for simple limit without offset - doesn't require ORDER BY
        return ''; // TOP is added to SELECT clause instead
      } else {
        // OFFSET/FETCH requires ORDER BY (handled in buildQuery)
        return `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY\n`;
      }
    }
    
    // MySQL and PostgreSQL use LIMIT syntax
    let clause = `LIMIT ${limit}`;
    if (offset) {
      clause += ` OFFSET ${offset}`;
    }
    return clause + '\n';
  }

  /**
   * Check if groupBy array has valid fields
   */
  private hasValidGroupByFields(groupBy: any[]): boolean {
    return groupBy.some(group => 
      group.field && 
      group.field.tableName && 
      group.field.fieldName
    );
  }

  /**
   * Check if orderBy array has valid fields
   */
  private hasValidOrderByFields(orderBy: any[]): boolean {
    return orderBy.some(order => 
      order.field && 
      order.field.tableName && 
      order.field.fieldName
    );
  }

  /**
   * Format value based on data type for SQL
   */
  private formatValue(value: any, dataType: FieldDataType): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    
    switch (dataType) {
      case FieldDataType.STRING:
      case FieldDataType.TEXT:
        return `'${value.toString().replace(/'/g, "''")}'`; // Escape single quotes
      
      case FieldDataType.DATE:
      case FieldDataType.DATETIME:
        return `'${value}'`;
      
      case FieldDataType.NUMBER:
      case FieldDataType.INTEGER:
      case FieldDataType.DECIMAL:
      case FieldDataType.CURRENCY:
        return value.toString();
      
      case FieldDataType.BOOLEAN:
        return value ? '1' : '0';
      
      default:
        return `'${value.toString()}'`;
    }
  }

  /**
   * Escape SQL identifiers (table names, column names)
   */
  private escapeIdentifier(identifier: string): string {
    // Use square brackets for SQL Server, backticks for MySQL, double quotes for PostgreSQL
    return `[${identifier}]`; // SQL Server style
  }

  /**
   * Replace parameter placeholders in query
   */
  private replaceParameters(query: string, parameters: Record<string, any>): string {
    let result = query;
    
    Object.entries(parameters).forEach(([key, value]) => {
      const placeholder = `@${key}`;
      const formattedValue = typeof value === 'string' ? `'${value}'` : value.toString();
      result = result.replace(new RegExp(placeholder, 'g'), formattedValue);
    });
    
    return result;
  }

  /**
   * Validate query configuration before building
   */
  private validateQueryConfiguration(config: QueryConfiguration): void {
    if (!config.fields || config.fields.length === 0) {
      throw new BadRequestException('Query must have at least one field');
    }
    
    if (!config.tables || config.tables.length === 0) {
      throw new BadRequestException('Query must specify at least one table');
    }
    
    // Validate that all referenced tables in fields exist in tables array
    // Handle both schema-qualified (dbo.Customers) and unqualified (Customers) names
    const tableNames = new Set(config.tables);
    const unqualifiedTableNames = new Set(
      config.tables.map(t => t.includes('.') ? t.split('.').pop() : t)
    );
    
    config.fields.forEach(field => {
      // Build the fully qualified name if schema is present
      const fullyQualifiedName = field.schemaName 
        ? `${field.schemaName}.${field.tableName}` 
        : field.tableName;
      
      // Check if either the fully qualified name or just the table name exists
      const isValid = tableNames.has(fullyQualifiedName) || 
                     tableNames.has(field.tableName) ||
                     unqualifiedTableNames.has(field.tableName);
      
      if (!isValid) {
        throw new BadRequestException(
          `Field references unknown table: ${fullyQualifiedName}. Available tables: ${Array.from(tableNames).join(', ')}`
        );
      }
    });
  }

  /**
   * Create database connection based on data source configuration
   */
  private async createConnection(dataSource: DataSource): Promise<TypeOrmDataSource> {
    // Map database type names to TypeORM driver names
    const driverType = this.mapDatabaseTypeToDriver(dataSource.type);
    
    // Generate unique connection name to avoid conflicts
    const connectionName = `query_${dataSource.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const connectionOptions: any = {
      name: connectionName,
      type: driverType,
      host: dataSource.server,
      port: dataSource.port || this.getDefaultPort(driverType),
      username: dataSource.username,
      password: dataSource.password,
      database: dataSource.database,
      ...(process.env.DB_DOMAIN && process.env.DB_DOMAIN.trim() !== '' && { domain: process.env.DB_DOMAIN }),
      synchronize: false,
      logging: false,
      entities: [],
    };

    // Add SQL Server specific options for self-signed certificates
    if (driverType === 'mssql') {
      connectionOptions.options = {
        trustServerCertificate: true,  // Trust self-signed certificates
        encrypt: true,                  // Enable encryption
        enableArithAbort: true         // Required for some SQL Server versions
      };
    }

    return await createConnection(connectionOptions);
  }

  /**
   * Map database type names to TypeORM driver names
   */
  private mapDatabaseTypeToDriver(type: string): string {
    const typeMap: Record<string, string> = {
      'sqlserver': 'mssql',
      'mssql': 'mssql',
      'postgresql': 'postgres',
      'postgres': 'postgres',
      'mysql': 'mysql',
      'mariadb': 'mariadb',
      'sqlite': 'sqlite',
      'oracle': 'oracle',
      'mongodb': 'mongodb'
    };

    const mappedType = typeMap[type.toLowerCase()];
    if (!mappedType) {
      throw new BadRequestException(`Unsupported database type: ${type}`);
    }
    
    return mappedType;
  }

  /**
   * Create timeout promise for query execution
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Log query execution for monitoring and optimization
   */
  private logQueryExecution(
    dataSourceId: string,
    query: string,
    executionTime: number,
    resultCount: number
  ): void {
    console.log(`Query executed on ${dataSourceId}: ${executionTime}ms, ${resultCount} rows`);
    
    // In production, you might want to send this to a monitoring service
    if (executionTime > 10000) { // Log slow queries
      console.warn(`Slow query detected: ${executionTime}ms`);
    }
  }

  /**
   * Get default port for database type
   */
  private getDefaultPort(driverType: string): number {
    const defaultPorts: Record<string, number> = {
      'mssql': 1433,
      'postgres': 5432,
      'mysql': 3306,
      'mariadb': 3306,
      'oracle': 1521,
      'mongodb': 27017
    };
    return defaultPorts[driverType] || 1433;
  }
}