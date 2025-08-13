// src/types/database-schema.types.ts

export interface DatabaseSchema {
  // Database connection information
  databaseName: string;
  databaseType: DatabaseType;
  version?: string;
  
  // Schema metadata
  lastScanned: Date;
  scanDuration: number; // milliseconds
  
  // Tables in the database
  tables: TableSchema[];
  
  // Views in the database
  views?: ViewSchema[];
  
  // Stored procedures and functions
  procedures?: ProcedureSchema[];
  
  // Database-level constraints and indexes
  globalConstraints?: ConstraintSchema[];
  
  // Detected relationships between tables
  relationships: RelationshipSchema[];
  
  // Custom business rules or metadata
  businessRules?: BusinessRuleSchema[];
  
  // Statistics about the database
  statistics?: DatabaseStatistics;
}

export interface TableSchema {
  // Basic table information
  name: string;
  schema?: string; // Database schema name (e.g., 'dbo', 'public')
  displayName?: string; // User-friendly name
  description?: string;
  
  // Table type and properties
  type: TableType;
  isSystemTable: boolean;
  
  // Columns in the table
  columns: ColumnSchema[];
  
  // Indexes on the table
  indexes?: IndexSchema[];
  
  // Constraints on the table
  constraints?: ConstraintSchema[];
  
  // Triggers on the table
  triggers?: TriggerSchema[];
  
  // Table statistics
  rowCount?: number;
  sizeInBytes?: number;
  lastModified?: Date;
  
  // Business metadata
  category?: string; // e.g., 'Customer Data', 'Financial', 'Inventory'
  tags?: string[];
  isArchived?: boolean;
  
  // Sample data for preview
  sampleData?: Record<string, any>[];
}

export interface ColumnSchema {
  // Basic column information
  name: string;
  displayName?: string;
  description?: string;
  
  // Data type information
  dataType: string; // Native database type (e.g., 'varchar', 'int', 'datetime2')
  normalizedType: FieldDataType; // Normalized type for the application
  
  // Column properties
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
  isAutoIncrement: boolean;
  isComputed: boolean;
  
  // Data constraints
  maxLength?: number;
  precision?: number;
  scale?: number;
  defaultValue?: any;
  
  // Foreign key information
  foreignKeyReference?: ForeignKeyReference;
  
  // Column position and ordering
  ordinalPosition: number;
  
  // Sample values for UI
  sampleValues?: any[];
  distinctValueCount?: number;
  
  // Business metadata
  businessName?: string;
  businessDescription?: string;
  format?: string; // e.g., 'currency', 'percentage', 'phone-number'
  category?: ColumnCategory;
  
  // Data quality information
  nullPercentage?: number;
  uniquePercentage?: number;
  
  // Sensitivity classification
  isPersonalData?: boolean;
  sensitivityLevel?: SensitivityLevel;
}

export interface ViewSchema {
  name: string;
  schema?: string;
  displayName?: string;
  description?: string;
  
  // View definition
  definition: string;
  isUpdatable: boolean;
  
  // Columns in the view (similar to table columns)
  columns: ColumnSchema[];
  
  // Dependencies
  dependsOnTables: string[];
  dependsOnViews: string[];
  
  // Business metadata
  category?: string;
  tags?: string[];
}

export interface ProcedureSchema {
  name: string;
  schema?: string;
  displayName?: string;
  description?: string;
  
  // Procedure type
  type: ProcedureType;
  
  // Parameters
  parameters: ParameterSchema[];
  
  // Return type (for functions)
  returnType?: string;
  
  // Business metadata
  category?: string;
  isReportProcedure?: boolean;
}

export interface ParameterSchema {
  name: string;
  dataType: string;
  normalizedType: FieldDataType;
  isOutput: boolean;
  isOptional: boolean;
  defaultValue?: any;
  description?: string;
}

export interface IndexSchema {
  name: string;
  type: IndexType;
  isUnique: boolean;
  isPrimaryKey: boolean;
  isClustered: boolean;
  
  // Columns in the index
  columns: IndexColumnSchema[];
  
  // Index properties
  fillFactor?: number;
  isDisabled?: boolean;
  
  // Statistics
  sizeInBytes?: number;
  rowCount?: number;
  lastUsed?: Date;
}

export interface IndexColumnSchema {
  columnName: string;
  sortOrder: SortOrder;
  ordinalPosition: number;
  isIncludedColumn?: boolean;
}

export interface ConstraintSchema {
  name: string;
  type: ConstraintType;
  tableName: string;
  
  // Constraint definition
  definition: string;
  isEnabled: boolean;
  
  // Columns involved in the constraint
  columns: string[];
  
  // For foreign key constraints
  referencedTable?: string;
  referencedColumns?: string[];
  onDeleteAction?: ReferentialAction;
  onUpdateAction?: ReferentialAction;
}

export interface TriggerSchema {
  name: string;
  type: TriggerType;
  events: TriggerEvent[];
  timing: TriggerTiming;
  definition: string;
  isEnabled: boolean;
}

export interface RelationshipSchema {
  // Relationship identification
  id: string;
  name: string;
  
  // Tables involved
  parentTable: string;
  childTable: string;
  
  // Column mappings
  columnMappings: ColumnMapping[];
  
  // Relationship properties
  type: RelationshipType;
  cardinality: RelationshipCardinality;
  isEnforced: boolean;
  
  // Detection metadata
  confidence: number; // 0-1, how confident we are this is a real relationship
  detectionMethod: DetectionMethod;
  
  // Business metadata
  displayName?: string;
  description?: string;
}

export interface ColumnMapping {
  parentColumn: string;
  childColumn: string;
}

export interface ForeignKeyReference {
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
  onDeleteAction: ReferentialAction;
  onUpdateAction: ReferentialAction;
}

export interface BusinessRuleSchema {
  id: string;
  name: string;
  description: string;
  type: BusinessRuleType;
  
  // Tables/columns affected
  affectedTables: string[];
  affectedColumns: string[];
  
  // Rule definition
  rule: string;
  isActive: boolean;
  
  // Validation
  validationQuery?: string;
  severity: RuleSeverity;
}

export interface DatabaseStatistics {
  totalTables: number;
  totalViews: number;
  totalProcedures: number;
  totalIndexes: number;
  
  // Size information
  totalSizeInBytes: number;
  totalRows: number;
  
  // Data quality metrics
  tablesWithPrimaryKeys: number;
  tablesWithForeignKeys: number;
  orphanedTables: number; // Tables with no relationships
  
  // Performance metrics
  mostAccessedTables: string[];
  slowestQueries?: string[];
}

// Enums and supporting types

export enum DatabaseType {
  SQL_SERVER = 'sqlserver',
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  ORACLE = 'oracle',
  SQLITE = 'sqlite'
}

export enum TableType {
  BASE_TABLE = 'base_table',
  VIEW = 'view',
  TEMPORARY = 'temporary',
  SYSTEM = 'system'
}

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
  JSON = 'json',
  BINARY = 'binary',
  UUID = 'uuid'
}

export enum ColumnCategory {
  IDENTIFIER = 'identifier',
  DESCRIPTIVE = 'descriptive',
  QUANTITATIVE = 'quantitative',
  TEMPORAL = 'temporal',
  CATEGORICAL = 'categorical',
  BINARY = 'binary',
  METADATA = 'metadata'
}

export enum SensitivityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted'
}

export enum ProcedureType {
  STORED_PROCEDURE = 'stored_procedure',
  FUNCTION = 'function',
  TABLE_FUNCTION = 'table_function'
}

export enum IndexType {
  CLUSTERED = 'clustered',
  NON_CLUSTERED = 'non_clustered',
  UNIQUE = 'unique',
  FULL_TEXT = 'full_text',
  SPATIAL = 'spatial'
}

export enum ConstraintType {
  PRIMARY_KEY = 'primary_key',
  FOREIGN_KEY = 'foreign_key',
  UNIQUE = 'unique',
  CHECK = 'check',
  DEFAULT = 'default',
  NOT_NULL = 'not_null'
}

export enum TriggerType {
  DML = 'dml', // Data Manipulation Language
  DDL = 'ddl', // Data Definition Language
  LOGON = 'logon'
}

export enum TriggerEvent {
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete'
}

export enum TriggerTiming {
  BEFORE = 'before',
  AFTER = 'after',
  INSTEAD_OF = 'instead_of'
}

export enum RelationshipType {
  FOREIGN_KEY = 'foreign_key',
  INFERRED = 'inferred', // Detected by naming conventions or data patterns
  BUSINESS_RULE = 'business_rule'
}

export enum RelationshipCardinality {
  ONE_TO_ONE = 'one_to_one',
  ONE_TO_MANY = 'one_to_many',
  MANY_TO_MANY = 'many_to_many'
}

export enum DetectionMethod {
  FOREIGN_KEY_CONSTRAINT = 'foreign_key_constraint',
  NAMING_CONVENTION = 'naming_convention',
  DATA_ANALYSIS = 'data_analysis',
  MANUAL = 'manual'
}

export enum ReferentialAction {
  NO_ACTION = 'no_action',
  CASCADE = 'cascade',
  SET_NULL = 'set_null',
  SET_DEFAULT = 'set_default',
  RESTRICT = 'restrict'
}

export enum BusinessRuleType {
  DATA_VALIDATION = 'data_validation',
  BUSINESS_LOGIC = 'business_logic',
  SECURITY = 'security',
  PERFORMANCE = 'performance'
}

export enum RuleSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

// Example DatabaseSchema object
export const exampleDatabaseSchema: DatabaseSchema = {
  databaseName: 'northwind',
  databaseType: DatabaseType.SQL_SERVER,
  version: '2019',
  lastScanned: new Date('2024-01-15T10:30:00Z'),
  scanDuration: 5430, // 5.43 seconds
  
  tables: [
    {
      name: 'customers',
      schema: 'dbo',
      displayName: 'Customers',
      description: 'Customer master data',
      type: TableType.BASE_TABLE,
      isSystemTable: false,
      category: 'Customer Data',
      tags: ['master-data', 'crm'],
      rowCount: 91,
      sizeInBytes: 32768,
      lastModified: new Date('2024-01-10T14:22:00Z'),
      
      columns: [
        {
          name: 'customer_id',
          displayName: 'Customer ID',
          description: 'Unique identifier for customer',
          dataType: 'varchar',
          normalizedType: FieldDataType.STRING,
          isNullable: false,
          isPrimaryKey: true,
          isForeignKey: false,
          isUnique: true,
          isAutoIncrement: false,
          isComputed: false,
          maxLength: 5,
          ordinalPosition: 1,
          businessName: 'Customer Code',
          category: ColumnCategory.IDENTIFIER,
          sensitivityLevel: SensitivityLevel.INTERNAL,
          sampleValues: ['ALFKI', 'ANATR', 'ANTON'],
          distinctValueCount: 91,
          nullPercentage: 0,
          uniquePercentage: 100
        },
        {
          name: 'company_name',
          displayName: 'Company Name',
          description: 'Name of the customer company',
          dataType: 'varchar',
          normalizedType: FieldDataType.STRING,
          isNullable: false,
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isAutoIncrement: false,
          isComputed: false,
          maxLength: 40,
          ordinalPosition: 2,
          businessName: 'Customer Name',
          category: ColumnCategory.DESCRIPTIVE,
          sensitivityLevel: SensitivityLevel.PUBLIC,
          sampleValues: ['Alfreds Futterkiste', 'Ana Trujillo Emparedados', 'Antonio Moreno Taquería'],
          distinctValueCount: 91,
          nullPercentage: 0,
          uniquePercentage: 100
        },
        {
          name: 'contact_name',
          displayName: 'Contact Name',
          dataType: 'varchar',
          normalizedType: FieldDataType.STRING,
          isNullable: true,
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isAutoIncrement: false,
          isComputed: false,
          maxLength: 30,
          ordinalPosition: 3,
          category: ColumnCategory.DESCRIPTIVE,
          isPersonalData: true,
          sensitivityLevel: SensitivityLevel.CONFIDENTIAL,
          nullPercentage: 5,
          uniquePercentage: 95
        },
        {
          name: 'country',
          displayName: 'Country',
          dataType: 'varchar',
          normalizedType: FieldDataType.STRING,
          isNullable: true,
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isAutoIncrement: false,
          isComputed: false,
          maxLength: 15,
          ordinalPosition: 4,
          category: ColumnCategory.CATEGORICAL,
          sensitivityLevel: SensitivityLevel.PUBLIC,
          sampleValues: ['Germany', 'Mexico', 'UK', 'Sweden'],
          distinctValueCount: 21,
          nullPercentage: 0
        }
      ],
      
      indexes: [
        {
          name: 'PK_customers',
          type: IndexType.CLUSTERED,
          isUnique: true,
          isPrimaryKey: true,
          isClustered: true,
          columns: [
            {
              columnName: 'customer_id',
              sortOrder: SortOrder.ASC,
              ordinalPosition: 1
            }
          ]
        }
      ],
      
      sampleData: [
        {
          customer_id: 'ALFKI',
          company_name: 'Alfreds Futterkiste',
          contact_name: 'Maria Anders',
          country: 'Germany'
        },
        {
          customer_id: 'ANATR',
          company_name: 'Ana Trujillo Emparedados y helados',
          contact_name: 'Ana Trujillo',
          country: 'Mexico'
        }
      ]
    },
    
    {
      name: 'orders',
      schema: 'dbo',
      displayName: 'Orders',
      description: 'Customer orders',
      type: TableType.BASE_TABLE,
      isSystemTable: false,
      category: 'Transaction Data',
      tags: ['transactions', 'sales'],
      rowCount: 830,
      
      columns: [
        {
          name: 'order_id',
          displayName: 'Order ID',
          dataType: 'int',
          normalizedType: FieldDataType.INTEGER,
          isNullable: false,
          isPrimaryKey: true,
          isForeignKey: false,
          isUnique: true,
          isAutoIncrement: true,
          isComputed: false,
          ordinalPosition: 1,
          category: ColumnCategory.IDENTIFIER
        },
        {
          name: 'customer_id',
          displayName: 'Customer ID',
          dataType: 'varchar',
          normalizedType: FieldDataType.STRING,
          isNullable: true,
          isPrimaryKey: false,
          isForeignKey: true,
          isUnique: false,
          isAutoIncrement: false,
          isComputed: false,
          maxLength: 5,
          ordinalPosition: 2,
          category: ColumnCategory.IDENTIFIER,
          foreignKeyReference: {
            referencedTable: 'customers',
            referencedColumn: 'customer_id',
            constraintName: 'FK_orders_customers',
            onDeleteAction: ReferentialAction.SET_NULL,
            onUpdateAction: ReferentialAction.CASCADE
          }
        },
        {
          name: 'order_date',
          displayName: 'Order Date',
          dataType: 'datetime',
          normalizedType: FieldDataType.DATETIME,
          isNullable: true,
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isAutoIncrement: false,
          isComputed: false,
          ordinalPosition: 3,
          category: ColumnCategory.TEMPORAL,
          format: 'date'
        },
        {
          name: 'freight',
          displayName: 'Shipping Cost',
          dataType: 'money',
          normalizedType: FieldDataType.CURRENCY,
          isNullable: true,
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isAutoIncrement: false,
          isComputed: false,
          precision: 19,
          scale: 4,
          ordinalPosition: 4,
          category: ColumnCategory.QUANTITATIVE,
          format: 'currency'
        }
      ]
    }
  ],
  
  relationships: [
    {
      id: 'customers_orders_rel',
      name: 'Customer Orders',
      parentTable: 'customers',
      childTable: 'orders',
      columnMappings: [
        {
          parentColumn: 'customer_id',
          childColumn: 'customer_id'
        }
      ],
      type: RelationshipType.FOREIGN_KEY,
      cardinality: RelationshipCardinality.ONE_TO_MANY,
      isEnforced: true,
      confidence: 1.0,
      detectionMethod: DetectionMethod.FOREIGN_KEY_CONSTRAINT,
      displayName: 'Customer to Orders',
      description: 'One customer can have many orders'
    }
  ],
  
  statistics: {
    totalTables: 13,
    totalViews: 3,
    totalProcedures: 7,
    totalIndexes: 25,
    totalSizeInBytes: 2097152,
    totalRows: 3000,
    tablesWithPrimaryKeys: 13,
    tablesWithForeignKeys: 8,
    orphanedTables: 0,
    mostAccessedTables: ['orders', 'customers', 'order_details']
  }
};