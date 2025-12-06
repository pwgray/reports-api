/**
 * Type definitions for query configuration and SQL query building.
 * 
 * This module contains interfaces and enums for constructing SQL queries
 * programmatically, including field selection, joins, filters, grouping,
 * sorting, and parameterization.
 */

// src/types/query-configuration.types.ts

/**
 * Complete configuration for building a SQL query.
 * 
 * This interface represents the full structure needed to generate a SQL query,
 * including all SELECT, FROM, JOIN, WHERE, GROUP BY, HAVING, ORDER BY, and LIMIT clauses.
 * It's used by the QueryBuilderService to construct executable SQL queries.
 * 
 * @interface QueryConfiguration
 * 
 * @property {FieldConfiguration[]} fields - Fields to select in the query (required)
 * @property {string[]} tables - Tables involved in the query (required, at least one)
 * @property {JoinConfiguration[]} [joins] - Join relationships between tables
 * @property {FilterConfiguration[]} [filters] - WHERE clause conditions
 * @property {GroupByConfiguration[]} [groupBy] - GROUP BY fields for aggregation
 * @property {OrderByConfiguration[]} [orderBy] - ORDER BY fields for sorting
 * @property {FilterConfiguration[]} [having] - HAVING clause conditions (for grouped queries)
 * @property {number} [limit] - Limit number of results
 * @property {number} [offset] - Offset for pagination
 * @property {ParameterConfiguration[]} [parameters] - Parameters that will be replaced at runtime
 * 
 * @example
 * const queryConfig: QueryConfiguration = {
 *   fields: [
 *     { id: 'f1', tableName: 'customers', fieldName: 'name', alias: 'Customer Name', dataType: FieldDataType.STRING },
 *     { id: 'f2', tableName: 'orders', fieldName: 'total', alias: 'Total', dataType: FieldDataType.CURRENCY, aggregation: AggregationType.SUM }
 *   ],
 *   tables: ['customers', 'orders'],
 *   joins: [{ type: JoinType.INNER, leftTable: 'customers', rightTable: 'orders', conditions: [...] }],
 *   filters: [{ field: {...}, operator: FilterOperator.EQUALS, value: 'USA' }],
 *   orderBy: [{ field: {...}, direction: SortOrder.DESC, priority: 1 }],
 *   limit: 100
 * };
 */
export interface QueryConfiguration {
  /** Fields to select in the query (required) */
  fields: FieldConfiguration[];
  /** Tables involved in the query (required, at least one) */
  tables: string[];
  /** Join relationships between tables */
  joins?: JoinConfiguration[];
  /** WHERE clause conditions */
  filters?: FilterConfiguration[];
  /** GROUP BY fields for aggregation */
  groupBy?: GroupByConfiguration[];
  /** ORDER BY fields for sorting */
  orderBy?: OrderByConfiguration[];
  /** HAVING clause conditions (for grouped queries) */
  having?: FilterConfiguration[];
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Parameters that will be replaced at runtime */
  parameters?: ParameterConfiguration[];
}

/**
 * Configuration for a single field in a query.
 * 
 * Defines a field to be selected in the SQL query, including its location
 * (schema, table, column), alias, data type, optional aggregation, and formatting.
 * 
 * @interface FieldConfiguration
 * 
 * @property {string} id - Unique identifier for this field in the query
 * @property {string} [schemaName] - Schema name (e.g., 'dbo', 'public')
 * @property {string} tableName - Table name (e.g., 'customers', 'orders')
 * @property {string} fieldName - Field name in the database (e.g., 'customer_name')
 * @property {string} alias - Alias for the field in results (e.g., 'Customer Name')
 * @property {FieldDataType} dataType - Data type of the field
 * @property {AggregationType} [aggregation] - Aggregation function if applicable (SUM, COUNT, AVG, etc.)
 * @property {boolean} [required] - Whether this field is required for the query
 * @property {string} [expression] - Custom SQL expression instead of simple field reference
 * @property {FieldFormatting} [formatting] - Formatting rules for display (currency, date format, etc.)
 * 
 * @example
 * const field: FieldConfiguration = {
 *   id: 'customer-name',
 *   schemaName: 'dbo',
 *   tableName: 'customers',
 *   fieldName: 'customer_name',
 *   alias: 'Customer Name',
 *   dataType: FieldDataType.STRING
 * };
 * 
 * const aggregatedField: FieldConfiguration = {
 *   id: 'total-sales',
 *   tableName: 'orders',
 *   fieldName: 'amount',
 *   alias: 'Total Sales',
 *   dataType: FieldDataType.CURRENCY,
 *   aggregation: AggregationType.SUM,
 *   formatting: { currencySymbol: '$', decimalPlaces: 2 }
 * };
 */
export interface FieldConfiguration {
  /** Unique identifier for this field in the query */
  id: string;
  /** Schema name (e.g., 'dbo', 'public') */
  schemaName?: string;
  /** Table name (e.g., 'customers', 'orders') */
  tableName: string;
  /** Field name in the database (e.g., 'customer_name') */
  fieldName: string;
  /** Alias for the field in results (e.g., 'Customer Name') */
  alias: string;
  /** Data type of the field */
  dataType: FieldDataType;
  /** Aggregation function if applicable (SUM, COUNT, AVG, etc.) */
  aggregation?: AggregationType;
  /** Whether this field is required for the query */
  required?: boolean;
  /** Custom SQL expression instead of simple field reference */
  expression?: string;
  /** Formatting rules for display (currency, date format, etc.) */
  formatting?: FieldFormatting;
}

/**
 * Configuration for a JOIN clause in a SQL query.
 * 
 * Defines how two tables should be joined together, including the join type,
 * table names, schemas, and the conditions that link them.
 * 
 * @interface JoinConfiguration
 * 
 * @property {JoinType} type - Type of join (INNER, LEFT, RIGHT, FULL, CROSS)
 * @property {string} [leftSchema] - Schema name for left table (e.g., 'dbo')
 * @property {string} leftTable - Left table in the join
 * @property {string} [rightSchema] - Schema name for right table (e.g., 'dbo')
 * @property {string} rightTable - Right table in the join
 * @property {JoinCondition[]} conditions - Join conditions (field mappings between tables)
 * @property {boolean} [autoDetected] - Whether this join was automatically detected from foreign keys
 * 
 * @example
 * const join: JoinConfiguration = {
 *   type: JoinType.INNER,
 *   leftSchema: 'dbo',
 *   leftTable: 'customers',
 *   rightSchema: 'dbo',
 *   rightTable: 'orders',
 *   conditions: [
 *     { leftField: 'id', rightField: 'customer_id', operator: '=' }
 *   ],
 *   autoDetected: true
 * };
 */
export interface JoinConfiguration {
  /** Type of join (INNER, LEFT, RIGHT, FULL, CROSS) */
  type: JoinType;
  /** Schema name for left table (e.g., 'dbo') */
  leftSchema?: string;
  /** Left table in the join */
  leftTable: string;
  /** Schema name for right table (e.g., 'dbo') */
  rightSchema?: string;
  /** Right table in the join */
  rightTable: string;
  /** Join conditions (field mappings between tables) */
  conditions: JoinCondition[];
  /** Whether this join was automatically detected from foreign keys */
  autoDetected?: boolean;
}

/**
 * A single condition in a JOIN clause.
 * 
 * Defines how a field from the left table relates to a field in the right table.
 * 
 * @interface JoinCondition
 * 
 * @property {string} leftField - Field name from the left table
 * @property {string} rightField - Field name from the right table
 * @property {string} operator - Join operator (usually '=' but could be others like '>', '<', etc.)
 * 
 * @example
 * const condition: JoinCondition = {
 *   leftField: 'customer_id',
 *   rightField: 'id',
 *   operator: '='
 * };
 */
export interface JoinCondition {
  /** Field name from the left table */
  leftField: string;
  /** Field name from the right table */
  rightField: string;
  /** Join operator (usually '=' but could be others like '>', '<', etc.) */
  operator: string;
}

/**
 * Configuration for a filter condition in a WHERE or HAVING clause.
 * 
 * Defines a single filter condition that will be applied to the query,
 * including the field to filter, the operator, value, and how it combines
 * with other filters.
 * 
 * @interface FilterConfiguration
 * 
 * @property {string} id - Unique identifier for this filter
 * @property {FieldConfiguration} field - Field being filtered
 * @property {FilterOperator} operator - Filter operator (EQUALS, GREATER_THAN, LIKE, etc.)
 * @property {any} value - Filter value(s) - can be a single value, array, or object (for BETWEEN)
 * @property {LogicalOperator} [logicalOperator] - Logical operator to combine with next filter (AND/OR)
 * @property {boolean} [isParameter] - Whether this filter uses a parameter (dynamic value)
 * @property {string} [parameterName] - Parameter name if this filter uses a parameter
 * @property {string} [groupId] - Group ID for complex filter grouping (parentheses in SQL)
 * 
 * @example
 * // Simple equality filter
 * const filter1: FilterConfiguration = {
 *   id: 'filter-1',
 *   field: { id: 'f1', tableName: 'customers', fieldName: 'country', alias: 'Country', dataType: FieldDataType.STRING },
 *   operator: FilterOperator.EQUALS,
 *   value: 'USA',
 *   logicalOperator: LogicalOperator.AND
 * };
 * 
 * // Parameterized filter
 * const filter2: FilterConfiguration = {
 *   id: 'filter-2',
 *   field: { id: 'f2', tableName: 'orders', fieldName: 'order_date', alias: 'Order Date', dataType: FieldDataType.DATE },
 *   operator: FilterOperator.BETWEEN,
 *   value: { start: '2024-01-01', end: '2024-12-31' },
 *   isParameter: true,
 *   parameterName: 'date_range'
 * };
 * 
 * // IN filter with multiple values
 * const filter3: FilterConfiguration = {
 *   id: 'filter-3',
 *   field: { id: 'f3', tableName: 'products', fieldName: 'category', alias: 'Category', dataType: FieldDataType.STRING },
 *   operator: FilterOperator.IN,
 *   value: ['Electronics', 'Clothing', 'Books']
 * };
 */
export interface FilterConfiguration {
  /** Unique identifier for this filter */
  id: string;
  /** Field being filtered */
  field: FieldConfiguration;
  /** Filter operator (EQUALS, GREATER_THAN, LIKE, etc.) */
  operator: FilterOperator;
  /** Filter value(s) - can be a single value, array, or object (for BETWEEN) */
  value: any;
  /** Logical operator to combine with next filter (AND/OR) */
  logicalOperator?: LogicalOperator;
  /** Whether this filter uses a parameter (dynamic value) */
  isParameter?: boolean;
  /** Parameter name if this filter uses a parameter */
  parameterName?: string;
  /** Group ID for complex filter grouping (parentheses in SQL) */
  groupId?: string;
}

/**
 * Configuration for a GROUP BY clause.
 * 
 * Defines a field to group by in an aggregated query. When aggregations
 * are present, non-aggregated fields must be included in GROUP BY.
 * 
 * @interface GroupByConfiguration
 * 
 * @property {FieldConfiguration} field - Field to group by
 * @property {SortOrder} [sortOrder] - Sort order within the group
 * 
 * @example
 * const groupBy: GroupByConfiguration = {
 *   field: { id: 'f1', tableName: 'customers', fieldName: 'country', alias: 'Country', dataType: FieldDataType.STRING },
 *   sortOrder: SortOrder.ASC
 * };
 */
export interface GroupByConfiguration {
  /** Field to group by */
  field: FieldConfiguration;
  /** Sort order within the group */
  sortOrder?: SortOrder;
}

/**
 * Configuration for an ORDER BY clause.
 * 
 * Defines how query results should be sorted, including the field to sort by,
 * direction (ascending/descending), and priority when multiple sorts are applied.
 * 
 * @interface OrderByConfiguration
 * 
 * @property {FieldConfiguration} field - Field to sort by (can be aggregated or regular field)
 * @property {SortOrder} direction - Sort direction (ASC or DESC)
 * @property {number} priority - Priority order (for multiple sorts, lower numbers sort first)
 * 
 * @example
 * const orderBy: OrderByConfiguration = {
 *   field: { id: 'f1', tableName: 'orders', fieldName: 'total', alias: 'Total', dataType: FieldDataType.CURRENCY, aggregation: AggregationType.SUM },
 *   direction: SortOrder.DESC,
 *   priority: 1
 * };
 */
export interface OrderByConfiguration {
  /** Field to sort by (can be aggregated or regular field) */
  field: FieldConfiguration;
  /** Sort direction (ASC or DESC) */
  direction: SortOrder;
  /** Priority order (for multiple sorts, lower numbers sort first) */
  priority: number;
}

/**
 * Configuration for a query parameter.
 * 
 * Defines a parameter that can be provided at runtime to customize the query.
 * Parameters are used in filters and can have default values, validation rules,
 * and predefined options for dropdown selections.
 * 
 * @interface ParameterConfiguration
 * 
 * @property {string} name - Parameter name (used in filter parameterName)
 * @property {string} displayName - Display name for UI
 * @property {ParameterDataType} dataType - Parameter data type
 * @property {any} [defaultValue] - Default value if not provided
 * @property {boolean} required - Whether parameter is required
 * @property {ParameterValidation} [validation] - Validation rules for the parameter
 * @property {ParameterOption[]} [possibleValues] - Possible values for dropdown parameters
 * 
 * @example
 * const param: ParameterConfiguration = {
 *   name: 'start_date',
 *   displayName: 'Start Date',
 *   dataType: ParameterDataType.DATE,
 *   required: true,
 *   defaultValue: '2024-01-01',
 *   validation: { minValue: new Date('2020-01-01') }
 * };
 */
export interface ParameterConfiguration {
  /** Parameter name (used in filter parameterName) */
  name: string;
  /** Display name for UI */
  displayName: string;
  /** Parameter data type */
  dataType: ParameterDataType;
  /** Default value if not provided */
  defaultValue?: any;
  /** Whether parameter is required */
  required: boolean;
  /** Validation rules for the parameter */
  validation?: ParameterValidation;
  /** Possible values for dropdown parameters */
  possibleValues?: ParameterOption[];
}

/**
 * An option for a parameter dropdown/select list.
 * 
 * @interface ParameterOption
 * 
 * @property {any} value - The actual value for this option
 * @property {string} label - Display label for the option
 * @property {string} [description] - Optional description/tooltip for the option
 */
export interface ParameterOption {
  /** The actual value for this option */
  value: any;
  /** Display label for the option */
  label: string;
  /** Optional description/tooltip for the option */
  description?: string;
}

/**
 * Validation rules for a parameter.
 * 
 * Defines constraints and validation rules that parameter values must satisfy.
 * 
 * @interface ParameterValidation
 * 
 * @property {number} [minValue] - Minimum value for numeric parameters
 * @property {number} [maxValue] - Maximum value for numeric parameters
 * @property {number} [minLength] - Minimum length for string parameters
 * @property {number} [maxLength] - Maximum length for string parameters
 * @property {string} [pattern] - Regular expression pattern for string validation
 * @property {string} [customValidation] - Custom validation function name or expression
 */
export interface ParameterValidation {
  /** Minimum value for numeric parameters */
  minValue?: number;
  /** Maximum value for numeric parameters */
  maxValue?: number;
  /** Minimum length for string parameters */
  minLength?: number;
  /** Maximum length for string parameters */
  maxLength?: number;
  /** Regular expression pattern for string validation */
  pattern?: string;
  /** Custom validation function name or expression */
  customValidation?: string;
}

/**
 * Formatting rules for displaying field values.
 * 
 * Defines how field values should be formatted when displayed in reports,
 * including number formatting, date formatting, string formatting, and
 * conditional formatting based on values.
 * 
 * @interface FieldFormatting
 * 
 * @property {number} [decimalPlaces] - Number of decimal places for numeric values
 * @property {boolean} [thousandsSeparator] - Whether to use thousands separator (e.g., 1,000)
 * @property {string} [currencySymbol] - Currency symbol for currency fields (e.g., '$', '€')
 * @property {string} [dateFormat] - Date format string (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY')
 * @property {boolean} [capitalize] - Whether to capitalize string values
 * @property {number} [truncateLength] - Maximum length before truncating strings
 * @property {ConditionalFormat[]} [conditionalFormat] - Conditional formatting rules based on values
 * 
 * @example
 * const formatting: FieldFormatting = {
 *   currencySymbol: '$',
 *   decimalPlaces: 2,
 *   thousandsSeparator: true
 * };
 * 
 * const dateFormatting: FieldFormatting = {
 *   dateFormat: 'YYYY-MM-DD'
 * };
 */
export interface FieldFormatting {
  /** Number of decimal places for numeric values */
  decimalPlaces?: number;
  /** Whether to use thousands separator (e.g., 1,000) */
  thousandsSeparator?: boolean;
  /** Currency symbol for currency fields (e.g., '$', '€') */
  currencySymbol?: string;
  /** Date format string (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY') */
  dateFormat?: string;
  /** Whether to capitalize string values */
  capitalize?: boolean;
  /** Maximum length before truncating strings */
  truncateLength?: number;
  /** Conditional formatting rules based on values */
  conditionalFormat?: ConditionalFormat[];
}

/**
 * Conditional formatting rule for a field.
 * 
 * Defines formatting (colors, styles, icons) that should be applied when
 * a condition is met.
 * 
 * @interface ConditionalFormat
 * 
 * @property {string} condition - Condition expression (e.g., 'value > 1000', 'value === "urgent"')
 * @property {Object} format - Formatting to apply when condition is true
 * @property {string} [format.color] - Text color (CSS color value)
 * @property {string} [format.backgroundColor] - Background color (CSS color value)
 * @property {string} [format.fontWeight] - Font weight (e.g., 'bold', 'normal')
 * @property {string} [format.icon] - Icon name or identifier to display
 * 
 * @example
 * const conditional: ConditionalFormat = {
 *   condition: 'value > 1000',
 *   format: {
 *     color: 'green',
 *     fontWeight: 'bold',
 *     icon: 'check'
 *   }
 * };
 */
export interface ConditionalFormat {
  /** Condition expression (e.g., 'value > 1000', 'value === "urgent"') */
  condition: string;
  /** Formatting to apply when condition is true */
  format: {
    /** Text color (CSS color value) */
    color?: string;
    /** Background color (CSS color value) */
    backgroundColor?: string;
    /** Font weight (e.g., 'bold', 'normal') */
    fontWeight?: string;
    /** Icon name or identifier to display */
    icon?: string;
  };
}

/**
 * Enumeration of field data types.
 * 
 * Normalized data types used across the application for consistent
 * type handling regardless of the underlying database type.
 * 
 * @enum {FieldDataType}
 */
export enum FieldDataType {
  /** String/text data type */
  STRING = 'string',
  /** Numeric data type (floating point) */
  NUMBER = 'number',
  /** Integer data type (whole numbers) */
  INTEGER = 'integer',
  /** Decimal data type (fixed precision) */
  DECIMAL = 'decimal',
  /** Currency/money data type */
  CURRENCY = 'currency',
  /** Date data type (date only, no time) */
  DATE = 'date',
  /** DateTime data type (date and time) */
  DATETIME = 'datetime',
  /** Time data type (time only, no date) */
  TIME = 'time',
  /** Boolean data type (true/false) */
  BOOLEAN = 'boolean',
  /** Large text data type */
  TEXT = 'text',
  /** JSON data type */
  JSON = 'json',
  /** Binary data type */
  BINARY = 'binary',
  /** UUID/GUID data type */
  UUID = 'uuid'
}

/**
 * Enumeration of aggregation functions.
 * 
 * SQL aggregation functions that can be applied to fields in queries.
 * 
 * @enum {AggregationType}
 */
export enum AggregationType {
  /** Sum of values */
  SUM = 'sum',
  /** Count of rows */
  COUNT = 'count',
  /** Count of distinct values */
  COUNT_DISTINCT = 'count_distinct',
  /** Average of values */
  AVG = 'avg',
  /** Minimum value */
  MIN = 'min',
  /** Maximum value */
  MAX = 'max',
  /** First value in the group */
  FIRST = 'first',
  /** Last value in the group */
  LAST = 'last',
  /** Concatenate string values */
  CONCAT = 'concat',
  /** Array aggregation (PostgreSQL) */
  ARRAY_AGG = 'array_agg'
}

/**
 * Enumeration of SQL JOIN types.
 * 
 * @enum {JoinType}
 */
export enum JoinType {
  /** INNER JOIN - returns only matching rows */
  INNER = 'inner',
  /** LEFT JOIN - returns all rows from left table */
  LEFT = 'left',
  /** RIGHT JOIN - returns all rows from right table */
  RIGHT = 'right',
  /** FULL OUTER JOIN - returns all rows from both tables */
  FULL = 'full',
  /** CROSS JOIN - Cartesian product of both tables */
  CROSS = 'cross'
}

/**
 * Enumeration of filter operators.
 * 
 * Comparison and logical operators used in WHERE and HAVING clauses.
 * 
 * @enum {FilterOperator}
 */
export enum FilterOperator {
  /** Equality comparison (=) */
  EQUALS = 'equals',
  /** Inequality comparison (!= or <>) */
  NOT_EQUALS = 'not_equals',
  /** Greater than comparison (>) */
  GREATER_THAN = 'greater_than',
  /** Greater than or equal (>=) */
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  /** Less than comparison (<) */
  LESS_THAN = 'less_than',
  /** Less than or equal (<=) */
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  /** Range check (BETWEEN) */
  BETWEEN = 'between',
  /** Not in range (NOT BETWEEN) */
  NOT_BETWEEN = 'not_between',
  /** Membership check (IN) */
  IN = 'in',
  /** Not in set (NOT IN) */
  NOT_IN = 'not_in',
  /** Pattern matching (LIKE) */
  LIKE = 'like',
  /** Negative pattern matching (NOT LIKE) */
  NOT_LIKE = 'not_like',
  /** Case-insensitive pattern matching (ILIKE - PostgreSQL) */
  ILIKE = 'ilike',
  /** Starts with pattern (LIKE 'value%') */
  STARTS_WITH = 'starts_with',
  /** Ends with pattern (LIKE '%value') */
  ENDS_WITH = 'ends_with',
  /** Contains pattern (LIKE '%value%') */
  CONTAINS = 'contains',
  /** NULL check (IS NULL) */
  IS_NULL = 'is_null',
  /** Not NULL check (IS NOT NULL) */
  IS_NOT_NULL = 'is_not_null',
  /** Empty string check */
  IS_EMPTY = 'is_empty',
  /** Not empty string check */
  IS_NOT_EMPTY = 'is_not_empty'
}

/**
 * Enumeration of logical operators for combining filters.
 * 
 * @enum {LogicalOperator}
 */
export enum LogicalOperator {
  /** AND operator - both conditions must be true */
  AND = 'and',
  /** OR operator - either condition can be true */
  OR = 'or'
}

/**
 * Enumeration of sort order directions.
 * 
 * @enum {SortOrder}
 */
export enum SortOrder {
  /** Ascending order (A-Z, 0-9) */
  ASC = 'asc',
  /** Descending order (Z-A, 9-0) */
  DESC = 'desc'
}

/**
 * Enumeration of parameter data types.
 * 
 * Data types that can be used for report parameters.
 * 
 * @enum {ParameterDataType}
 */
export enum ParameterDataType {
  /** String/text parameter */
  STRING = 'string',
  /** Numeric parameter */
  NUMBER = 'number',
  /** Date parameter */
  DATE = 'date',
  /** Boolean parameter */
  BOOLEAN = 'boolean',
  /** List/single-select parameter */
  LIST = 'list',
  /** Multi-select parameter */
  MULTI_SELECT = 'multi_select'
}

// Example QueryConfiguration object
export const exampleQueryConfiguration: QueryConfiguration = {
  fields: [
    {
      id: 'customer_name',
      tableName: 'customers',
      fieldName: 'name',
      alias: 'Customer Name',
      dataType: FieldDataType.STRING,
      required: true
    },
    {
      id: 'order_total',
      tableName: 'orders',
      fieldName: 'total_amount',
      alias: 'Total Sales',
      dataType: FieldDataType.CURRENCY,
      aggregation: AggregationType.SUM,
      formatting: {
        currencySymbol: '$',
        decimalPlaces: 2,
        thousandsSeparator: true
      }
    },
    {
      id: 'order_count',
      tableName: 'orders',
      fieldName: 'id',
      alias: 'Number of Orders',
      dataType: FieldDataType.INTEGER,
      aggregation: AggregationType.COUNT
    }
  ],
  tables: ['customers', 'orders'],
  joins: [
    {
      type: JoinType.INNER,
      leftTable: 'customers',
      rightTable: 'orders',
      conditions: [
        {
          leftField: 'id',
          rightField: 'customer_id',
          operator: '='
        }
      ],
      autoDetected: true
    }
  ],
  filters: [
    {
      id: 'date_filter',
      field: {
        id: 'order_date',
        tableName: 'orders',
        fieldName: 'created_at',
        alias: 'Order Date',
        dataType: FieldDataType.DATE
      },
      operator: FilterOperator.BETWEEN,
      value: {
        start: '2024-01-01',
        end: '2024-12-31'
      },
      isParameter: true,
      parameterName: 'date_range'
    },
    {
      id: 'customer_region_filter',
      field: {
        id: 'customer_region',
        tableName: 'customers',
        fieldName: 'region',
        alias: 'Customer Region',
        dataType: FieldDataType.STRING
      },
      operator: FilterOperator.IN,
      value: ['North America', 'Europe'],
      logicalOperator: LogicalOperator.AND
    }
  ],
  groupBy: [
    {
      field: {
        id: 'customer_name',
        tableName: 'customers',
        fieldName: 'name',
        alias: 'Customer Name',
        dataType: FieldDataType.STRING
      }
    }
  ],
  orderBy: [
    {
      field: {
        id: 'order_total',
        tableName: 'orders',
        fieldName: 'total_amount',
        alias: 'Total Sales',
        dataType: FieldDataType.CURRENCY,
        aggregation: AggregationType.SUM
      },
      direction: SortOrder.DESC,
      priority: 1
    }
  ],
  parameters: [
    {
      name: 'date_range',
      displayName: 'Date Range',
      dataType: ParameterDataType.DATE,
      required: true,
      defaultValue: {
        start: '2024-01-01',
        end: '2024-12-31'
      },
      validation: {
        customValidation: 'start_date_before_end_date'
      }
    }
  ],
  limit: 1000
};