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
    parameters: Record<string, any> = {}
  ): Promise<string> {
    this.validateQueryConfiguration(config);
    
    let query = '';
    
    // Build SELECT clause
    query += this.buildSelectClause(config.fields);
    
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
    
    // Build GROUP BY clause
    if (config.groupBy?.length) {
      query += this.buildGroupByClause(config.groupBy);
    }
    
    // Build HAVING clause
    if (config.having?.length) {
      query += this.buildHavingClause(config.having, parameters);
    }
    
    // Build ORDER BY clause
    if (config.orderBy?.length) {
      query += this.buildOrderByClause(config.orderBy);
    }
    
    // Build LIMIT clause
    if (config.limit) {
      query += this.buildLimitClause(config.limit, config.offset);
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
  private buildSelectClause(fields: FieldConfiguration[]): string {
    const selectFields = fields.map(field => {
      let fieldExpression = '';
      
      if (field.expression) {
        // Custom expression
        fieldExpression = field.expression;
      } else if (field.aggregation) {
        // Aggregated field
        fieldExpression = this.buildAggregateExpression(field);
      } else {
        // Simple field reference
        fieldExpression = `${this.escapeIdentifier(field.tableName)}.${this.escapeIdentifier(field.fieldName)}`;
      }
      
      return `${fieldExpression} AS ${this.escapeIdentifier(field.alias)}`;
    });
    
    return `SELECT ${selectFields.join(', ')}\n`;
  }

  /**
   * Build aggregate expression for field
   */
  private buildAggregateExpression(field: FieldConfiguration): string {
    const fieldRef = `${this.escapeIdentifier(field.tableName)}.${this.escapeIdentifier(field.fieldName)}`;
    
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
    return `FROM ${this.escapeIdentifier(tableName)}\n`;
  }

  /**
   * Build JOIN clauses
   */
  private buildJoinClauses(joins: JoinConfiguration[]): string {
    return joins.map(join => {
      const joinType = join.type.toUpperCase();
      const conditions = join.conditions.map(condition => {
        return `${this.escapeIdentifier(join.leftTable)}.${this.escapeIdentifier(condition.leftField)} ${condition.operator} ${this.escapeIdentifier(join.rightTable)}.${this.escapeIdentifier(condition.rightField)}`;
      }).join(' AND ');
      
      return `${joinType} JOIN ${this.escapeIdentifier(join.rightTable)} ON ${conditions}`;
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
    const fieldRef = `${this.escapeIdentifier(filter.field.tableName)}.${this.escapeIdentifier(filter.field.fieldName)}`;
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
      return `${this.escapeIdentifier(group.field.tableName)}.${this.escapeIdentifier(group.field.fieldName)}`;
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
          : `${this.escapeIdentifier(order.field.tableName)}.${this.escapeIdentifier(order.field.fieldName)}`;
        
        return `${fieldRef} ${order.direction.toUpperCase()}`;
      });
    
    return `ORDER BY ${sortFields.join(', ')}\n`;
  }

  /**
   * Build LIMIT clause with optional offset
   */
  private buildLimitClause(limit: number, offset?: number): string {
    let clause = `LIMIT ${limit}`;
    if (offset) {
      clause += ` OFFSET ${offset}`;
    }
    return clause + '\n';
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
    const tableNames = new Set(config.tables);
    config.fields.forEach(field => {
      if (!tableNames.has(field.tableName)) {
        throw new BadRequestException(`Field references unknown table: ${field.tableName}`);
      }
    });
  }

  /**
   * Create database connection based on data source configuration
   */
  private async createConnection(dataSource: DataSource): Promise<TypeOrmDataSource> {
    const connectionOptions = {
      type: dataSource.type as any,
      host: this.extractHostFromConnectionString(dataSource.connectionString),
      port: this.extractPortFromConnectionString(dataSource.connectionString),
      username: this.extractUsernameFromConnectionString(dataSource.connectionString),
      password: this.extractPasswordFromConnectionString(dataSource.connectionString),
      database: this.extractDatabaseFromConnectionString(dataSource.connectionString),
      synchronize: false,
      logging: false,
      entities: [],
    };

    return await createConnection(connectionOptions);
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

  // Helper methods for parsing connection strings
  private extractHostFromConnectionString(connectionString: string): string {
    // Implementation depends on your connection string format
    const match = connectionString.match(/Server=([^;]+)/i);
    return match ? match[1] : 'localhost';
  }

  private extractPortFromConnectionString(connectionString: string): number {
    const match = connectionString.match(/Port=([^;]+)/i);
    return match ? parseInt(match[1]) : 1433;
  }

  private extractUsernameFromConnectionString(connectionString: string): string {
    const match = connectionString.match(/User ID=([^;]+)/i);
    return match ? match[1] : '';
  }

  private extractPasswordFromConnectionString(connectionString: string): string {
    const match = connectionString.match(/Password=([^;]+)/i);
    return match ? match[1] : '';
  }

  private extractDatabaseFromConnectionString(connectionString: string): string {
    const match = connectionString.match(/Database=([^;]+)/i);
    return match ? match[1] : '';
  }
}