import { ReportSchedule } from "src/entities/report-schedule.entity";
import { EmailService } from "../reports/email-service";
import { ReportsService } from "../reports/reports.service";
import { ScheduledReportData } from "src/types/scheduled-report-data.type";
import { Processor, Process } from '@nestjs/bull';
import { Job } from "bullmq";
import { ReportScheduleService } from "./report-schedule.service";

// modules/scheduler/report.processor.ts
@Processor('report-generation')
export class ReportProcessor {
    constructor(
        private reportsService: ReportsService,
        private emailService: EmailService,
        private reportScheduleService: ReportScheduleService,
    ) { }

    @Process('generate-scheduled-report')
    async handleReportGeneration(job: Job<ScheduledReportData>) {
        const { scheduleId, parameters } = job.data;

        try {
            const schedule = await this.getSchedule(scheduleId);
            const reportResult = await this.reportsService.executeReport(
                schedule.report.id,
                parameters,
                (['html', 'pdf', 'excel'].includes(schedule.format) ? schedule.format as 'html' | 'pdf' | 'excel' : undefined)
            );

            // Email the report
            await this.emailService.sendReportEmail(
                schedule.recipients,
                schedule.report.name,
                reportResult
            );

            // Log successful execution
            this.logExecution(scheduleId, 'success');
        } catch (error) {
            await this.logExecution(scheduleId, 'failed', error.message);
            throw error;
        }
    }

    logExecution(scheduleId: any, status: string, message?: any) {
        throw new Error("Method not implemented.");
    }

    async getSchedule(scheduleId: string): Promise<ReportSchedule> {
        const schedule = await this.reportScheduleService.findById(scheduleId);
        if (!schedule) {
            throw new Error(`Schedule with ID ${scheduleId} not found`);
        }
        return schedule;
    }
}