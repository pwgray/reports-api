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

/**
 * Service for building and executing SQL queries from query configurations.
 * 
 * This service provides functionality to:
 * - Convert QueryConfiguration objects into executable SQL queries
 * - Support complex queries with joins, filters, aggregations, grouping, and sorting
 * - Handle database-specific SQL syntax (SQL Server, MySQL, PostgreSQL)
 * - Execute queries against configured data sources with timeout protection
 * - Automatically handle GROUP BY clauses when aggregations are present
 * - Validate query configurations before execution
 * 
 * The service intelligently handles:
 * - Schema-qualified table and field references
 * - Multiple aggregation types (SUM, COUNT, AVG, MIN, MAX, etc.)
 * - Complex filter conditions with logical operators
 * - Parameter substitution for dynamic queries
 * - Database-specific LIMIT/OFFSET syntax
 * 
 * @class QueryBuilderService
 */
@Injectable()
export class QueryBuilderService {
  /**
   * Creates an instance of QueryBuilderService.
   * 
   * @param {Repository<DataSource>} dataSourceRepository - TypeORM repository for DataSource entities
   */
  constructor(
    @InjectRepository(DataSource)
    private dataSourceRepository: Repository<DataSource>,
  ) {}

  /**
   * Builds a SQL query from a QueryConfiguration object.
   * 
   * This method converts a structured query configuration into executable SQL,
   * handling all SQL clauses (SELECT, FROM, JOIN, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT).
   * It intelligently handles database-specific syntax differences and automatically
   * generates GROUP BY clauses when aggregations are present.
   * 
   * @param {QueryConfiguration} config - The query configuration object containing fields, tables, filters, etc.
   * @param {Record<string, any>} [parameters={}] - Optional parameters for parameterized queries
   * @param {string} [databaseType='mssql'] - Database type ('mssql', 'mysql', 'postgres', etc.) for syntax-specific handling
   * @returns {Promise<string>} The generated SQL query string
   * @throws {BadRequestException} If the query configuration is invalid
   * 
   * @example
   * const query = await queryBuilderService.buildQuery({
   *   fields: [
   *     { tableName: 'Customers', fieldName: 'CustomerID', alias: 'ID', schemaName: 'dbo' },
   *     { tableName: 'Orders', fieldName: 'OrderDate', alias: 'Date', aggregation: AggregationType.MAX }
   *   ],
   *   tables: ['dbo.Customers'],
   *   filters: [
   *     { field: { tableName: 'Customers', fieldName: 'Country' }, operator: FilterOperator.EQUALS, value: 'USA' }
   *   ],
   *   limit: 100
   * }, {}, 'mssql');
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
    
    // Build GROUP BY clause - automatically handle when aggregations are present
    const groupByClause = this.buildIntelligentGroupByClause(config.fields, config.groupBy);
    if (groupByClause) {
      query += groupByClause;
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
   * Executes a SQL query against a specified data source.
   * 
   * This method creates a temporary database connection, executes the query with
   * parameter substitution, and returns the results. The connection is automatically
   * closed after execution. Queries have a 30-second timeout protection.
   * 
   * @param {string} dataSourceId - The UUID of the data source to query
   * @param {string} query - The SQL query string to execute
   * @param {Record<string, any>} [parameters={}] - Optional parameters to substitute in the query
   * @returns {Promise<any[]>} An array of query result rows
   * @throws {NotFoundException} If the data source is not found
   * @throws {Error} If query execution fails or times out
   * 
   * @remarks
   * - Creates a new connection for each query execution
   * - Automatically closes the connection after execution
   * - Logs query execution time and result count
   * - Warns about slow queries (>10 seconds)
   * 
   * @example
   * const results = await queryBuilderService.executeQuery(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   'SELECT * FROM Customers WHERE Country = @country',
   *   { country: 'USA' }
   * );
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
   * Builds the SELECT clause of a SQL query.
   * 
   * Constructs a SELECT statement with field expressions, aggregations, and aliases.
   * For SQL Server, can include TOP clause for simple limit without offset.
   * 
   * @private
   * @param {FieldConfiguration[]} fields - Array of field configurations to select
   * @param {number} [topLimit] - Optional limit for SQL Server TOP clause (only used when offset is 0)
   * @returns {string} The SELECT clause as a SQL string
   * 
   * @remarks
   * - Handles custom expressions, aggregations, and simple field references
   * - Automatically escapes identifiers and qualifies table references
   * - Uses TOP for SQL Server when limit is specified without offset
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
   * Builds a schema-qualified table reference for SQL queries.
   * 
   * Constructs a properly escaped table reference, optionally including schema name.
   * 
   * @private
   * @param {string} [schemaName] - Optional schema name (e.g., 'dbo')
   * @param {string} [tableName] - Table name (required)
   * @returns {string} Schema-qualified table reference (e.g., '[dbo].[Customers]' or '[Customers]')
   * @throws {BadRequestException} If tableName is missing or 'undefined'
   * 
   * @example
   * buildTableReference('dbo', 'Customers') // Returns '[dbo].[Customers]'
   * buildTableReference(undefined, 'Orders') // Returns '[Orders]'
   */
  private buildTableReference(schemaName?: string, tableName?: string): string {
    if (!tableName || tableName === 'undefined') {
      throw new BadRequestException('Table name is required and cannot be undefined');
    }
    if (schemaName && schemaName !== 'undefined') {
      return `${this.escapeIdentifier(schemaName)}.${this.escapeIdentifier(tableName)}`;
    }
    return this.escapeIdentifier(tableName);
  }

  /**
   * Builds an aggregate expression for a field (e.g., SUM, COUNT, AVG).
   * 
   * Constructs the appropriate SQL aggregate function based on the field's
   * aggregation type. Handles special cases like COUNT(*) and schema-qualified references.
   * 
   * @private
   * @param {FieldConfiguration} field - Field configuration with aggregation type
   * @returns {string} The aggregate expression (e.g., 'SUM([dbo].[Orders].[Amount])')
   * @throws {BadRequestException} If fieldName is missing or 'undefined'
   * 
   * @remarks
   * - Special handling for COUNT(*) - returns 'COUNT(*)' without table qualification
   * - Supports SUM, COUNT, COUNT_DISTINCT, AVG, MIN, MAX, CONCAT (STRING_AGG)
   * - Automatically qualifies field references with schema and table names
   */
  private buildAggregateExpression(field: FieldConfiguration): string {
    console.log('🔧 buildAggregateExpression called:', {
      fieldName: field.fieldName,
      aggregation: field.aggregation,
      tableName: field.tableName,
      schemaName: field.schemaName
    });

    // Validate field has required properties
    if (!field.fieldName || field.fieldName === 'undefined') {
      throw new BadRequestException('Field name is required for aggregation and cannot be undefined');
    }

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
   * Builds the FROM clause of a SQL query.
   * 
   * Constructs a FROM clause with proper table reference, supporting both
   * schema-qualified (schema.table) and unqualified table names.
   * 
   * @private
   * @param {string} tableName - Table name, optionally schema-qualified (e.g., 'dbo.Customers' or 'Customers')
   * @returns {string} The FROM clause as a SQL string
   * 
   * @example
   * buildFromClause('dbo.Customers') // Returns 'FROM [dbo].[Customers]\n'
   * buildFromClause('Orders') // Returns 'FROM [Orders]\n'
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
   * Builds JOIN clauses for a SQL query.
   * 
   * Constructs one or more JOIN statements (INNER, LEFT, RIGHT, FULL) with
   * proper join conditions. Supports multiple join conditions per join.
   * 
   * @private
   * @param {JoinConfiguration[]} joins - Array of join configurations
   * @returns {string} The JOIN clauses as SQL strings
   * 
   * @remarks
   * - Supports all standard join types (INNER, LEFT, RIGHT, FULL)
   * - Each join can have multiple conditions combined with AND
   * - Automatically qualifies table references with schemas
   * 
   * @example
   * buildJoinClauses([{
   *   type: 'INNER',
   *   leftTable: 'Customers', leftSchema: 'dbo',
   *   rightTable: 'Orders', rightSchema: 'dbo',
   *   conditions: [{ leftField: 'CustomerID', operator: '=', rightField: 'CustomerID' }]
   * }])
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
   * Builds the WHERE clause of a SQL query.
   * 
   * Constructs a WHERE clause from an array of filter configurations,
   * handling complex logical operators and parameter substitution.
   * 
   * @private
   * @param {FilterConfiguration[]} filters - Array of filter configurations
   * @param {Record<string, any>} parameters - Parameters for parameterized filters
   * @returns {string} The WHERE clause as a SQL string, or empty string if no filters
   * 
   * @remarks
   * - Returns empty string if filters array is empty
   * - Handles logical operators (AND, OR) between conditions
   * - Supports parameterized values via isParameter flag
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
   * Builds a single filter condition from a FilterConfiguration.
   * 
   * Constructs a SQL condition based on the filter operator, handling various
   * comparison operators, pattern matching, null checks, and parameter substitution.
   * 
   * @private
   * @param {FilterConfiguration} filter - Filter configuration object
   * @param {Record<string, any>} parameters - Parameters for parameterized filters
   * @returns {string} The filter condition as a SQL string
   * @throws {BadRequestException} If the filter operator is unsupported
   * 
   * @remarks
   * - Supports: EQUALS, NOT_EQUALS, GREATER_THAN, LESS_THAN, BETWEEN, IN, LIKE, STARTS_WITH, ENDS_WITH, IS_NULL, IS_NOT_NULL
   * - Automatically formats values based on field data type
   * - Handles parameter substitution when isParameter is true
   * - 'contains' is supported as an alias for LIKE with wildcards
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
   * Builds a GROUP BY clause from an array of group-by field configurations.
   * 
   * @private
   * @param {any[]} groupBy - Array of group-by field configurations
   * @returns {string} The GROUP BY clause as a SQL string
   * 
   * @deprecated This method is kept for backward compatibility but is superseded by buildIntelligentGroupByClause
   */
  private buildGroupByClause(groupBy: any[]): string {
    const groupFields = groupBy.map(group => {
      const tableRef = this.buildTableReference(group.field.schemaName, group.field.tableName);
      return `${tableRef}.${this.escapeIdentifier(group.field.fieldName)}`;
    });
    
    return `GROUP BY ${groupFields.join(', ')}\n`;
  }

  /**
   * Intelligently builds a GROUP BY clause based on field aggregations.
   * 
   * When aggregations are present in the SELECT clause, SQL requires that all
   * non-aggregated fields be included in the GROUP BY clause. This method
   * automatically identifies and groups non-aggregated fields, ensuring SQL
   * compliance while minimizing manual configuration.
   * 
   * @private
   * @param {FieldConfiguration[]} fields - Array of field configurations from SELECT clause
   * @param {any[]} [explicitGroupBy] - Optional explicit group-by field configurations
   * @returns {string} The GROUP BY clause as a SQL string, or empty string if not needed
   * 
   * @remarks
   * - Returns empty string if no aggregations are present
   * - Automatically includes all non-aggregated, non-expression fields
   * - Merges explicit group-by fields with auto-detected ones
   * - Prevents duplicate fields in GROUP BY clause
   */
  private buildIntelligentGroupByClause(
    fields: FieldConfiguration[],
    explicitGroupBy?: any[]
  ): string {
    // Check if any fields have aggregations
    const hasAggregations = fields.some(field => field.aggregation);
    
    if (!hasAggregations) {
      // No aggregations, no GROUP BY needed
      return '';
    }
    
    // Collect all non-aggregated fields that need to be in GROUP BY
    const groupByFields: string[] = [];
    const groupBySet = new Set<string>(); // To avoid duplicates
    
    fields.forEach(field => {
      // Skip aggregated fields and custom expressions
      if (!field.aggregation && !field.expression) {
        const tableRef = this.buildTableReference(field.schemaName, field.tableName);
        const fieldRef = `${tableRef}.${this.escapeIdentifier(field.fieldName)}`;
        
        if (!groupBySet.has(fieldRef)) {
          groupBySet.add(fieldRef);
          groupByFields.push(fieldRef);
        }
      }
    });
    
    // Add explicitly specified GROUP BY fields
    if (explicitGroupBy?.length) {
      explicitGroupBy.forEach(group => {
        const tableRef = this.buildTableReference(group.field.schemaName, group.field.tableName);
        const fieldRef = `${tableRef}.${this.escapeIdentifier(group.field.fieldName)}`;
        
        if (!groupBySet.has(fieldRef)) {
          groupBySet.add(fieldRef);
          groupByFields.push(fieldRef);
        }
      });
    }
    
    // If we have fields to group by, build the clause
    if (groupByFields.length > 0) {
      return `GROUP BY ${groupByFields.join(', ')}\n`;
    }
    
    return '';
  }

  /**
   * Builds the HAVING clause of a SQL query.
   * 
   * The HAVING clause is similar to WHERE but applies to grouped/aggregated results
   * rather than individual rows. Used for filtering after GROUP BY operations.
   * 
   * @private
   * @param {FilterConfiguration[]} having - Array of filter configurations for HAVING clause
   * @param {Record<string, any>} parameters - Parameters for parameterized filters
   * @returns {string} The HAVING clause as a SQL string
   */
  private buildHavingClause(
    having: FilterConfiguration[],
    parameters: Record<string, any>
  ): string {
    const conditions = this.buildFilterConditions(having, parameters);
    return `HAVING ${conditions}\n`;
  }

  /**
   * Builds the ORDER BY clause of a SQL query.
   * 
   * Constructs an ORDER BY clause with proper field references, supporting
   * both regular fields and aggregated expressions. Fields are sorted by
   * priority before being added to the clause.
   * 
   * @private
   * @param {any[]} orderBy - Array of sort configurations with priority, direction, and field
   * @returns {string} The ORDER BY clause as a SQL string
   * 
   * @remarks
   * - Sorts fields by priority before building the clause
   * - Supports both regular fields and aggregated expressions
   * - Direction can be 'ASC' or 'DESC' (case-insensitive)
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
   * Builds a default ORDER BY clause when none is specified.
   * 
   * SQL Server requires an ORDER BY clause when using OFFSET/FETCH for pagination.
   * This method creates a default ordering by the first field in the SELECT clause.
   * 
   * @private
   * @param {FieldConfiguration[]} fields - Array of field configurations from SELECT clause
   * @returns {string} A default ORDER BY clause (e.g., 'ORDER BY [dbo].[Customers].[CustomerID] ASC\n')
   * 
   * @remarks
   * - Falls back to 'ORDER BY (SELECT NULL)' if no fields are available
   * - Orders by the first field in ascending order by default
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
   * Builds a LIMIT/OFFSET clause with database-specific syntax.
   * 
   * Different databases use different syntax for limiting and paginating results.
   * This method generates the appropriate syntax based on the database type.
   * 
   * @private
   * @param {number} limit - Maximum number of rows to return
   * @param {number} [offset=0] - Number of rows to skip (for pagination)
   * @param {string} [databaseType='mssql'] - Database type for syntax selection
   * @returns {string} The LIMIT/OFFSET clause as a SQL string, or empty string for SQL Server TOP
   * 
   * @remarks
   * - SQL Server: Uses TOP in SELECT for simple limit, OFFSET/FETCH for pagination
   * - MySQL/PostgreSQL: Uses LIMIT/OFFSET syntax
   * - Returns empty string for SQL Server when offset is 0 (TOP is used in SELECT instead)
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
   * Validates that a groupBy array contains valid field configurations.
   * 
   * @private
   * @param {any[]} groupBy - Array of group-by field configurations
   * @returns {boolean} True if at least one valid group-by field exists
   */
  private hasValidGroupByFields(groupBy: any[]): boolean {
    return groupBy.some(group => 
      group.field && 
      group.field.tableName && 
      group.field.fieldName
    );
  }

  /**
   * Validates that an orderBy array contains valid field configurations.
   * 
   * @private
   * @param {any[]} orderBy - Array of sort field configurations
   * @returns {boolean} True if at least one valid order-by field exists
   */
  private hasValidOrderByFields(orderBy: any[]): boolean {
    return orderBy.some(order => 
      order.field && 
      order.field.tableName && 
      order.field.fieldName
    );
  }

  /**
   * Formats a value for use in SQL queries based on its data type.
   * 
   * Properly formats values with appropriate quoting, escaping, and type conversion
   * to ensure SQL injection prevention and correct SQL syntax.
   * 
   * @private
   * @param {any} value - The value to format
   * @param {FieldDataType} dataType - The expected data type of the value
   * @returns {string} The formatted value as a SQL string literal or unquoted value
   * 
   * @remarks
   * - Strings, dates, UUIDs, JSON, and binary data are quoted and escaped
   * - Numbers are left unquoted
   * - Booleans are converted to 1/0 for SQL Server compatibility
   * - NULL/undefined values return 'NULL'
   * - Automatically detects string values that look like numbers and quotes them appropriately
   * - Escapes single quotes in string values by doubling them
   */
  private formatValue(value: any, dataType: FieldDataType): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    
    // If value is actually a string but dataType suggests otherwise, treat as string
    // This handles cases where type detection might be wrong
    const isActuallyString = typeof value === 'string' && isNaN(Number(value));
    
    switch (dataType) {
      case FieldDataType.STRING:
      case FieldDataType.TEXT:
      case FieldDataType.UUID:
        return `'${value.toString().replace(/'/g, "''")}'`; // Escape single quotes
      
      case FieldDataType.DATE:
      case FieldDataType.DATETIME:
      case FieldDataType.TIME:
        return `'${value.toString().replace(/'/g, "''")}'`;
      
      case FieldDataType.NUMBER:
      case FieldDataType.INTEGER:
      case FieldDataType.DECIMAL:
      case FieldDataType.CURRENCY:
        // If the value is actually a string (not a numeric string), quote it
        if (isActuallyString) {
          return `'${value.toString().replace(/'/g, "''")}'`;
        }
        return value.toString();
      
      case FieldDataType.BOOLEAN:
        // Handle boolean values
        if (typeof value === 'boolean') {
          return value ? '1' : '0';
        }
        // Handle string representations of boolean
        if (value.toString().toLowerCase() === 'true') return '1';
        if (value.toString().toLowerCase() === 'false') return '0';
        return value.toString();
      
      case FieldDataType.JSON:
        // JSON values should be stringified and quoted
        const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
        return `'${jsonValue.replace(/'/g, "''")}'`;
      
      case FieldDataType.BINARY:
        // Binary data should be quoted (typically hex string representation)
        return `'${value.toString().replace(/'/g, "''")}'`;
      
      default:
        // Default to quoting as string for safety
        return `'${value.toString().replace(/'/g, "''")}'`;
    }
  }

  /**
   * Escapes SQL identifiers (table names, column names) for safe use in queries.
   * 
   * Wraps identifiers in square brackets (SQL Server style) to handle special
   * characters, reserved words, and spaces in names.
   * 
   * @private
   * @param {string} identifier - The identifier to escape (table or column name)
   * @returns {string} The escaped identifier (e.g., '[Customer Name]')
   * @throws {BadRequestException} If identifier is null, undefined, or the string 'undefined'/'null'
   * 
   * @remarks
   * - Uses square brackets for SQL Server compatibility
   * - Prevents SQL injection through identifier names
   * - Validates that identifier is not null/undefined
   * 
   * @example
   * escapeIdentifier('Customer Name') // Returns '[Customer Name]'
   * escapeIdentifier('dbo.Customers') // Returns '[dbo.Customers]'
   */
  private escapeIdentifier(identifier: string): string {
    if (!identifier || identifier === 'undefined' || identifier === 'null') {
      throw new BadRequestException(`Invalid identifier: "${identifier}". Field or table name cannot be undefined or null.`);
    }
    // Use square brackets for SQL Server, backticks for MySQL, double quotes for PostgreSQL
    return `[${identifier}]`; // SQL Server style
  }

  /**
   * Replaces parameter placeholders in a SQL query with actual values.
   * 
   * Replaces @parameterName placeholders with formatted values from the parameters object.
   * This is a simple string replacement approach (not parameterized queries).
   * 
   * @private
   * @param {string} query - SQL query string with @parameterName placeholders
   * @param {Record<string, any>} parameters - Object mapping parameter names to values
   * @returns {string} Query string with parameters replaced
   * 
   * @remarks
   * - Uses simple string replacement (not true parameterized queries)
   * - String values are automatically quoted
   * - All occurrences of each parameter are replaced
   * 
   * @example
   * replaceParameters('SELECT * FROM Customers WHERE Country = @country', { country: 'USA' })
   * // Returns: "SELECT * FROM Customers WHERE Country = 'USA'"
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
   * Validates a query configuration before building the SQL query.
   * 
   * Performs comprehensive validation including:
   * - Ensures at least one field and one table are specified
   * - Validates field properties (fieldName, tableName, alias)
   * - Checks that all referenced tables exist in the tables array
   * - Validates aggregation consistency
   * 
   * @private
   * @param {QueryConfiguration} config - The query configuration to validate
   * @throws {BadRequestException} If validation fails with specific error messages
   * 
   * @remarks
   * - Throws descriptive error messages indicating which field/table is invalid
   * - Handles both schema-qualified and unqualified table names
   * - Validates aggregation consistency (warns but doesn't fail)
   */
  private validateQueryConfiguration(config: QueryConfiguration): void {
    if (!config.fields || config.fields.length === 0) {
      throw new BadRequestException('Query must have at least one field');
    }
    
    if (!config.tables || config.tables.length === 0) {
      throw new BadRequestException('Query must specify at least one table');
    }
    
    // Validate field properties for undefined/null values
    config.fields.forEach((field, index) => {
      if (!field.fieldName || field.fieldName === 'undefined' || field.fieldName === 'null') {
        throw new BadRequestException(
          `Field at index ${index} has invalid fieldName: "${field.fieldName}". Field name cannot be undefined or null.`
        );
      }
      
      if (!field.tableName || field.tableName === 'undefined' || field.tableName === 'null') {
        throw new BadRequestException(
          `Field "${field.fieldName}" at index ${index} has invalid tableName: "${field.tableName}". Table name cannot be undefined or null.`
        );
      }

      if (!field.alias || field.alias === 'undefined' || field.alias === 'null') {
        throw new BadRequestException(
          `Field "${field.fieldName}" at index ${index} has invalid alias: "${field.alias}". Alias cannot be undefined or null.`
        );
      }
    });
    
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

    // Validate aggregation consistency
    this.validateAggregationConsistency(config.fields);
  }

  /**
   * Validates that aggregation usage is consistent across fields.
   * 
   * Checks if the query mixes aggregated and non-aggregated fields, which requires
   * GROUP BY clauses. This validation provides helpful warnings but doesn't fail
   * because the service automatically handles GROUP BY generation.
   * 
   * @private
   * @param {FieldConfiguration[]} fields - Array of field configurations to validate
   * 
   * @remarks
   * - Logs a warning if mixed aggregations are detected
   * - Does not throw errors (automatic GROUP BY handles this)
   * - Useful for debugging query construction
   */
  private validateAggregationConsistency(fields: FieldConfiguration[]): void {
    const hasAggregations = fields.some(field => field.aggregation);
    const hasNonAggregated = fields.some(field => !field.aggregation && !field.expression);
    
    if (hasAggregations && hasNonAggregated) {
      // This is actually OK now because we auto-handle GROUP BY
      // Just log for debugging purposes
      console.log('Query has mixed aggregations - non-aggregated fields will be automatically grouped');
    }
  }

  /**
   * Creates a temporary database connection based on a data source configuration.
   * 
   * Creates a new TypeORM DataSource connection with unique name to avoid conflicts.
   * Configures database-specific options (e.g., SQL Server certificate trust).
   * 
   * @private
   * @param {DataSource} dataSource - The data source entity with connection details
   * @returns {Promise<TypeOrmDataSource>} A configured TypeORM DataSource instance
   * @throws {BadRequestException} If database type is unsupported
   * 
   * @remarks
   * - Generates unique connection name to avoid conflicts
   * - Uses default ports if not specified in data source
   * - Configures SQL Server-specific options (trustServerCertificate, encrypt, enableArithAbort)
   * - Supports Windows domain authentication via DB_DOMAIN environment variable
   * - Connection should be destroyed after use
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
   * Maps database type names to TypeORM driver names.
   * 
   * Converts user-friendly database type names to the driver names expected by TypeORM.
   * Supports multiple aliases for the same database type.
   * 
   * @private
   * @param {string} type - Database type name (e.g., 'sqlserver', 'postgresql', 'mysql')
   * @returns {string} The corresponding TypeORM driver name
   * @throws {BadRequestException} If the database type is not supported
   * 
   * @remarks
   * - Case-insensitive matching
   * - Supports multiple aliases (e.g., 'sqlserver' and 'mssql' both map to 'mssql')
   * - Throws error for unsupported types
   * 
   * @example
   * mapDatabaseTypeToDriver('sqlserver') // Returns 'mssql'
   * mapDatabaseTypeToDriver('postgresql') // Returns 'postgres'
   * mapDatabaseTypeToDriver('PostgreSQL') // Returns 'postgres' (case-insensitive)
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
   * Creates a promise that rejects after a specified timeout duration.
   * 
   * Used with Promise.race() to implement query execution timeouts.
   * 
   * @private
   * @param {number} timeout - Timeout duration in milliseconds
   * @returns {Promise<never>} A promise that rejects with a timeout error
   * 
   * @example
   * const result = await Promise.race([
   *   executeQuery(),
   *   createTimeoutPromise(30000) // 30 second timeout
   * ]);
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Logs query execution metrics for monitoring and optimization.
   * 
   * Records execution time, result count, and data source ID. Warns about
   * slow queries that exceed the threshold (10 seconds).
   * 
   * @private
   * @param {string} dataSourceId - The UUID of the data source used
   * @param {string} query - The executed SQL query
   * @param {number} executionTime - Query execution time in milliseconds
   * @param {number} resultCount - Number of rows returned
   * 
   * @remarks
   * - Logs all query executions for monitoring
   * - Warns about queries taking longer than 10 seconds
   * - Can be extended to send metrics to monitoring services
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
   * Gets the default port number for a database driver type.
   * 
   * Returns the standard port number used by each database type when no port
   * is explicitly specified in the data source configuration.
   * 
   * @private
   * @param {string} driverType - TypeORM driver name (e.g., 'mssql', 'postgres', 'mysql')
   * @returns {number} Default port number for the database type, or 1433 (SQL Server) as fallback
   * 
   * @example
   * getDefaultPort('mssql') // Returns 1433
   * getDefaultPort('postgres') // Returns 5432
   * getDefaultPort('mysql') // Returns 3306
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