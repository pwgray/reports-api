import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportParameter } from 'src/entities/report-parameter.entity';

@Injectable()
export class ReportParameterService {
  constructor(
    @InjectRepository(ReportParameter)
    private readonly reportParameterRepository: Repository<ReportParameter>
  ) {}

  async findByReportId(reportId: string): Promise<ReportParameter[]> {
    return this.reportParameterRepository.find({
      where: { report: { id: reportId } },
    });
  }

  // Add other methods as needed
}
