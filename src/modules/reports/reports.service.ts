import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateReportDto } from "src/dto/create-report.dto";
import { ReportResult } from "src/types/report-result.type";
import { DeepPartial, In, Repository } from "typeorm";
import { QueryBuilderService } from "../query-builder/query-builder.service";
import { ReportGeneratorService } from "../report-generator/report-generator.service";
import { Report } from "src/entities/report.entity";
import { User } from "src/entities/user.entity";
import { UserService } from "../users/user.service";
import * as XLSX from 'xlsx';
import { ReportParameter } from "src/entities/report-parameter.entity";
import { ReportSchedule } from "src/entities/report-schedule.entity";

/**
 * Service for managing reports and report execution.
 * 
 * This service provides comprehensive functionality for:
 * - CRUD operations on reports (create, read, update, delete)
 * - Executing saved reports with parameters
 * - Previewing reports without saving
 * - Exporting reports to Excel format
 * - Managing report lifecycle (archive, publish, unpublish)
 * - Retrieving report parameters and schedules
 * - Mapping database schemas to field names
 * - Converting report definitions to query configurations
 * 
 * The service integrates with QueryBuilderService for SQL generation,
 * ReportGeneratorService for format conversion, and handles complex
 * field mapping between normalized names and actual database schema names.
 * 
 * @class ReportsService
 */
@Injectable()
export class ReportsService {
  /**
   * Creates an instance of ReportsService.
   * 
   * @param {Repository<Report>} reportRepository - TypeORM repository for Report entities
   * @param {UserService} userService - Service for user management
   * @param {QueryBuilderService} queryBuilderService - Service for building SQL queries
   * @param {ReportGeneratorService} reportGeneratorService - Service for generating reports in various formats
   */
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly userService: UserService,
    private queryBuilderService: QueryBuilderService,
    private reportGeneratorService: ReportGeneratorService,
  ) {}

//   async create(createReportDto: CreateReportDto, userId: string): Promise<Report> {
//     const report = this.reportRepository.create({
//       ...createReportDto,
//       createdBy: { id: userId },
//       queryConfig: { ...createReportDto.queryConfig },
//       layoutConfig: { ...createReportDto.layoutConfig }
//     });
//     return this.reportRepository.save(report);
//   }

  /**
   * Executes a saved report and generates output in the specified format.
   * 
   * Loads a report by ID, builds and executes its query with provided parameters,
   * then generates the report output in the requested format (HTML, PDF, or Excel).
   * 
   * @param {string} reportId - The UUID of the report to execute
   * @param {Record<string, any>} parameters - Parameters to substitute in the report query
   * @param {'html' | 'pdf' | 'excel'} [format='html'] - Output format for the generated report
   * @returns {Promise<ReportResult>} Generated report result with content, MIME type, and filename
   * @throws {Error} If the report is not found
   * @throws {Error} If query execution fails
   * @throws {Error} If report generation fails
   * 
   * @example
   * const result = await reportsService.executeReport(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   { startDate: '2024-01-01', endDate: '2024-12-31' },
   *   'pdf'
   * );
   */
  async executeReport(
    reportId: string, 
    parameters: Record<string, any>,
    format: 'html' | 'pdf' | 'excel' = 'html'
  ): Promise<ReportResult> {
    const report = await this.reportRepository.findOneBy({id:reportId});
    // Exit if not found 
    if(!report) {
      throw new Error(`Report with ID ${reportId} not found.`);
    }
    
    // Build and execute query
    const query = await this.queryBuilderService.buildQuery(
      report.queryConfig, 
      parameters
    );
    const data = await this.queryBuilderService.executeQuery(
      report.dataSource.id, 
      query
    );

    // Generate report in requested format
    return await this.reportGeneratorService.generate(
      report.layoutConfig,
      data,
      format
    );
  }

  /**
   * Retrieves all reports from the database.
   * 
   * Fetches all reports with their related entities (dataSource, parameters,
   * schedules, createdBy) and maps them to client-friendly format.
   * 
   * @returns {Promise<Report[]>} Array of all reports in client-friendly format
   * 
   * @remarks
   * - Includes related entities: dataSource, parameters, schedules, createdBy
   * - Maps reports to client format using mapToClientReport
   * - Returns empty array if no reports exist
   */
  async getReports(): Promise<Report[]> {
    const reports = await this.reportRepository.find({
      relations: ['dataSource', 'parameters', 'schedules', 'createdBy']
    });
    return reports.map(r => this.mapToClientReport(r) as unknown as Report);
  }

  /**
   * Retrieves a single report by its unique identifier.
   * 
   * Fetches a report with all related entities and maps it to client-friendly format.
   * Returns null if the report is not found.
   * 
   * @param {string} id - The UUID of the report to retrieve
   * @returns {Promise<Report|null>} The report in client-friendly format, or null if not found
   * 
   * @remarks
   * - Includes related entities: dataSource, parameters, schedules, createdBy
   * - Maps report to client format using mapToClientReport
   * - Returns null instead of throwing error if report not found
   */
  async getReport(id: string): Promise<Report|null> {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['dataSource', 'parameters', 'schedules', 'createdBy']
    });
    if (!report) return null;
    return this.mapToClientReport(report) as unknown as Report;
  }

  /**
   * Creates a new report in the database.
   * 
   * Saves a new report entity, handling layoutConfig serialization if it's
   * provided as a string. Automatically parses JSON strings to objects.
   * 
   * @param {Report} report - The report entity to create
   * @returns {Promise<Report>} The created report entity with generated ID and timestamps
   * 
   * @remarks
   * - Automatically handles layoutConfig as string or object
   * - Parses JSON strings to objects for TypeORM serialization
   * - Logs errors if JSON parsing fails but continues with original value
   * 
   * @example
   * const newReport = await reportsService.createReport({
   *   name: 'Sales Report',
   *   queryConfig: { fields: [...], tables: [...] },
   *   layoutConfig: { columns: [...] },
   *   dataSource: { id: 'ds-123' }
   * });
   */
  async createReport(report: Report): Promise<Report> {
    // Ensure layoutConfig is properly set
    if (report.layoutConfig) {
      // If layoutConfig is already an object, it will be automatically serialized by TypeORM
      // If it's a string, we need to parse it
      if (typeof report.layoutConfig === 'string') {
        try {
          report.layoutConfig = JSON.parse(report.layoutConfig);
        } catch (error) {
          console.error('Failed to parse layoutConfig:', error);
        }
      }
    }
    
    // Handle dataSource relationship - support both dataSourceId (from DTO) and dataSource object
    const reportAny = report as any;
    if (reportAny.dataSourceId) {
      // DTO format: dataSourceId is a string UUID
      report.dataSource = { id: reportAny.dataSourceId } as any;
    } else if (report.dataSource && typeof report.dataSource === 'object' && 'id' in report.dataSource) {
      // Legacy format: dataSource is an object with id
      const dataSourceId = (report.dataSource as any).id;
      report.dataSource = { id: dataSourceId } as any;
    }
    
    return this.reportRepository.save(report);
  }

  /**
   * Updates an existing report in the database.
   * 
   * Updates a report entity by ID, handling layoutConfig serialization if it's
   * provided as a string. Automatically parses JSON strings to objects.
   * 
   * @param {string} id - The UUID of the report to update
   * @param {Report} report - The report entity with updated properties
   * @returns {Promise<Report>} The updated report entity
   * 
   * @remarks
   * - Automatically handles layoutConfig as string or object
   * - Parses JSON strings to objects for TypeORM serialization
   * - Logs errors if JSON parsing fails but continues with original value
   * - Note: This method saves the entire report entity, not just changed fields
   */
  async updateReport(id: string, report: Report): Promise<Report> {
    // Set the report ID for the update
    report.id = id;
    
    // Ensure layoutConfig is properly set
    if (report.layoutConfig) {
      // If layoutConfig is already an object, it will be automatically serialized by TypeORM
      // If it's a string, we need to parse it
      if (typeof report.layoutConfig === 'string') {
        try {
          report.layoutConfig = JSON.parse(report.layoutConfig);
        } catch (error) {
          console.error('Failed to parse layoutConfig:', error);
        }
      }
    }
    
    // Handle dataSource relationship - support both dataSourceId (from DTO) and dataSource object
    const reportAny = report as any;
    if (reportAny.dataSourceId) {
      // DTO format: dataSourceId is a string UUID
      report.dataSource = { id: reportAny.dataSourceId } as any;
    } else if (report.dataSource && typeof report.dataSource === 'object' && 'id' in report.dataSource) {
      // Legacy format: dataSource is an object with id
      const dataSourceId = (report.dataSource as any).id;
      report.dataSource = { id: dataSourceId } as any;
    }
    
    return this.reportRepository.save(report);
  }

  /**
   * Deletes a report from the database.
   * 
   * Permanently removes a report by its unique identifier. This operation
   * cannot be undone.
   * 
   * @param {string} id - The UUID of the report to delete
   * @returns {Promise<void>}
   * 
   * @remarks
   * - Does not throw error if report doesn't exist (TypeORM behavior)
   * - Consider implementing soft delete with isArchived flag instead
   */
  async deleteReport(id: string): Promise<void> {
    await this.reportRepository.delete(id);
  }

  /**
   * Previews a report without saving it to the database.
   * 
   * This method executes a report query based on a report definition object,
   * which can be a draft report configuration. It handles field mapping from
   * normalized names to actual database schema names, builds and executes the
   * query, and returns preview data with execution metrics.
   * 
   * @param {any} reportDefinition - Report definition object with dataSource, selectedFields, filters, etc.
   * @returns {Promise<any>} Preview result containing data, totalRows, executionTime, and generated query
   * @throws {Error} If report definition is invalid or missing required fields
   * @throws {Error} If data source is invalid or missing
   * @throws {Error} If no fields are selected
   * @throws {Error} If query execution fails
   * 
   * @remarks
   * - Validates report definition structure before processing
   * - Maps field names using database schema information
   * - Supports schema-qualified table and field names
   * - Limits results to 100 rows by default (configurable via limit property)
   * - Executes count query separately for total row count
   * - Includes extensive logging for debugging
   * - Returns generated SQL query for debugging purposes
   * 
   * @example
   * const preview = await reportsService.previewReport({
   *   name: 'Sales Report',
   *   dataSource: { id: 'ds-123', schema: {...} },
   *   selectedFields: [
   *     { tableName: 'Customers', fieldName: 'CustomerID', displayName: 'Customer ID' },
   *     { tableName: 'Orders', fieldName: 'OrderDate', displayName: 'Order Date' }
   *   ],
   *   filters: [
   *     { field: { tableName: 'Orders', fieldName: 'OrderDate' }, operator: '>=', value: '2024-01-01' }
   *   ],
   *   limit: 50
   * });
   */
  async previewReport(reportDefinition: any): Promise<any> {
    console.log('🚀 ==== PREVIEW REPORT START ====');
    console.log('📝 Report Definition Keys:', Object.keys(reportDefinition || {}));
    console.log('📊 Data Source Keys:', Object.keys(reportDefinition?.dataSource || {}));
    console.log('🗂️  ALL Selected Fields Received:', JSON.stringify(reportDefinition?.selectedFields, null, 2));
    
    // Validation
    if (!reportDefinition) {
      throw new Error('Report definition is required');
    }
    
    if (!reportDefinition.dataSource || !reportDefinition.dataSource.id) {
      throw new Error('Report must have a valid data source');
    }
    
    if (!reportDefinition.selectedFields || reportDefinition.selectedFields.length === 0) {
      throw new Error('Report must have at least one selected field');
    }

    console.log('Preview request received:', {
      dataSourceId: reportDefinition.dataSource?.id,
      fieldsCount: reportDefinition.selectedFields?.length,
      filtersCount: reportDefinition.filters?.length
    });

    const limit = reportDefinition.limit || 100;
    
    // Get the actual database schema to map field names correctly
    const schema = reportDefinition.dataSource?.schema;
    console.log('⚠️  Schema available:', !!schema, 'Tables:', schema?.tables?.length);
    if (!schema || !schema.tables || schema.tables.length === 0) {
      console.error('❌ NO SCHEMA AVAILABLE! Cannot map field names.');
    } else {
      console.log('✅ Schema tables:', schema.tables.map((t: any) => t.name).slice(0, 5));
    }
    const fieldMapper = this.createFieldMapper(schema);
    
    // Convert report definition to QueryConfiguration with correct database names
    const queryConfig = {
      fields: (reportDefinition.selectedFields || []).map((field: any, index: number) => {
        console.log(`🔧 Processing field:`, JSON.stringify(field, null, 2));
        
        // Handle DTO format (name, alias, type) - parse the name field
        if (field.name && !field.tableName) {
          const parsed = this.parseQualifiedFieldName(field.name);
          field.tableName = parsed.tableName;
          field.fieldName = parsed.fieldName;
          field.schema = parsed.schema;
          field.displayName = field.alias || field.displayName;
          field.dataType = field.type || field.dataType;
        }
        
        // Validate field has required properties
        if (!field.tableName || field.tableName === 'undefined') {
          throw new Error(`Field at index ${index} has invalid tableName: "${field.tableName}". Please check the field configuration.`);
        }
        if (!field.fieldName || field.fieldName === 'undefined') {
          throw new Error(`Field at index ${index} has invalid fieldName: "${field.fieldName}". Please check the field configuration.`);
        }
        
        // If field already has a schema, use it directly without remapping
        if (field.schema) {
          console.log(`✅ Field already has schema: ${field.schema}.${field.tableName}.${field.fieldName}`);
          
          // Double-check schema is not undefined
          if (field.schema === 'undefined') {
            console.warn(`⚠️  Field has schema set to "undefined", will use field mapper instead`);
            // Fall through to mapper logic below
          } else {
            return {
              schemaName: field.schema,
              tableName: field.tableName,
              fieldName: field.fieldName,
              alias: field.displayName || field.fieldName,
              dataType: field.dataType,
              aggregation: field.aggregation,
              formatting: field.formatting
            };
          }
        }
        
        // Otherwise, use the field mapper to look it up
        const original = `${field.tableName}.${field.fieldName}`;
        const correctNames = fieldMapper(field.tableName, field.fieldName);
        const mapped = `${correctNames.schemaName}.${correctNames.tableName}.${correctNames.fieldName}`;
        
        console.log(`🔧 Field mapping result (no schema in field):`, {
          original,
          mapped,
          mappedSchema: correctNames.schemaName
        });
        
        if (original !== mapped.replace(`${correctNames.schemaName}.`, '')) {
          console.log(`✨ Field mapping: ${original} → ${mapped}`);
        }
        
        return {
          schemaName: correctNames.schemaName,
          tableName: correctNames.tableName,
          fieldName: correctNames.fieldName,
          alias: field.displayName || field.fieldName,
          dataType: field.dataType,
          aggregation: field.aggregation,
          formatting: field.formatting
        };
      }),
      tables: this.extractTablesWithSchemaFromFields(reportDefinition.selectedFields || [], fieldMapper),
      filters: (reportDefinition.filters || []).map((filter: any) => {
        // Handle DTO format where field is a string (fully qualified name)
        let filterField = filter.field;
        if (typeof filter.field === 'string') {
          const parsed = this.parseQualifiedFieldName(filter.field);
          filterField = {
            tableName: parsed.tableName,
            fieldName: parsed.fieldName,
            schema: parsed.schema
          };
        }
        
        const correctNames = fieldMapper(filterField.tableName, filterField.fieldName);
        return {
          field: {
            ...filterField,
            schemaName: correctNames.schemaName,
            tableName: correctNames.tableName,
            fieldName: correctNames.fieldName
          },
          operator: filter.operator,
          value: filter.value,
          logicalOperator: filter.logicalOperator || 'AND'
        };
      }),
      groupBy: (reportDefinition.groupBy || [])
        .filter((group: any) => group && group.fieldName && group.tableName) // Filter out empty/invalid entries
        .map((group: any) => ({
          field: group
        })),
      orderBy: (reportDefinition.sorting || [])
        .filter((sort: any) => sort && sort.fieldName && sort.tableName) // Filter out empty/invalid entries
        .map((sort: any) => ({
          field: sort,
          direction: sort.direction || 'asc',
          priority: sort.priority || 0
        })),
      limit: limit,
      offset: 0
    };

    console.log('Query config:', JSON.stringify(queryConfig, null, 2));

    try {
      // Get database type from data source
      const databaseType = this.mapDatabaseType(reportDefinition.dataSource.type);
      
      // Build and execute query
      const startTime = Date.now();
      const query = await this.queryBuilderService.buildQuery(queryConfig, {}, databaseType);
      console.log('Generated SQL:', query);
      
      const data = await this.queryBuilderService.executeQuery(
        reportDefinition.dataSource.id,
        query
      );
      const executionTime = Date.now() - startTime;

      console.log('📤 Query result - rows returned:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📋 First row keys:', Object.keys(data[0]));
        console.log('📋 First row sample:', JSON.stringify(data[0]));
      } else {
        console.log('⚠️  NO DATA RETURNED FROM QUERY!');
      }

      // Get total count (without limit) for pagination info
      const countQuery = await this.buildCountQuery(queryConfig, databaseType);
      const countResult = await this.queryBuilderService.executeQuery(
        reportDefinition.dataSource.id,
        countQuery
      );
      const totalRows = countResult[0]?.total || data.length;

      console.log('📊 Response being sent:', { dataRows: data?.length, totalRows, executionTime });

      return {
        data,
        totalRows,
        executionTime,
        query // Include query for debugging
      };
    } catch (error) {
      console.error('Preview error:', error);
      throw error;
    }
  }

  /**
   * Parses a fully qualified field name into its components.
   * Handles formats: "schema.tableName.fieldName" or "tableName.fieldName"
   * 
   * @private
   * @param {string} qualifiedName - Fully qualified field name
   * @returns {{ schema?: string; tableName: string; fieldName: string }} Parsed components
   */
  private parseQualifiedFieldName(qualifiedName: string): { schema?: string; tableName: string; fieldName: string } {
    const parts = qualifiedName.split('.');
    if (parts.length === 3) {
      // Format: schema.tableName.fieldName
      return {
        schema: parts[0],
        tableName: parts[1],
        fieldName: parts[2]
      };
    } else if (parts.length === 2) {
      // Format: tableName.fieldName
      return {
        tableName: parts[0],
        fieldName: parts[1]
      };
    } else {
      // Invalid format, return as-is
      console.warn(`⚠️  Invalid qualified field name format: ${qualifiedName}`);
      return {
        tableName: qualifiedName,
        fieldName: qualifiedName
      };
    }
  }

  /**
   * Extracts unique table names from an array of field configurations.
   * 
   * @private
   * @param {any[]} fields - Array of field configuration objects
   * @returns {string[]} Array of unique table names
   * 
   * @deprecated This method is kept for backward compatibility but is superseded by extractTablesWithSchemaFromFields
   */
  private extractTablesFromFields(fields: any[]): string[] {
    const tables = new Set<string>();
    fields.forEach(field => {
      if (field.tableName) {
        tables.add(field.tableName);
      }
    });
    return Array.from(tables);
  }

  /**
   * Extracts unique tables with their schemas from field configurations.
   * 
   * Builds schema-qualified table names (e.g., 'dbo.Customers') by prioritizing
   * schema information from field.schema property, falling back to fieldMapper
   * if schema is not available in the field.
   * 
   * @private
   * @param {any[]} fields - Array of field configuration objects
   * @param {(tableName: string, fieldName: string) => { schemaName?: string; tableName: string; fieldName: string }} fieldMapper - Function to map table/field names to schema-qualified names
   * @returns {string[]} Array of schema-qualified table names (e.g., ['dbo.Customers', 'dbo.Orders'])
   * 
   * @remarks
   * - Prioritizes field.schema if available
   * - Uses fieldMapper as fallback for tables without explicit schema
   * - Defaults to 'dbo' schema if mapper doesn't provide schema
   * - Returns fully-qualified names in format 'schema.table'
   */
  private extractTablesWithSchemaFromFields(
    fields: any[], 
    fieldMapper: (tableName: string, fieldName: string) => { schemaName?: string; tableName: string; fieldName: string }
  ): string[] {
    const tableSchemaMap = new Map<string, string>();
    
    fields.forEach(field => {
      if (!field.tableName) return;
      
      const tableName = field.tableName;
      
      // If this field has a schema, use it
      if (field.schema) {
        console.log(`📍 Table ${tableName} using schema from field: ${field.schema}`);
        tableSchemaMap.set(tableName, field.schema);
      } 
      // If we haven't seen this table yet, use fieldMapper as fallback
      else if (!tableSchemaMap.has(tableName)) {
        const mapped = fieldMapper(tableName, '');
        const schemaName = mapped.schemaName || 'dbo';
        console.log(`📍 Table ${tableName} using schema from fieldMapper: ${schemaName}`);
        tableSchemaMap.set(tableName, schemaName);
      }
    });
    
    // Return fully-qualified table names
    return Array.from(tableSchemaMap.entries()).map(([table, schema]) => {
      const qualified = `${schema}.${table}`;
      console.log(`📍 Final table reference: ${qualified}`);
      return qualified;
    });
  }

  /**
   * Builds a COUNT(*) query based on a query configuration.
   * 
   * Creates a query that counts total rows matching the same filters and joins
   * as the main query, but without limit/offset for accurate pagination totals.
   * 
   * @private
   * @param {any} config - Query configuration object
   * @param {string} [databaseType='mssql'] - Database type for syntax-specific handling
   * @returns {Promise<string>} SQL COUNT query string
   * 
   * @remarks
   * - Uses same filters and joins as main query
   * - Removes orderBy, limit, and offset clauses
   * - Returns COUNT(*) as 'total' alias
   * - Used for pagination total count calculation
   */
  private async buildCountQuery(config: any, databaseType: string = 'mssql'): Promise<string> {
    // Build a COUNT(*) query with the same filters and joins
    const countConfig = {
      ...config,
      fields: [{
        tableName: config.tables[0],
        fieldName: '*',
        alias: 'total',
        dataType: 'integer',
        aggregation: 'COUNT'
      }],
      orderBy: [],
      limit: undefined,
      offset: undefined
    };
    return this.queryBuilderService.buildQuery(countConfig, {}, databaseType);
  }

  /**
   * Maps database type names to query builder compatible types.
   * 
   * Converts user-friendly database type names to the format expected
   * by the query builder service.
   * 
   * @private
   * @param {string} type - Database type name (e.g., 'sqlserver', 'postgresql')
   * @returns {string} Mapped database type (defaults to 'mssql' if unknown)
   * 
   * @remarks
   * - Case-insensitive matching
   * - Supports multiple aliases for same database type
   * - Defaults to 'mssql' for unknown types
   */
  private mapDatabaseType(type: string): string {
    const typeMap: Record<string, string> = {
      'sqlserver': 'mssql',
      'mssql': 'mssql',
      'postgresql': 'postgres',
      'postgres': 'postgres',
      'mysql': 'mysql',
      'mariadb': 'mariadb',
    };
    return typeMap[type.toLowerCase()] || 'mssql';
  }

  /**
   * Creates a field mapper function that maps normalized names to actual database names.
   * 
   * Builds a lookup function that converts normalized table/field names (as used in the UI)
   * to actual database schema-qualified names based on the database schema information.
   * This handles case-insensitive matching and schema qualification.
   * 
   * @private
   * @param {any} schema - Database schema object with tables and columns
   * @returns {(tableName: string, fieldName: string) => { schemaName?: string; tableName: string; fieldName: string }} Field mapper function
   * 
   * @remarks
   * - Returns identity function if schema is not available
   * - Performs case-insensitive table and column name matching
   * - Returns schema-qualified names (schema.table.column)
   * - Defaults to 'dbo' schema if not specified in schema
   * - Logs warnings for unmapped tables/columns
   * - Includes extensive logging for debugging field mapping
   * 
   * @example
   * const mapper = createFieldMapper(schema);
   * const mapped = mapper('customers', 'customerid');
   * // Returns: { schemaName: 'dbo', tableName: 'Customers', fieldName: 'CustomerID' }
   */
  private createFieldMapper(schema: any): (tableName: string, fieldName: string) => { schemaName?: string; tableName: string; fieldName: string } {
    if (!schema || !schema.tables) {
      // No schema available, return names as-is
      console.warn('⚠️  No schema available for field mapping');
      return (tableName, fieldName) => ({ tableName, fieldName });
    }

    // Build a lookup map for quick access
    const tableMap = new Map<string, any>();
    schema.tables.forEach((table: any) => {
      // Store by both original name and lowercase name for flexible matching
      const lowerName = table.name.toLowerCase();
      tableMap.set(lowerName, table);
      tableMap.set(table.name, table);
    });

    console.log(`✅ Field mapper created with ${tableMap.size / 2} tables:`, Array.from(new Set(schema.tables.map((t: any) => `${t.schema || 'dbo'}.${t.name}`))));
    
    // Log first table's columns for debugging
    if (schema.tables.length > 0) {
      const firstTable = schema.tables[0];
      console.log(`📋 Sample table:`, `${firstTable.schema || 'dbo'}.${firstTable.name}`, 'with columns:', firstTable.columns?.slice(0, 5).map((c: any) => c.name));
    }

    return (tableName: string, fieldName: string) => {
      const lowerTableName = tableName.toLowerCase();
      const table = tableMap.get(lowerTableName);
      
      if (!table) {
        // Table not found in schema, return as-is
        console.error(`❌ Table '${tableName}' not found in schema. Available tables:`, Array.from(new Set(Array.from(tableMap.keys()).filter(k => k === k.toLowerCase()))));
        return { tableName, fieldName };
      }

      // Get the correct table name and schema
      const correctTableName = table.name;
      const correctSchemaName = table.schema || 'dbo'; // Default to 'dbo' if not specified

      if (!fieldName) {
        // Just mapping table name
        return { schemaName: correctSchemaName, tableName: correctTableName, fieldName };
      }

      // Find the column with matching name (case-insensitive)
      const lowerFieldName = fieldName.toLowerCase();
      const column = table.columns?.find((col: any) => 
        col.name.toLowerCase() === lowerFieldName
      );

      if (!column) {
        console.error(`❌ Column '${fieldName}' (looking for lowercase: '${lowerFieldName}') not found in table '${correctSchemaName}.${correctTableName}'.`);
        console.error(`   Available columns:`, table.columns?.map((c: any) => `${c.name} (lowercase: ${c.name.toLowerCase()})`).slice(0, 10));
        return { schemaName: correctSchemaName, tableName: correctTableName, fieldName };
      }

      // Return the correct database names with schema
      const result = {
        schemaName: correctSchemaName,
        tableName: correctTableName,
        fieldName: column.name
      };
      
      console.log(`🔄 Mapped: ${tableName}.${fieldName} → ${result.schemaName}.${result.tableName}.${result.fieldName}`);
      return result;
    };
  }

  /**
   * Archives a report by setting its isArchived flag to true.
   * 
   * Archived reports are typically hidden from normal views but retained
   * for historical purposes. This is a soft delete operation.
   * 
   * @param {string} id - The UUID of the report to archive
   * @returns {Promise<void>}
   * @throws {Error} If the report is not found
   * 
   * @example
   * await reportsService.archiveReport('123e4567-e89b-12d3-a456-426614174000');
   */
  async archiveReport(id: string): Promise<void> {
    const report = await this.reportRepository.findOneBy({id:id});
    if(!report) {
      throw new Error(`Report with ID ${id} not found.`);
    }
    report.isArchived = true;
    await this.reportRepository.save(report);
  }

  /**
   * Unarchives a report by setting its isArchived flag to false.
   * 
   * Restores an archived report to active status, making it visible
   * in normal report listings again.
   * 
   * @param {string} id - The UUID of the report to unarchive
   * @returns {Promise<void>}
   * @throws {Error} If the report is not found
   * 
   * @example
   * await reportsService.unarchiveReport('123e4567-e89b-12d3-a456-426614174000');
   */
  async unarchiveReport(id: string): Promise<void> {
    const report = await this.reportRepository.findOneBy({id:id});
    if(!report) {
      throw new Error(`Report with ID ${id} not found.`);
    }
    report.isArchived = false;
    await this.reportRepository.save(report);
  }

  /**
   * Publishes a report by setting its isPublic flag to true.
   * 
   * Published reports are made available to all users (depending on
   * authorization rules). This makes the report visible in public listings.
   * 
   * @param {string} id - The UUID of the report to publish
   * @returns {Promise<void>}
   * @throws {Error} If the report is not found
   * 
   * @example
   * await reportsService.publishReport('123e4567-e89b-12d3-a456-426614174000');
   */
  async publishReport(id: string): Promise<void> {
    const report = await this.reportRepository.findOneBy({id:id});
    if(!report) {
      throw new Error(`Report with ID ${id} not found.`);
    }
    report.isPublic = true;
    await this.reportRepository.save(report);
  }

  /**
   * Unpublishes a report by setting its isPublic flag to false.
   * 
   * Makes a published report private again, removing it from public
   * listings and restricting access to authorized users only.
   * 
   * @param {string} id - The UUID of the report to unpublish
   * @returns {Promise<void>}
   * @throws {Error} If the report is not found
   * 
   * @example
   * await reportsService.unpublishReport('123e4567-e89b-12d3-a456-426614174000');
   */
  async unpublishReport(id: string): Promise<void> {
    const report = await this.reportRepository.findOneBy({id:id});
    if(!report) {
      throw new Error(`Report with ID ${id} not found.`);
    }
    report.isPublic = false;
    await this.reportRepository.save(report);
  }

  /**
   * Retrieves all parameters associated with a report.
   * 
   * Fetches the report and returns its parameters, which define the
   * input values that can be provided when executing the report.
   * 
   * @param {string} id - The UUID of the report
   * @returns {Promise<ReportParameter[]>} Array of report parameters
   * @throws {Error} If the report is not found
   * 
   * @example
   * const parameters = await reportsService.getReportParameters('123e4567-e89b-12d3-a456-426614174000');
   * // Returns: [{ name: 'startDate', type: 'date', required: true }, ...]
   */
  async getReportParameters(id: string): Promise<ReportParameter[]> {
    const report = await this.reportRepository.findOneBy({id:id});
    if(!report) {
      throw new Error(`Report with ID ${id} not found.`);
    }
    return report.parameters;
  }

  /**
   * Retrieves all schedules associated with a report.
   * 
   * Fetches the report and returns its schedules, which define when
   * the report should be automatically executed and delivered.
   * 
   * @param {string} id - The UUID of the report
   * @returns {Promise<ReportSchedule[]>} Array of report schedules
   * @throws {Error} If the report is not found
   * 
   * @example
   * const schedules = await reportsService.getReportSchedules('123e4567-e89b-12d3-a456-426614174000');
   * // Returns: [{ cronExpression: '0 0 * * *', recipients: [...], format: 'pdf' }, ...]
   */
  async getReportSchedules(id: string): Promise<ReportSchedule[]> {
    const report = await this.reportRepository.findOneBy({id:id});
    if(!report) {
      throw new Error(`Report with ID ${id} not found.`);
    }
    return report.schedules;
  }

  /**
   * Maps a persisted report entity to an API-friendly structure for the web client.
   * 
   * Transforms the database report entity into a format expected by the frontend,
   * including flattening nested query configuration into top-level properties like
   * selectedFields, filters, groupBy, and sorting. Preserves schema information
   * throughout the mapping process.
   * 
   * @private
   * @param {Report} report - The report entity from the database
   * @returns {Record<string, any>} Client-friendly report object
   * 
   * @remarks
   * - Extracts fields from queryConfig.fields into selectedFields array
   * - Extracts filters from queryConfig.filters into filters array
   * - Extracts groupBy from queryConfig.groupBy into groupBy array
   * - Extracts orderBy from queryConfig.orderBy into sorting array
   * - Preserves schema information in all field mappings
   * - Handles both nested ({field: {...}}) and flat field structures
   * - Includes extensive logging for debugging mapping issues
   * - Maps displayName, alias, and other metadata appropriately
   */
  private mapToClientReport(report: Report): Record<string, any> {
    const query = report.queryConfig as any || {};
    const layout = report.layoutConfig as any || {};

    // Use the actual selectedFields column instead of extracting from query.fields
    const selectedFields = Array.isArray(report.queryConfig.fields)
      ? report.queryConfig.fields.map((f: any) => {
          // Handle DTO format (name, alias, type) - parse the name field
          let tableName = f.tableName;
          let fieldName = f.fieldName;
          let schema = f.schemaName || f.schema;
          
          if (f.name && !tableName) {
            // DTO format: parse the fully qualified name
            const parsed = this.parseQualifiedFieldName(f.name);
            tableName = parsed.tableName;
            fieldName = parsed.fieldName;
            schema = parsed.schema || schema;
          }
          
          if (schema) {
            console.log(`📤 Mapping field from DB with schema: ${schema}.${tableName}.${fieldName}`);
          } else {
            console.log(`⚠️  Mapping field from DB WITHOUT schema: ${tableName}.${fieldName}`);
          }
          
          return {
            id: f.id || `${tableName}.${fieldName}`,
            tableName: tableName,
            fieldName: fieldName,
            displayName: f.alias || f.displayName || fieldName,
            dataType: f.type || f.dataType,
            aggregation: f.aggregation,
            formatting: f.formatting,
            schema: schema // ✅ Preserve schema property!
          };
        })
      : [];

    const filters = Array.isArray(query.filters)
      ? query.filters.map((fl: any) => {
          // Handle DTO format where field is a string (fully qualified name)
          let fieldObj = fl.field;
          if (typeof fl.field === 'string') {
            const parsed = this.parseQualifiedFieldName(fl.field);
            fieldObj = {
              tableName: parsed.tableName,
              fieldName: parsed.fieldName,
              schema: parsed.schema
            };
          }
          
          return {
            id: fl.id,
            field: fieldObj
              ? {
                  id: fieldObj.id || `${fieldObj.tableName}.${fieldObj.fieldName}`,
                  tableName: fieldObj.tableName,
                  fieldName: fieldObj.fieldName,
                  displayName: fieldObj.alias || fieldObj.displayName || fieldObj.fieldName,
                  dataType: fieldObj.type || fieldObj.dataType,
                  aggregation: fieldObj.aggregation,
                  formatting: fieldObj.formatting,
                  schema: fieldObj.schema || fieldObj.schemaName // ✅ Preserve schema
                }
              : undefined,
            operator: fl.operator,
            value: fl.value,
            displayText: fl.displayText || ''
          };
        })
      : [];

    console.log('📦 Raw groupBy from DB:', JSON.stringify(query.groupBy, null, 2));
    console.log('🔀 Raw orderBy from DB:', JSON.stringify(query.orderBy, null, 2));

    const groupBy = Array.isArray(query.groupBy)
      ? query.groupBy.map((g: any) => {
          console.log('  Processing groupBy item:', g);
          
          // Handle both formats: {field: {...}} and {...} directly
          const fieldData = g.field || g;
          
          const mapped = {
            id: fieldData.id || (fieldData.tableName && fieldData.fieldName ? `${fieldData.tableName}.${fieldData.fieldName}` : ''),
            tableName: fieldData.tableName,
            fieldName: fieldData.fieldName,
            displayName: fieldData.displayName || fieldData.alias || fieldData.fieldName,
            schema: fieldData.schema || fieldData.schemaName
          };
          
          console.log('  Mapped groupBy:', mapped);
          return mapped;
        })
      : [];

    const sorting = Array.isArray(query.orderBy)
      ? query.orderBy.map((o: any) => {
          console.log('  Processing orderBy item:', o);
          
          // Handle both formats: {field: {...}, direction: ...} and {..., direction: ...} directly
          const fieldData = o.field || o;
          
          const mapped = {
            id: fieldData.id || (fieldData.tableName && fieldData.fieldName ? `${fieldData.tableName}.${fieldData.fieldName}` : ''),
            tableName: fieldData.tableName,
            fieldName: fieldData.fieldName,
            displayName: fieldData.displayName || fieldData.alias || fieldData.fieldName,
            direction: o.direction === 'desc' ? 'desc' : 'asc',
            schema: fieldData.schema || fieldData.schemaName
          };
          
          console.log('  Mapped orderBy:', mapped);
          return mapped;
        })
      : [];
    
    console.log('📦 Final groupBy:', JSON.stringify(groupBy, null, 2));
    console.log('🔀 Final sorting:', JSON.stringify(sorting, null, 2));

    return {
      ...report,
      dataSource: report.dataSource,
      layout,
      selectedFields,
      filters,
      groupBy,
      sorting
    };
  }

  /**
   * Exports report data to Excel format (.xlsx).
   * 
   * Generates an Excel workbook from a report definition, including headers
   * from selected fields and all data rows. Optimized for large datasets
   * with automatic column width calculation.
   * 
   * @param {any} reportDefinition - Report definition object with selectedFields and data
   * @returns {Promise<{ buffer: Buffer; filename: string }>} Excel file buffer and generated filename
   * 
   * @remarks
   * - Uses XLSX library for Excel file generation
   * - Automatically calculates column widths based on header and data
   * - Samples first 100 rows for width calculation (performance optimization)
   * - Limits column width to 50 characters maximum
   * - Generates timestamped filename with report name
   * - Sheet name limited to 31 characters (Excel limitation)
   * - Includes execution time logging
   * 
   * @example
   * const { buffer, filename } = await reportsService.exportToExcel({
   *   name: 'Sales Report',
   *   selectedFields: [
   *     { fieldName: 'customerName', displayName: 'Customer' },
   *     { fieldName: 'total', displayName: 'Total' }
   *   ],
   *   // ... other report definition properties
   * });
   * // Returns: { buffer: Buffer, filename: 'Sales Report_2024-01-15T10-30-00.xlsx' }
   */
  async exportToExcel(reportDefinition: any): Promise<{ buffer: Buffer; filename: string }> {
    console.log('📊 Starting Excel export for:', reportDefinition?.name);
    const startTime = Date.now();

    // Get the full dataset (up to 1 million rows)
    const result = await this.previewReport(reportDefinition);
    
    console.log(`📊 Retrieved ${result.data.length} rows for export`);

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    
    // Prepare headers from selected fields
    const headers = (reportDefinition.selectedFields || []).map((field: any) => 
      field.displayName || field.fieldName
    );
    
    // Prepare data rows
    const rows = result.data.map((row: any) => {
      return (reportDefinition.selectedFields || []).map((field: any) => {
        const key = field.displayName || field.fieldName;
        return row[key] ?? '';
      });
    });
    
    // Create worksheet from data
    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Auto-size columns
    const columnWidths = headers.map((header: string, index: number) => {
      const headerLength = header.length;
      const maxDataLength = Math.max(
        ...rows.map((row: any[]) => {
          const cellValue = String(row[index] || '');
          return cellValue.length;
        }).slice(0, 100) // Sample first 100 rows for performance
      );
      return { wch: Math.min(Math.max(headerLength, maxDataLength) + 2, 50) };
    });
    worksheet['!cols'] = columnWidths;
    
    // Add worksheet to workbook
    const sheetName = reportDefinition.name?.substring(0, 31) || 'Report'; // Excel sheet name limit
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    const exportTime = Date.now() - startTime;
    console.log(`✅ Excel export completed in ${exportTime}ms - ${result.data.length} rows, ${buffer.length} bytes`);
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `${reportDefinition.name || 'report'}_${timestamp}.xlsx`;
    
    return { buffer, filename };
  }
}