// src/types/query-configuration.types.ts

export interface QueryConfiguration {
  // Fields to select in the query
  fields: FieldConfiguration[];
  
  // Tables involved in the query
  tables: string[];
  
  // Join relationships between tables
  joins?: JoinConfiguration[];
  
  // WHERE clause conditions
  filters?: FilterConfiguration[];
  
  // GROUP BY fields
  groupBy?: GroupByConfiguration[];
  
  // ORDER BY fields
  orderBy?: OrderByConfiguration[];
  
  // HAVING clause conditions (for grouped queries)
  having?: FilterConfiguration[];
  
  // Limit number of results
  limit?: number;
  
  // Offset for pagination
  offset?: number;
  
  // Parameters that will be replaced at runtime
  parameters?: ParameterConfiguration[];
}

export interface FieldConfiguration {
  // Unique identifier for this field in the query
  id: string;
  
  // Table name (e.g., 'customers')
  tableName: string;
  
  // Field name in the database (e.g., 'customer_name')
  fieldName: string;
  
  // Alias for the field in results (e.g., 'Customer Name')
  alias: string;
  
  // Data type of the field
  dataType: FieldDataType;
  
  // Aggregation function if applicable
  aggregation?: AggregationType;
  
  // Whether this field is required for the query
  required?: boolean;
  
  // Custom expression instead of simple field reference
  expression?: string;
  
  // Formatting rules for display
  formatting?: FieldFormatting;
}

export interface JoinConfiguration {
  // Type of join
  type: JoinType;
  
  // Left table in the join
  leftTable: string;
  
  // Right table in the join
  rightTable: string;
  
  // Join conditions
  conditions: JoinCondition[];
  
  // Whether this join was automatically detected
  autoDetected?: boolean;
}

export interface JoinCondition {
  // Left side of the join condition
  leftField: string;
  
  // Right side of the join condition
  rightField: string;
  
  // Join operator (usually '=' but could be others)
  operator: string;
}

export interface FilterConfiguration {
  // Unique identifier for this filter
  id: string;
  
  // Field being filtered
  field: FieldConfiguration;
  
  // Filter operator
  operator: FilterOperator;
  
  // Filter value(s)
  value: any;
  
  // Logical operator to combine with next filter (AND/OR)
  logicalOperator?: LogicalOperator;
  
  // Whether this filter uses a parameter
  isParameter?: boolean;
  
  // Parameter name if this filter uses a parameter
  parameterName?: string;
  
  // Group ID for complex filter grouping
  groupId?: string;
}

export interface GroupByConfiguration {
  // Field to group by
  field: FieldConfiguration;
  
  // Sort order within the group
  sortOrder?: SortOrder;
}

export interface OrderByConfiguration {
  // Field to sort by
  field: FieldConfiguration;
  
  // Sort direction
  direction: SortOrder;
  
  // Priority order (for multiple sorts)
  priority: number;
}

export interface ParameterConfiguration {
  // Parameter name
  name: string;
  
  // Display name for UI
  displayName: string;
  
  // Parameter data type
  dataType: ParameterDataType;
  
  // Default value
  defaultValue?: any;
  
  // Whether parameter is required
  required: boolean;
  
  // Validation rules
  validation?: ParameterValidation;
  
  // Possible values for dropdown parameters
  possibleValues?: ParameterOption[];
}

export interface ParameterOption {
  value: any;
  label: string;
  description?: string;
}

export interface ParameterValidation {
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customValidation?: string;
}

export interface FieldFormatting {
  // Number formatting
  decimalPlaces?: number;
  thousandsSeparator?: boolean;
  currencySymbol?: string;
  
  // Date formatting
  dateFormat?: string;
  
  // String formatting
  capitalize?: boolean;
  truncateLength?: number;
  
  // Conditional formatting
  conditionalFormat?: ConditionalFormat[];
}

export interface ConditionalFormat {
  condition: string;
  format: {
    color?: string;
    backgroundColor?: string;
    fontWeight?: string;
    icon?: string;
  };
}

// Enums
export enum FieldDataType {
  STRING = 'string',
  NUMBER = 'number',
  INTEGER = 'integer',
  DECIMAL = 'decimal',
  CURRENCY = 'currency',
  DATE = 'date',
  DATETIME = 'datetime',
  TIME = 'time',
  BOOLEAN = 'boolean',
  TEXT = 'text',
  JSON = 'json'
}

export enum AggregationType {
  SUM = 'sum',
  COUNT = 'count',
  COUNT_DISTINCT = 'count_distinct',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  FIRST = 'first',
  LAST = 'last',
  CONCAT = 'concat',
  ARRAY_AGG = 'array_agg'
}

export enum JoinType {
  INNER = 'inner',
  LEFT = 'left',
  RIGHT = 'right',
  FULL = 'full',
  CROSS = 'cross'
}

export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN = 'less_than',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  BETWEEN = 'between',
  NOT_BETWEEN = 'not_between',
  IN = 'in',
  NOT_IN = 'not_in',
  LIKE = 'like',
  NOT_LIKE = 'not_like',
  ILIKE = 'ilike', // Case-insensitive like
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  CONTAINS = 'contains',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty'
}

export enum LogicalOperator {
  AND = 'and',
  OR = 'or'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export enum ParameterDataType {
  STRING = 'string',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
  LIST = 'list',
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