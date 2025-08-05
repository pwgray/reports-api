import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportSchedule } from 'src/entities/report-schedule.entity';

@Injectable()
export class ReportScheduleService {
  constructor(
    @InjectRepository(ReportSchedule)
    private readonly reportScheduleRepository: Repository<ReportSchedule>
  ) {
    if (!this.reportScheduleRepository) {
      throw new Error('reportScheduleRepository is not initialized');
    }
  }

  async findByReportId(reportId: string): Promise<ReportSchedule[]> {
    return this.reportScheduleRepository.find({
      where: { report: { id: reportId } },
      relations: ['report'],
    });
  }

  async findByUserId(userId: string): Promise<ReportSchedule[]> {
    return this.reportScheduleRepository.find({
      where: { user: { id: userId }, isActive: true },
      relations: ['report', 'user'],
    });
  }

  async create(schedule: Partial<ReportSchedule>): Promise<ReportSchedule> {
    const newSchedule = this.reportScheduleRepository.create(schedule);
    return this.reportScheduleRepository.save(newSchedule);
  }

  async findById(id: string): Promise<ReportSchedule | null> {
    return this.reportScheduleRepository.findOne({
      where: { id },
      relations: ['report'],
    });
  }

  // Add other methods as needed
}
