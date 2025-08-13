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

    
}