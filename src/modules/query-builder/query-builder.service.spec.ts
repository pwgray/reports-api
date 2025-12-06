// @ts-nocheck - Test file with mock data structures
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryBuilderService } from './query-builder.service';
import { DataSource } from '../../entities/data-source.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  FieldDataType,
  AggregationType,
  FilterOperator,
  JoinType,
  SortOrder,
  LogicalOperator,
  FieldConfiguration,
  FilterConfiguration,
  QueryConfiguration,
} from '../../types/query-configuration.type';


describe('QueryBuilderService', () => {
  let service: QueryBuilderService;
  let repository: any;

  const mockRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryBuilderService,
        {
          provide: getRepositoryToken(DataSource),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<QueryBuilderService>(QueryBuilderService);
    repository = module.get(getRepositoryToken(DataSource));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildQuery', () => {
    it('should build simple SELECT query', async () => {
      const config = {
        fields: [
          {
            id: 'user_id_field',
            fieldName: 'id',
            tableName: 'Users',
            schemaName: 'dbo',
            alias: 'user_id',
            dataType: FieldDataType.INTEGER,
          },
        ],
        tables: ['dbo.Users'],
      };

      const query = await service.buildQuery(config);

      expect(query).toContain('SELECT');
      expect(query).toContain('[dbo].[Users].[id] AS [user_id]');
      expect(query).toContain('FROM [dbo].[Users]');
    });

    it('should build query with multiple fields', async () => {
      const config = {
        fields: [
          {
            id: 'user_id_field',
            fieldName: 'id',
            tableName: 'Users',
            alias: 'user_id',
            dataType: FieldDataType.INTEGER,
          },
          {
            id: 'user_name_field',
            fieldName: 'name',
            tableName: 'Users',
            alias: 'user_name',
            dataType: FieldDataType.STRING,
          },
        ],
        tables: ['Users'],
      };

      const query = await service.buildQuery(config);

      expect(query).toContain('[Users].[id] AS [user_id]');
      expect(query).toContain('[Users].[name] AS [user_name]');
    });

    it('should build query with COUNT aggregation', async () => {
      const config = {
        fields: [
          {
            id: 'count_field',
            fieldName: 'id',
            tableName: 'Users',
            alias: 'total_count',
            dataType: FieldDataType.INTEGER,
            aggregation: AggregationType.COUNT,
          },
        ],
        tables: ['Users'],
      };

      const query = await service.buildQuery(config);

      expect(query).toContain('COUNT([Users].[id])');
    });

    it('should build query with COUNT(*)', async () => {
      const config = {
        fields: [
          {
            id: 'count_all_field',
            fieldName: '*',
            tableName: 'Users',
            alias: 'total',
            dataType: FieldDataType.INTEGER,
            aggregation: AggregationType.COUNT,
          },
        ],
        tables: ['Users'],
      };

      const query = await service.buildQuery(config);

      expect(query).toContain('COUNT(*)');
    });

    it('should build query with SUM aggregation', async () => {
      const config = {
        fields: [
          {
            id: 'sum_field',
            fieldName: 'amount',
            tableName: 'Orders',
            alias: 'total_amount',
            dataType: FieldDataType.DECIMAL,
            aggregation: AggregationType.SUM,
          },
        ],
        tables: ['Orders'],
      };

      const query = await service.buildQuery(config);

      expect(query).toContain('SUM([Orders].[amount])');
    });

    it('should build query with AVG aggregation', async () => {
      const config = {
        fields: [
          {
            id: 'avg_field',
            fieldName: 'price',
            tableName: 'Products',
            alias: 'avg_price',
            dataType: FieldDataType.DECIMAL,
            aggregation: AggregationType.AVG,
          },
        ],
        tables: ['Products'],
      };

      const query = await service.buildQuery(config);

      expect(query).toContain('AVG([Products].[price])');
    });

    it('should throw error when no fields provided', async () => {
      const config = {
        fields: [],
        tables: ['Users'],
      };

      await expect(service.buildQuery(config)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.buildQuery(config)).rejects.toThrow(
        'Query must have at least one field'
      );
    });

    it('should throw error when no tables provided', async () => {
      const config = {
        fields: [
          {
            id: 'user_id_field',
            fieldName: 'id',
            tableName: 'Users',
            alias: 'user_id',
            dataType: FieldDataType.INTEGER,
          },
        ],
        tables: [],
      };

      await expect(service.buildQuery(config)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.buildQuery(config)).rejects.toThrow(
        'Query must specify at least one table'
      );
    });

    it('should throw error for invalid field name', async () => {
      const config = {
        fields: [
          {
            id: 'invalid_field',
            fieldName: 'undefined',
            tableName: 'Users',
            alias: 'user_id',
            dataType: FieldDataType.INTEGER,
          },
        ],
        tables: ['Users'],
      };

      await expect(service.buildQuery(config)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw error for invalid table name', async () => {
      const config = {
        fields: [
          {
            id: 'user_id_field',
            fieldName: 'id',
            tableName: 'undefined',
            alias: 'user_id',
            dataType: FieldDataType.INTEGER,
          },
        ],
        tables: ['Users'],
      };

      await expect(service.buildQuery(config)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('buildSelectClause', () => {
    it('should build SELECT with TOP for SQL Server', () => {
      const fields = [
        {
          id: 'user_id_field',
          fieldName: 'id',
          tableName: 'Users',
          alias: 'user_id',
          dataType: FieldDataType.INTEGER,
        },
      ];

      const result = service['buildSelectClause'](fields, 10);

      expect(result).toContain('SELECT TOP 10');
    });

    it('should build SELECT without TOP when not specified', () => {
      const fields = [
        {
          id: 'user_id_field',
          fieldName: 'id',
          tableName: 'Users',
          alias: 'user_id',
          dataType: FieldDataType.INTEGER,
        },
      ];

      const result = service['buildSelectClause'](fields);

      expect(result).toContain('SELECT');
      expect(result).not.toContain('TOP');
    });

    it('should handle custom expression fields', () => {
      const fields = [
        {
          id: 'calculated_field',
          fieldName: 'id',
          tableName: 'Users',
          alias: 'calculated',
          dataType: FieldDataType.INTEGER,
          expression: 'SUM(price * quantity)',
        },
      ];

      const result = service['buildSelectClause'](fields);

      expect(result).toContain('SUM(price * quantity) AS [calculated]');
    });
  });

  describe('buildWhereClause', () => {
    it('should build WHERE with EQUALS operator', () => {
      const filters = [
        {
          id: 'status_filter',
          field: {
            id: 'status_field',
            fieldName: 'status',
            tableName: 'Users',
            alias: 'status',
            dataType: FieldDataType.STRING,
          },
          operator: FilterOperator.EQUALS,
          value: 'active',
        },
      ];

      const result = service['buildWhereClause'](filters, {});

      expect(result).toContain('WHERE');
      expect(result).toContain("[Users].[status] = 'active'");
    });

    it('should build WHERE with NOT_EQUALS operator', () => {
      const filters = [
        {
          field: {
            fieldName: 'status',
            tableName: 'Users',
            dataType: FieldDataType.STRING,
          },
          operator: FilterOperator.NOT_EQUALS,
          value: 'deleted',
        },
      ];

      const result = service['buildWhereClause'](filters, {});

      expect(result).toContain("!=");
      expect(result).toContain("'deleted'");
    });

    it('should build WHERE with GREATER_THAN operator', () => {
      const filters = [
        {
          field: {
            fieldName: 'age',
            tableName: 'Users',
            dataType: FieldDataType.INTEGER,
          },
          operator: FilterOperator.GREATER_THAN,
          value: 18,
        },
      ];

      const result = service['buildWhereClause'](filters, {});

      expect(result).toContain('[Users].[age] > 18');
    });

    it('should build WHERE with LESS_THAN operator', () => {
      const filters = [
        {
          field: {
            fieldName: 'price',
            tableName: 'Products',
            dataType: FieldDataType.DECIMAL,
          },
          operator: FilterOperator.LESS_THAN,
          value: 100,
        },
      ];

      const result = service['buildWhereClause'](filters, {});

      expect(result).toContain('[Products].[price] < 100');
    });

    it('should build WHERE with IN operator', () => {
      const filters = [
        {
          field: {
            fieldName: 'status',
            tableName: 'Users',
            dataType: FieldDataType.STRING,
          },
          operator: FilterOperator.IN,
          value: ['active', 'pending'],
        },
      ];

      const result = service['buildWhereClause'](filters, {});

      expect(result).toContain('IN');
      expect(result).toContain("'active'");
      expect(result).toContain("'pending'");
    });

    it('should build WHERE with BETWEEN operator', () => {
      const filters = [
        {
          field: {
            fieldName: 'age',
            tableName: 'Users',
            dataType: FieldDataType.INTEGER,
          },
          operator: FilterOperator.BETWEEN,
          value: { start: 18, end: 65 },
        },
      ];

      const result = service['buildWhereClause'](filters, {});

      expect(result).toContain('BETWEEN');
      expect(result).toContain('18 AND 65');
    });

    it('should build WHERE with LIKE operator', () => {
      const filters = [
        {
          field: {
            fieldName: 'name',
            tableName: 'Users',
            dataType: FieldDataType.STRING,
          },
          operator: FilterOperator.LIKE,
          value: 'John',
        },
      ];

      const result = service['buildWhereClause'](filters, {});

      expect(result).toContain('LIKE');
      expect(result).toContain("'%John%'");
    });

    it('should build WHERE with STARTS_WITH operator', () => {
      const filters = [
        {
          field: {
            fieldName: 'name',
            tableName: 'Users',
            dataType: FieldDataType.STRING,
          },
          operator: FilterOperator.STARTS_WITH,
          value: 'John',
        },
      ];

      const result = service['buildWhereClause'](filters, {});

      expect(result).toContain('LIKE');
      expect(result).toContain("'John%'");
    });

    it('should build WHERE with ENDS_WITH operator', () => {
      const filters = [
        {
          field: {
            fieldName: 'email',
            tableName: 'Users',
            dataType: FieldDataType.STRING,
          },
          operator: FilterOperator.ENDS_WITH,
          value: '@example.com',
        },
      ];

      const result = service['buildWhereClause'](filters, {});

      expect(result).toContain('LIKE');
      expect(result).toContain("'%@example.com'");
    });

    it('should build WHERE with IS_NULL operator', () => {
      const filters = [
        {
          field: {
            fieldName: 'deletedAt',
            tableName: 'Users',
            dataType: FieldDataType.DATETIME,
          },
          operator: FilterOperator.IS_NULL,
        },
      ];

      const result = service['buildWhereClause'](filters, {});

      expect(result).toContain('IS NULL');
    });

    it('should build WHERE with IS_NOT_NULL operator', () => {
      const filters = [
        {
          field: {
            fieldName: 'updatedAt',
            tableName: 'Users',
            dataType: FieldDataType.DATETIME,
          },
          operator: FilterOperator.IS_NOT_NULL,
        },
      ];

      const result = service['buildWhereClause'](filters, {});

      expect(result).toContain('IS NOT NULL');
    });

    it('should build WHERE with multiple conditions and logical operators', () => {
      const filters = [
        {
          field: {
            fieldName: 'status',
            tableName: 'Users',
            dataType: FieldDataType.STRING,
          },
          operator: FilterOperator.EQUALS,
          value: 'active',
          logicalOperator: LogicalOperator.AND,
        },
        {
          field: {
            fieldName: 'age',
            tableName: 'Users',
            dataType: FieldDataType.INTEGER,
          },
          operator: FilterOperator.GREATER_THAN,
          value: 18,
        },
      ];

      const result = service['buildWhereClause'](filters, {});

      expect(result).toContain('AND');
    });

    it('should handle parameterized filters', () => {
      const filters = [
        {
          field: {
            fieldName: 'status',
            tableName: 'Users',
            dataType: FieldDataType.STRING,
          },
          operator: FilterOperator.EQUALS,
          isParameter: true,
          parameterName: 'userStatus',
        },
      ];
      const parameters = { userStatus: 'active' };

      const result = service['buildWhereClause'](filters, parameters);

      expect(result).toContain("'active'");
    });
  });

  describe('buildJoinClauses', () => {
    it('should build INNER JOIN', () => {
      const joins = [
        {
          type: JoinType.INNER,
          leftTable: 'Users',
          leftSchema: 'dbo',
          rightTable: 'Orders',
          rightSchema: 'dbo',
          conditions: [
            {
              leftField: 'id',
              operator: '=',
              rightField: 'user_id',
            },
          ],
        },
      ];

      const result = service['buildJoinClauses'](joins);

      expect(result).toContain('INNER JOIN');
      expect(result).toContain('[dbo].[Orders]');
      expect(result).toContain('[dbo].[Users].[id] = [dbo].[Orders].[user_id]');
    });

    it('should build LEFT JOIN', () => {
      const joins = [
        {
          type: JoinType.LEFT,
          leftTable: 'Users',
          rightTable: 'Orders',
          conditions: [
            {
              leftField: 'id',
              operator: '=',
              rightField: 'user_id',
            },
          ],
        },
      ];

      const result = service['buildJoinClauses'](joins);

      expect(result).toContain('LEFT JOIN');
    });

    it('should handle multiple join conditions', () => {
      const joins = [
        {
          type: JoinType.INNER,
          leftTable: 'Users',
          rightTable: 'Orders',
          conditions: [
            {
              leftField: 'id',
              operator: '=',
              rightField: 'user_id',
            },
            {
              leftField: 'tenant_id',
              operator: '=',
              rightField: 'tenant_id',
            },
          ],
        },
      ];

      const result = service['buildJoinClauses'](joins);

      expect(result).toContain('AND');
    });
  });

  describe('buildOrderByClause', () => {
    it('should build ORDER BY with single field', () => {
      const orderBy = [
        {
          field: {
            fieldName: 'createdAt',
            tableName: 'Users',
          },
          direction: SortOrder.DESC,
          priority: 1,
        },
      ];

      const result = service['buildOrderByClause'](orderBy);

      expect(result).toContain('ORDER BY');
      expect(result).toContain('[Users].[createdAt] DESC');
    });

    it('should build ORDER BY with multiple fields sorted by priority', () => {
      const orderBy = [
        {
          field: {
            fieldName: 'name',
            tableName: 'Users',
          },
          direction: SortOrder.ASC,
          priority: 2,
        },
        {
          field: {
            fieldName: 'createdAt',
            tableName: 'Users',
          },
          direction: SortOrder.DESC,
          priority: 1,
        },
      ];

      const result = service['buildOrderByClause'](orderBy);

      expect(result).toContain('ORDER BY');
      // Lower priority should come first
      expect(result.indexOf('createdAt')).toBeLessThan(result.indexOf('name'));
    });

    it('should handle aggregated fields in ORDER BY', () => {
      const orderBy = [
        {
          field: {
            fieldName: 'amount',
            tableName: 'Orders',
            aggregation: AggregationType.SUM,
          },
          direction: SortOrder.DESC,
          priority: 1,
        },
      ];

      const result = service['buildOrderByClause'](orderBy);

      expect(result).toContain('SUM([Orders].[amount])');
    });
  });

  describe('formatValue', () => {
    it('should format string values with quotes', () => {
      const result = service['formatValue']('test', FieldDataType.STRING);
      expect(result).toBe("'test'");
    });

    it('should format integer without quotes', () => {
      const result = service['formatValue'](123, FieldDataType.INTEGER);
      expect(result).toBe('123');
    });

    it('should format decimal without quotes', () => {
      const result = service['formatValue'](123.45, FieldDataType.DECIMAL);
      expect(result).toBe('123.45');
    });

    it('should format NULL values', () => {
      const result = service['formatValue'](null, FieldDataType.STRING);
      expect(result).toBe('NULL');
    });

    it('should format undefined as NULL', () => {
      const result = service['formatValue'](undefined, FieldDataType.STRING);
      expect(result).toBe('NULL');
    });

    it('should escape single quotes in strings', () => {
      const result = service['formatValue']("O'Brien", FieldDataType.STRING);
      expect(result).toBe("'O''Brien'");
    });

    it('should format boolean as 1 or 0', () => {
      expect(service['formatValue'](true, FieldDataType.BOOLEAN)).toBe('1');
      expect(service['formatValue'](false, FieldDataType.BOOLEAN)).toBe('0');
    });

    it('should format string "true" as 1', () => {
      expect(service['formatValue']('true', FieldDataType.BOOLEAN)).toBe('1');
    });

    it('should format string "false" as 0', () => {
      expect(service['formatValue']('false', FieldDataType.BOOLEAN)).toBe('0');
    });

    it('should format date values with quotes', () => {
      const result = service['formatValue']('2024-01-01', FieldDataType.DATE);
      expect(result).toBe("'2024-01-01'");
    });

    it('should format datetime values with quotes', () => {
      const result = service['formatValue']('2024-01-01 10:30:00', FieldDataType.DATETIME);
      expect(result).toBe("'2024-01-01 10:30:00'");
    });

    it('should format JSON values', () => {
      const result = service['formatValue']({ key: 'value' }, FieldDataType.JSON);
      expect(result).toBe("'{\"key\":\"value\"}'");
    });
  });

  describe('escapeIdentifier', () => {
    it('should escape identifiers with square brackets', () => {
      const result = service['escapeIdentifier']('Users');
      expect(result).toBe('[Users]');
    });

    it('should escape identifiers with special characters', () => {
      const result = service['escapeIdentifier']('User Data');
      expect(result).toBe('[User Data]');
    });

    it('should throw error for undefined identifier', () => {
      expect(() => service['escapeIdentifier'](undefined as any)).toThrow(
        BadRequestException
      );
    });

    it('should throw error for null identifier', () => {
      expect(() => service['escapeIdentifier']('null')).toThrow(
        BadRequestException
      );
    });

    it('should throw error for "undefined" string', () => {
      expect(() => service['escapeIdentifier']('undefined')).toThrow(
        BadRequestException
      );
    });
  });

  describe('buildTableReference', () => {
    it('should build schema-qualified table reference', () => {
      const result = service['buildTableReference']('dbo', 'Users');
      expect(result).toBe('[dbo].[Users]');
    });

    it('should build table reference without schema', () => {
      const result = service['buildTableReference'](undefined, 'Users');
      expect(result).toBe('[Users]');
    });

    it('should throw error for undefined table name', () => {
      expect(() => service['buildTableReference']('dbo', 'undefined')).toThrow(
        BadRequestException
      );
    });
  });

  describe('mapDatabaseTypeToDriver', () => {
    it('should map sqlserver to mssql', () => {
      const result = service['mapDatabaseTypeToDriver']('sqlserver');
      expect(result).toBe('mssql');
    });

    it('should map mssql to mssql', () => {
      const result = service['mapDatabaseTypeToDriver']('mssql');
      expect(result).toBe('mssql');
    });

    it('should map postgresql to postgres', () => {
      const result = service['mapDatabaseTypeToDriver']('postgresql');
      expect(result).toBe('postgres');
    });

    it('should map postgres to postgres', () => {
      const result = service['mapDatabaseTypeToDriver']('postgres');
      expect(result).toBe('postgres');
    });

    it('should map mysql to mysql', () => {
      const result = service['mapDatabaseTypeToDriver']('mysql');
      expect(result).toBe('mysql');
    });

    it('should throw error for unsupported type', () => {
      expect(() =>
        service['mapDatabaseTypeToDriver']('unsupported')
      ).toThrow(BadRequestException);
    });

    it('should handle case insensitivity', () => {
      const result = service['mapDatabaseTypeToDriver']('SQLSERVER');
      expect(result).toBe('mssql');
    });
  });

  describe('buildLimitClause', () => {
    it('should return empty string for SQL Server with offset 0', () => {
      const result = service['buildLimitClause'](10, 0, 'mssql');
      expect(result).toBe('');
    });

    it('should use OFFSET/FETCH for SQL Server with offset', () => {
      const result = service['buildLimitClause'](10, 20, 'mssql');
      expect(result).toContain('OFFSET 20 ROWS');
      expect(result).toContain('FETCH NEXT 10 ROWS ONLY');
    });

    it('should use LIMIT for MySQL without offset', () => {
      const result = service['buildLimitClause'](10, 0, 'mysql');
      expect(result).toContain('LIMIT 10');
      expect(result).not.toContain('OFFSET');
    });

    it('should use LIMIT with OFFSET for MySQL', () => {
      const result = service['buildLimitClause'](10, 20, 'mysql');
      expect(result).toContain('LIMIT 10');
      expect(result).toContain('OFFSET 20');
    });

    it('should use LIMIT for PostgreSQL', () => {
      const result = service['buildLimitClause'](10, 0, 'postgres');
      expect(result).toContain('LIMIT 10');
    });
  });

  describe('getDefaultPort', () => {
    it('should return 1433 for mssql', () => {
      const result = service['getDefaultPort']('mssql');
      expect(result).toBe(1433);
    });

    it('should return 5432 for postgres', () => {
      const result = service['getDefaultPort']('postgres');
      expect(result).toBe(5432);
    });

    it('should return 3306 for mysql', () => {
      const result = service['getDefaultPort']('mysql');
      expect(result).toBe(3306);
    });

    it('should return 3306 for mariadb', () => {
      const result = service['getDefaultPort']('mariadb');
      expect(result).toBe(3306);
    });

    it('should return 1521 for oracle', () => {
      const result = service['getDefaultPort']('oracle');
      expect(result).toBe(1521);
    });

    it('should return 27017 for mongodb', () => {
      const result = service['getDefaultPort']('mongodb');
      expect(result).toBe(27017);
    });

    it('should return 1433 for unknown database type', () => {
      const result = service['getDefaultPort']('unknown');
      expect(result).toBe(1433);
    });
  });

  describe('buildIntelligentGroupByClause', () => {
    it('should return empty string when no aggregations present', () => {
      const fields = [
        {
          fieldName: 'id',
          tableName: 'Users',
          alias: 'user_id',
        },
      ];

      const result = service['buildIntelligentGroupByClause'](fields);
      expect(result).toBe('');
    });

    it('should build GROUP BY for non-aggregated fields when aggregations exist', () => {
      const fields = [
        {
          fieldName: 'category',
          tableName: 'Products',
          alias: 'category',
        },
        {
          fieldName: 'price',
          tableName: 'Products',
          alias: 'avg_price',
          aggregation: AggregationType.AVG,
        },
      ];

      const result = service['buildIntelligentGroupByClause'](fields);
      expect(result).toContain('GROUP BY');
      expect(result).toContain('[Products].[category]');
    });

    it('should not include aggregated fields in GROUP BY', () => {
      const fields = [
        {
          fieldName: 'amount',
          tableName: 'Orders',
          alias: 'total',
          aggregation: AggregationType.SUM,
        },
      ];

      const result = service['buildIntelligentGroupByClause'](fields);
      expect(result).toBe('');
    });

    it('should avoid duplicate fields in GROUP BY', () => {
      const fields = [
        {
          fieldName: 'category',
          tableName: 'Products',
          alias: 'cat1'

        },
        {
          fieldName: 'category',
          tableName: 'Products',
          alias: 'cat2',
        },
        {
          fieldName: 'price',
          tableName: 'Products',
          alias: 'total_price',
          aggregation: AggregationType.SUM,
        },
      ];

      const result = service['buildIntelligentGroupByClause'](fields);
      const categoryCount = (result.match(/\[category\]/g) || []).length;
      expect(categoryCount).toBe(1);
    });
  });

  describe('hasValidOrderByFields', () => {
    it('should return true for valid order by fields', () => {
      const orderBy = [
        {
          field: {
            tableName: 'Users',
            fieldName: 'createdAt',
          },
        },
      ];

      const result = service['hasValidOrderByFields'](orderBy);
      expect(result).toBe(true);
    });

    it('should return false for invalid order by fields', () => {
      const orderBy = [
        {
          field: {},
        },
      ];

      const result = service['hasValidOrderByFields'](orderBy);
      expect(result).toBe(false);
    });
  });
});
