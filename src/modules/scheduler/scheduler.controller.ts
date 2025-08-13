import { ReportSchedule } from "src/entities/report-schedule.entity";
import { SchedulerService } from "./scheduler.service";
import { Controller } from "@nestjs/common";

@Controller('scheduler')
export class SchedulerController {
    constructor(private readonly schedulerService: SchedulerService) { }
    async scheduleReport(
        reportId: string,
        userId: string,
        parameters: Record<string, any>,
        recipients: any,
        format: 'html' | 'pdf' | 'excel',
        scheduleTime: Date,
    ): Promise<void> {
        await this.schedulerService.scheduleReport(
            reportId,
            userId,
            parameters,
            recipients,
            format,
            scheduleTime
        );
    }
    async cancelScheduledReport(scheduleId: string): Promise<void> {
        await this.schedulerService.cancelScheduledReport(scheduleId);
    }
    async getScheduledReports(userId: string): Promise<ReportSchedule[]> {
        return await this.schedulerService.getScheduledReports(userId);
    }
    async getReportSchedule(scheduleId: string): Promise<ReportSchedule> {
        return await this.schedulerService.getReportSchedule(scheduleId);
    }
}