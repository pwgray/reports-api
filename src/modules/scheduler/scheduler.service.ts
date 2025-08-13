import { ReportSchedule } from "src/entities/report-schedule.entity";
import { User } from "src/entities/user.entity";
import { ScheduledReportData } from "src/types/scheduled-report-data.type";
import { EmailService } from "../reports/email-service";
import { ReportsService } from "../reports/reports.service";
import { Report } from "src/entities/report.entity";
import { Injectable } from "@nestjs/common";
import { ReportScheduleService } from "./report-schedule.service";
import { Repository } from "typeorm";

@Injectable()
export class SchedulerService {
    reportQueue: any;
  constructor(
    private readonly reportsService: ReportsService,
    private readonly emailService: EmailService,
    private readonly reportScheduleService: ReportScheduleService,
  ) {}
    async scheduleReport(
    reportId: string,
    userId: string,
    parameters: Record<string, any>,
    recipients: any,
    format: 'html' | 'pdf' | 'excel',
    scheduleTime: Date,
  ): Promise<void> {    
    const schedule = new ReportSchedule();
    schedule.report = { id: reportId } as Report;
    schedule.user = { id: userId } as User;
    schedule.parameters = parameters;
    schedule.recipients = recipients;
    schedule.format = format;
    schedule.scheduleTime = scheduleTime;
    schedule.createdAt = new Date();
    schedule.updatedAt = new Date();
    schedule.isActive = true;

    // Save the schedule to the database
    const savedSchedule = await this.reportScheduleService.create(schedule);
    // Add the job to the queue
    await this.reportQueue.add('generate-scheduled-report', {
      scheduleId: schedule.id,
      parameters,
    });
  }
    async cancelScheduledReport(scheduleId: string): Promise<void> {
        const schedule = await this.reportScheduleService.findById(scheduleId);
        if (!schedule) {
            throw new Error('Schedule not found');
        }
        schedule.isActive = false;
        await this.reportScheduleService.create(schedule);
        // Optionally, remove the job from the queue if it exists
        const job = await this.reportQueue.getJob(scheduleId);
        if (job) {
            await job.remove();
        }   


    }

  async getScheduledReports(userId: string): Promise<ReportSchedule[]> {
    return await this.reportScheduleService.findByUserId(userId);
  }     
    async getReportSchedule(scheduleId: string): Promise<ReportSchedule> {
        const schedule = await this.reportScheduleService.findById(scheduleId);
        if (!schedule) {
            throw new Error('Schedule not found');
        }
        return schedule;
    }
    async getReportData(scheduleId: string): Promise<ScheduledReportData> {
        const schedule = await this.getReportSchedule(scheduleId);
        if (!schedule) {
            throw new Error('Schedule not found');
        }
        const reportData: ScheduledReportData = {
            reportId: schedule.report.id,
            userId: schedule.user.id,
            scheduleId: schedule.id,
            data: null, // This should be populated with the actual report data
            parameters: schedule.parameters,
            createdAt: schedule.createdAt,
            updatedAt: schedule.updatedAt,
        };  
        // Here you would typically fetch the actual report data based on the reportId and parameters
        reportData.data = await this.reportsService.executeReport(
            schedule.report.id,
            schedule.parameters,
            schedule.format as 'html' | 'pdf' | 'excel'
        );
        return reportData;
    }   
}