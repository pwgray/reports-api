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
    const limit = reportDefinition.limit || 100;
    
    // Convert report definition to QueryConfiguration
    const queryConfig = {
      fields: (reportDefinition.selectedFields || []).map((field: any) => ({
        tableName: field.tableName,
        fieldName: field.fieldName,
        alias: field.displayName || field.fieldName,
        dataType: field.dataType,
        aggregation: field.aggregation,
        formatting: field.formatting
      })),
      tables: this.extractTablesFromFields(reportDefinition.selectedFields || []),
      filters: (reportDefinition.filters || []).map((filter: any) => ({
        field: filter.field,
        operator: filter.operator,
        value: filter.value,
        logicalOperator: filter.logicalOperator || 'AND'
      })),
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

    // Build and execute query
    const startTime = Date.now();
    const query = await this.queryBuilderService.buildQuery(queryConfig, {});
    const data = await this.queryBuilderService.executeQuery(
      reportDefinition.dataSource.id,
      query
    );
    const executionTime = Date.now() - startTime;

    // Get total count (without limit) for pagination info
    const countQuery = await this.buildCountQuery(queryConfig);
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

  private async buildCountQuery(config: any): Promise<string> {
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
    return this.queryBuilderService.buildQuery(countConfig, {});
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