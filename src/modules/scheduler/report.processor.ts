import { ReportSchedule } from "src/entities/report-schedule.entity";
import { EmailService } from "../reports/email-service";
import { ReportsService } from "../reports/reports.service";
import { ScheduledReportData } from "src/types/scheduled-report-data.type";
import { Processor, Process } from '@nestjs/bull';
import { Job } from "bullmq";
import { ReportScheduleService } from "./report-schedule.service";

/**
 * Bull queue processor for handling scheduled report generation.
 * 
 * This processor handles background jobs for automatically generating and
 * delivering reports based on scheduled configurations. It integrates with
 * BullMQ to process jobs from the 'report-generation' queue.
 * 
 * The processor:
 * - Executes scheduled reports with their configured parameters
 * - Generates reports in the specified format (HTML, PDF, or Excel)
 * - Sends generated reports to designated recipients via email
 * - Logs execution status (success or failure)
 * 
 * Jobs are typically queued by a scheduler service that monitors cron expressions
 * and triggers report generation at the appropriate times.
 * 
 * @class ReportProcessor
 */
@Processor('report-generation')
export class ReportProcessor {
    /**
     * Creates an instance of ReportProcessor.
     * 
     * @param {ReportsService} reportsService - Service for executing reports
     * @param {EmailService} emailService - Service for sending report emails
     * @param {ReportScheduleService} reportScheduleService - Service for managing report schedules
     */
    constructor(
        private reportsService: ReportsService,
        private emailService: EmailService,
        private reportScheduleService: ReportScheduleService,
    ) { }

    /**
     * Processes a scheduled report generation job.
     * 
     * This is the main job handler that executes when a 'generate-scheduled-report'
     * job is picked up from the queue. It loads the schedule configuration,
     * executes the report with provided parameters, generates the report in the
     * specified format, and emails it to the configured recipients.
     * 
     * @param {Job<ScheduledReportData>} job - Bull job containing schedule ID and parameters
     * @returns {Promise<void>}
     * @throws {Error} If the schedule is not found
     * @throws {Error} If report execution fails
     * @throws {Error} If email sending fails
     * 
     * @remarks
     * - Validates schedule exists before processing
     * - Uses schedule format (html/pdf/excel) or defaults if invalid
     * - Passes schedule parameters to report execution
     * - Sends report to all recipients specified in schedule
     * - Logs execution status (success or failure)
     * - Re-throws errors to allow Bull to handle retries
     * 
     * @example
     * // Job data structure:
     * {
     *   scheduleId: 'schedule-123',
     *   parameters: {
     *     startDate: '2024-01-01',
     *     endDate: '2024-12-31'
     *   }
     * }
     */
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

    /**
     * Logs the execution status of a scheduled report generation.
     * 
     * This method is intended to record the outcome of report generation jobs,
     * including success status, failure messages, execution times, and other
     * metadata for monitoring and debugging purposes.
     * 
     * @param {any} scheduleId - The UUID of the schedule that was executed
     * @param {string} status - Execution status ('success' or 'failed')
     * @param {any} [message] - Optional error message or additional details
     * @throws {Error} Currently throws "Method not implemented" error
     * 
     * @remarks
     * - Placeholder for future execution logging implementation
     * - Should record execution timestamp, duration, and outcome
     * - Consider storing logs in database or logging service
     * - Useful for monitoring scheduled report health
     * - Can help identify patterns in failures
     * 
     * @todo
     * - Implement database logging or integration with logging service
     * - Record execution timestamps and durations
     * - Store error details for failed executions
     * - Add metrics collection for monitoring
     */
    logExecution(scheduleId: any, status: string, message?: any) {
        throw new Error("Method not implemented.");
    }

    /**
     * Retrieves a report schedule by its unique identifier.
     * 
     * Fetches the schedule configuration needed to execute a scheduled report.
     * Validates that the schedule exists before proceeding with report generation.
     * 
     * @param {string} scheduleId - The UUID of the schedule to retrieve
     * @returns {Promise<ReportSchedule>} The report schedule entity with report relation
     * @throws {Error} If the schedule is not found
     * 
     * @remarks
     * - Used internally by handleReportGeneration to load schedule configuration
     * - Includes report relation for accessing report details
     * - Throws descriptive error if schedule doesn't exist
     * 
     * @example
     * const schedule = await getSchedule('schedule-123');
     * // Returns schedule with report, recipients, format, cronExpression, etc.
     */
    async getSchedule(scheduleId: string): Promise<ReportSchedule> {
        const schedule = await this.reportScheduleService.findById(scheduleId);
        if (!schedule) {
            throw new Error(`Schedule with ID ${scheduleId} not found`);
        }
        return schedule;
    }
}