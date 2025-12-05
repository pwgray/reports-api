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

// modules/reports/reports.service.ts
@Injectable()
export class ReportsService {
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

  async getReports(): Promise<Report[]> {
    const reports = await this.reportRepository.find({
      relations: ['dataSource', 'parameters', 'schedules', 'createdBy']
    });
    return reports.map(r => this.mapToClientReport(r) as unknown as Report);
  }

  async getReport(id: string): Promise<Report|null> {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['dataSource', 'parameters', 'schedules', 'createdBy']
    });
    if (!report) return null;
    return this.mapToClientReport(report) as unknown as Report;
  }

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
    
    return this.reportRepository.save(report);
  }

  async updateReport(id: string, report: Report): Promise<Report> {
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
    
    return this.reportRepository.save(report);
  }

  async deleteReport(id: string): Promise<void> {
    await this.reportRepository.delete(id);
  }

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
        const correctNames = fieldMapper(filter.field.tableName, filter.field.fieldName);
        return {
          field: {
            ...filter.field,
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
   * Extract unique tables with their schemas from fields
   * Prioritizes schema from field.schema if available, otherwise uses fieldMapper
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
   * Create a field mapper function that maps normalized names to actual database names
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

  async archiveReport(id: string): Promise<void> {
    const report = await this.reportRepository.findOneBy({id:id});
    if(!report) {
      throw new Error(`Report with ID ${id} not found.`);
    }
    report.isArchived = true;
    await this.reportRepository.save(report);
  }

  async unarchiveReport(id: string): Promise<void> {
    const report = await this.reportRepository.findOneBy({id:id});
    if(!report) {
      throw new Error(`Report with ID ${id} not found.`);
    }
    report.isArchived = false;
    await this.reportRepository.save(report);
  }

  async publishReport(id: string): Promise<void> {
    const report = await this.reportRepository.findOneBy({id:id});
    if(!report) {
      throw new Error(`Report with ID ${id} not found.`);
    }
    report.isPublic = true;
    await this.reportRepository.save(report);
  }

  async unpublishReport(id: string): Promise<void> {
    const report = await this.reportRepository.findOneBy({id:id});
    if(!report) {
      throw new Error(`Report with ID ${id} not found.`);
    }
    report.isPublic = false;
    await this.reportRepository.save(report);
  }

  async getReportParameters(id: string): Promise<ReportParameter[]> {
    const report = await this.reportRepository.findOneBy({id:id});
    if(!report) {
      throw new Error(`Report with ID ${id} not found.`);
    }
    return report.parameters;
  }

  async getReportSchedules(id: string): Promise<ReportSchedule[]> {
    const report = await this.reportRepository.findOneBy({id:id});
    if(!report) {
      throw new Error(`Report with ID ${id} not found.`);
    }
    return report.schedules;
  }

  // Map persisted report entity to an API-friendly structure for the web client
  private mapToClientReport(report: Report): Record<string, any> {
    const query = report.queryConfig as any || {};
    const layout = report.layoutConfig as any || {};

    // Use the actual selectedFields column instead of extracting from query.fields
    const selectedFields = Array.isArray(report.queryConfig.fields)
      ? report.queryConfig.fields.map((f: any) => {
          const schema = f.schemaName || f.schema;
          if (schema) {
            console.log(`📤 Mapping field from DB with schema: ${schema}.${f.tableName}.${f.fieldName}`);
          } else {
            console.log(`⚠️  Mapping field from DB WITHOUT schema: ${f.tableName}.${f.fieldName}`);
          }
          return {
            id: f.id || `${f.tableName}.${f.fieldName}`,
            tableName: f.tableName,
            fieldName: f.fieldName,
            displayName: f.alias || f.displayName || f.fieldName,
            dataType: f.dataType,
            aggregation: f.aggregation,
            formatting: f.formatting,
            schema: schema // ✅ Preserve schema property!
          };
        })
      : [];

    const filters = Array.isArray(query.filters)
      ? query.filters.map((fl: any) => ({
          id: fl.id,
          field: fl.field
            ? {
                id: fl.field.id || `${fl.field.tableName}.${fl.field.fieldName}`,
                tableName: fl.field.tableName,
                fieldName: fl.field.fieldName,
                displayName: fl.field.alias || fl.field.fieldName,
                dataType: fl.field.dataType,
                aggregation: fl.field.aggregation,
                formatting: fl.field.formatting,
                schema: fl.field.schemaName || fl.field.schema // ✅ Preserve schema
              }
            : undefined,
          operator: fl.operator,
          value: fl.value,
          displayText: fl.displayText || ''
        }))
      : [];

    const groupBy = Array.isArray(query.groupBy)
      ? query.groupBy.map((g: any) => ({
          id: (g.field && (g.field.id || `${g.field.tableName}.${g.field.fieldName}`)) || '',
          tableName: g.field?.tableName,
          fieldName: g.field?.fieldName,
          displayName: g.field?.alias || g.field?.fieldName,
          schema: g.field?.schemaName || g.field?.schema // ✅ Preserve schema
        }))
      : [];

    const sorting = Array.isArray(query.orderBy)
      ? query.orderBy.map((o: any) => ({
          id: (o.field && (o.field.id || `${o.field.tableName}.${o.field.fieldName}`)) || '',
          tableName: o.field?.tableName,
          fieldName: o.field?.fieldName,
          displayName: o.field?.alias || o.field?.fieldName,
          direction: o.direction === 'desc' ? 'desc' : 'asc',
          schema: o.field?.schemaName || o.field?.schema // ✅ Preserve schema
        }))
      : [];

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
   * Export report data to Excel format
   * Optimized for large datasets
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