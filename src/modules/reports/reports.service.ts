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
    console.log('🗂️  Selected Fields Sample:', JSON.stringify(reportDefinition?.selectedFields?.slice(0, 2), null, 2));
    
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
      fields: (reportDefinition.selectedFields || []).map((field: any) => {
        const original = `${field.tableName}.${field.fieldName}`;
        const correctNames = fieldMapper(field.tableName, field.fieldName);
        const mapped = `${correctNames.schemaName}.${correctNames.tableName}.${correctNames.fieldName}`;
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
      tables: this.extractTablesFromFields(reportDefinition.selectedFields || []).map(t => {
        const mapped = fieldMapper(t, '');
        return mapped.schemaName ? `${mapped.schemaName}.${mapped.tableName}` : mapped.tableName;
      }),
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
      groupBy: (reportDefinition.groupBy || []).map((group: any) => ({
        field: group
      })),
      orderBy: (reportDefinition.sorting || []).map((sort: any) => ({
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

      // Get total count (without limit) for pagination info
      const countQuery = await this.buildCountQuery(queryConfig, databaseType);
      const countResult = await this.queryBuilderService.executeQuery(
        reportDefinition.dataSource.id,
        countQuery
      );
      const totalRows = countResult[0]?.total || data.length;

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
      ? report.queryConfig.fields.map((f: any) => ({
          id: f.id || `${f.tableName}.${f.fieldName}`,
          tableName: f.tableName,
          fieldName: f.fieldName,
          displayName: f.alias || f.displayName || f.fieldName,
          dataType: f.dataType,
          aggregation: f.aggregation,
          formatting: f.formatting
        }))
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
                formatting: fl.field.formatting
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
          displayName: g.field?.alias || g.field?.fieldName
        }))
      : [];

    const sorting = Array.isArray(query.orderBy)
      ? query.orderBy.map((o: any) => ({
          id: (o.field && (o.field.id || `${o.field.tableName}.${o.field.fieldName}`)) || '',
          tableName: o.field?.tableName,
          fieldName: o.field?.fieldName,
          displayName: o.field?.alias || o.field?.fieldName,
          direction: o.direction === 'desc' ? 'desc' : 'asc'
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
}