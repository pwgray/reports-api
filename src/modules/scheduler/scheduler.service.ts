import { ReportSchedule } from "src/entities/report-schedule.entity";
import { User } from "src/entities/user.entity";
import { ScheduledReportData } from "src/types/scheduled-report-data.type";
import { EmailService } from "../reports/email-service";
import { ReportsService } from "../reports/reports.service";
import { Report } from "src/entities/report.entity";
import { Injectable } from "@nestjs/common";
import { ReportScheduleService } from "./report-schedule.service";
import { Repository } from "typeorm";

/**
 * Service for scheduling and managing automated report generation.
 * 
 * This service provides functionality to:
 * - Schedule reports for automatic execution at specified times
 * - Cancel scheduled report executions
 * - Retrieve scheduled reports for users
 * - Execute scheduled reports and generate report data
 * - Integrate with BullMQ queue system for background job processing
 * 
 * The service manages the lifecycle of scheduled reports, from creation
 * through execution. It integrates with the report queue to handle
 * background processing and coordinates with ReportsService and EmailService
 * for report generation and delivery.
 * 
 * @class SchedulerService
 */
@Injectable()
export class SchedulerService {
    /**
     * BullMQ queue instance for managing scheduled report jobs.
     * 
     * @type {any}
     * @remarks
     * - Should be initialized with BullMQ queue configuration
     * - Used to add, retrieve, and remove scheduled report jobs
     * - Jobs are processed by ReportProcessor
     */
    reportQueue: any;

  /**
   * Creates an instance of SchedulerService.
   * 
   * @param {ReportsService} reportsService - Service for executing reports
   * @param {EmailService} emailService - Service for sending report emails
   * @param {ReportScheduleService} reportScheduleService - Service for managing report schedule entities
   */
  constructor(
    private readonly reportsService: ReportsService,
    private readonly emailService: EmailService,
    private readonly reportScheduleService: ReportScheduleService,
  ) {}
    /**
     * Schedules a report for automatic execution.
     * 
     * Creates a new report schedule that will automatically execute the report
     * at the specified time. The schedule is saved to the database and a job
     * is added to the report queue for background processing.
     * 
     * @param {string} reportId - The UUID of the report to schedule
     * @param {string} userId - The UUID of the user who owns this schedule
     * @param {Record<string, any>} parameters - Report parameters to use when executing
     * @param {any} recipients - Array of email addresses to send the report to
     * @param {'html' | 'pdf' | 'excel'} format - Output format for the generated report
     * @param {Date} scheduleTime - Initial scheduled execution time
     * @returns {Promise<void>}
     * 
     * @remarks
     * - Creates a new ReportSchedule entity with isActive set to true
     * - Saves the schedule to the database via ReportScheduleService
     * - Adds a job to the report queue with schedule ID and parameters
     * - The queue job will be processed by ReportProcessor at the scheduled time
     * - Note: cronExpression should be set on the schedule entity for recurring schedules
     * 
     * @example
     * await schedulerService.scheduleReport(
     *   '123e4567-e89b-12d3-a456-426614174000',
     *   'user-123',
     *   { startDate: '2024-01-01', endDate: '2024-12-31' },
     *   ['manager@example.com', 'team@example.com'],
     *   'pdf',
     *   new Date('2024-01-15T00:00:00Z')
     * );
     */
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
    /**
     * Cancels a scheduled report execution.
     * 
     * Deactivates a report schedule and removes the associated job from the queue.
     * The schedule is marked as inactive in the database, preventing further executions.
     * 
     * @param {string} scheduleId - The UUID of the schedule to cancel
     * @returns {Promise<void>}
     * @throws {Error} If the schedule is not found
     * 
     * @remarks
     * - Sets isActive flag to false on the schedule
     * - Attempts to remove the job from the queue if it exists
     * - Does not throw error if job doesn't exist in queue (may have already executed)
     * - Schedule remains in database but is marked inactive
     * 
     * @example
     * await schedulerService.cancelScheduledReport('schedule-123');
     */
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

  /**
   * Retrieves all active scheduled reports for a specific user.
   * 
   * Fetches all report schedules that belong to the specified user and are
   * currently active. Useful for displaying a user's scheduled reports dashboard.
   * 
   * @param {string} userId - The UUID of the user
   * @returns {Promise<ReportSchedule[]>} Array of active report schedules for the user
   * 
   * @example
   * const schedules = await schedulerService.getScheduledReports('user-123');
   * // Returns all active schedules where user.id = 'user-123'
   * 
   * @remarks
   * - Only returns schedules where isActive is true
   * - Delegates to ReportScheduleService.findByUserId
   * - Returns empty array if no active schedules found
   */
  async getScheduledReports(userId: string): Promise<ReportSchedule[]> {
    return await this.reportScheduleService.findByUserId(userId);
  }     
    /**
     * Retrieves a specific report schedule by its unique identifier.
     * 
     * Fetches a single schedule with all its details including report and user
     * information. Validates that the schedule exists before returning.
     * 
     * @param {string} scheduleId - The UUID of the schedule to retrieve
     * @returns {Promise<ReportSchedule>} The report schedule entity
     * @throws {Error} If the schedule is not found
     * 
     * @example
   * const schedule = await schedulerService.getReportSchedule('schedule-123');
   * console.log(`Schedule for report: ${schedule.report.name}`);
   * console.log(`Next execution: ${schedule.scheduleTime}`);
   * 
   * @remarks
   * - Includes report relation for full report details
   * - Throws descriptive error if schedule doesn't exist
   * - Used internally by other methods like getReportData
   */
    async getReportSchedule(scheduleId: string): Promise<ReportSchedule> {
        const schedule = await this.reportScheduleService.findById(scheduleId);
        if (!schedule) {
            throw new Error('Schedule not found');
        }
        return schedule;
    }
    /**
     * Executes a scheduled report and returns the generated report data.
     * 
     * Retrieves the schedule configuration, executes the associated report
     * with the schedule's parameters, and returns the complete scheduled report
     * data including the generated report content.
     * 
     * @param {string} scheduleId - The UUID of the schedule to execute
     * @returns {Promise<ScheduledReportData>} Scheduled report data with generated report content
     * @throws {Error} If the schedule is not found
     * @throws {Error} If report execution fails
     * 
     * @remarks
   * - Loads schedule configuration including report ID, parameters, and format
   * - Executes the report using ReportsService.executeReport
   * - Returns ScheduledReportData with report metadata and generated content
   * - The generated report data can be used for email delivery or storage
   * 
   * @example
   * const reportData = await schedulerService.getReportData('schedule-123');
   * // Returns: {
   * //   reportId: 'report-456',
   * //   userId: 'user-123',
   * //   scheduleId: 'schedule-123',
   * //   data: { content: Buffer, mimeType: 'application/pdf', fileName: '...' },
   * //   parameters: { startDate: '2024-01-01' },
   * //   createdAt: Date,
   * //   updatedAt: Date
   * // }
   */
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