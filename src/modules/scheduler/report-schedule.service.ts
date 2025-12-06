import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportSchedule } from 'src/entities/report-schedule.entity';

/**
 * Service for managing report schedules.
 * 
 * This service provides functionality to:
 * - Create and manage scheduled report executions
 * - Retrieve schedules by report ID or user ID
 * - Support automated report generation and delivery
 * - Handle cron-based scheduling with recipient management
 * 
 * Report schedules allow reports to be automatically executed at specified
 * times (using cron expressions) and delivered to designated recipients
 * in various formats (HTML, PDF, Excel). Schedules can be active or inactive
 * and are associated with both reports and users.
 * 
 * @class ReportScheduleService
 */
@Injectable()
export class ReportScheduleService {
  /**
   * Creates an instance of ReportScheduleService.
   * 
   * @param {Repository<ReportSchedule>} reportScheduleRepository - TypeORM repository for ReportSchedule entities
   * @throws {Error} If the repository is not properly initialized
   */
  constructor(
    @InjectRepository(ReportSchedule)
    private readonly reportScheduleRepository: Repository<ReportSchedule>
  ) {
    if (!this.reportScheduleRepository) {
      throw new Error('reportScheduleRepository is not initialized');
    }
  }

  /**
   * Finds all schedules associated with a specific report.
   * 
   * Retrieves all report schedules that belong to the specified report,
   * including both active and inactive schedules. Useful for viewing all
   * scheduled executions for a particular report.
   * 
   * @param {string} reportId - The UUID of the report to find schedules for
   * @returns {Promise<ReportSchedule[]>} Array of report schedules associated with the report
   * 
   * @example
   * const schedules = await reportScheduleService.findByReportId('123e4567-e89b-12d3-a456-426614174000');
   * // Returns: [
   * //   {
   * //     id: 'schedule-1',
   * //     reportId: '123e4567-e89b-12d3-a456-426614174000',
   * //     cronExpression: '0 0 * * *',
   * //     recipients: ['user@example.com'],
   * //     format: 'pdf',
   * //     isActive: true,
   * //     report: {...}
   * //   },
   * //   ...
   * // ]
   * 
   * @remarks
   * - Returns empty array if no schedules are found for the report
   * - Includes report relation for full report details
   * - Returns both active and inactive schedules
   */
  async findByReportId(reportId: string): Promise<ReportSchedule[]> {
    return this.reportScheduleRepository.find({
      where: { report: { id: reportId } },
      relations: ['report'],
    });
  }

  /**
   * Finds all active schedules associated with a specific user.
   * 
   * Retrieves all active report schedules that belong to the specified user.
   * Only returns schedules where isActive is true, making this useful for
   * displaying a user's active scheduled reports.
   * 
   * @param {string} userId - The UUID of the user to find schedules for
   * @returns {Promise<ReportSchedule[]>} Array of active report schedules for the user
   * 
   * @example
   * const schedules = await reportScheduleService.findByUserId('user-123');
   * // Returns only active schedules where user.id = 'user-123'
   * 
   * @remarks
   * - Only returns schedules where isActive is true
   * - Includes report and user relations for full details
   * - Returns empty array if no active schedules are found
   * - Useful for dashboard views showing user's scheduled reports
   */
  async findByUserId(userId: string): Promise<ReportSchedule[]> {
    return this.reportScheduleRepository.find({
      where: { user: { id: userId }, isActive: true },
      relations: ['report', 'user'],
    });
  }

  /**
   * Creates a new report schedule.
   * 
   * Saves a new report schedule configuration that defines when and how
   * a report should be automatically executed and delivered.
   * 
   * @param {Partial<ReportSchedule>} schedule - Partial schedule object with properties to set
   * @returns {Promise<ReportSchedule>} The created report schedule entity with generated ID and timestamps
   * 
   * @example
   * const newSchedule = await reportScheduleService.create({
   *   reportId: '123e4567-e89b-12d3-a456-426614174000',
   *   userId: 'user-123',
   *   cronExpression: '0 0 * * *', // Daily at midnight
   *   recipients: ['manager@example.com', 'team@example.com'],
   *   format: 'pdf',
   *   isActive: true,
   *   parameters: { startDate: '2024-01-01' }
   * });
   * 
   * @remarks
   * - Requires reportId, userId, cronExpression, and format at minimum
   * - Recipients should be an array of email addresses
   * - Parameters object can contain report parameter values
   * - Schedule is created as active by default (unless explicitly set)
   */
  async create(schedule: Partial<ReportSchedule>): Promise<ReportSchedule> {
    const newSchedule = this.reportScheduleRepository.create(schedule);
    return this.reportScheduleRepository.save(newSchedule);
  }

  /**
   * Finds a report schedule by its unique identifier.
   * 
   * Retrieves a single schedule with its associated report relation.
   * Returns null if the schedule is not found.
   * 
   * @param {string} id - The UUID of the schedule to find
   * @returns {Promise<ReportSchedule | null>} The report schedule entity, or null if not found
   * 
   * @example
   * const schedule = await reportScheduleService.findById('schedule-123');
   * if (schedule) {
   *   console.log(`Schedule for report: ${schedule.report.name}`);
   *   console.log(`Cron: ${schedule.cronExpression}`);
   * }
   * 
   * @remarks
   * - Includes report relation for full report details
   * - Returns null instead of throwing error if schedule not found
   * - Useful for retrieving schedule details before update/delete operations
   */
  async findById(id: string): Promise<ReportSchedule | null> {
    return this.reportScheduleRepository.findOne({
      where: { id },
      relations: ['report'],
    });
  }

  // Add other methods as needed
  // Potential future methods:
  // - update(id: string, schedule: Partial<ReportSchedule>): Promise<ReportSchedule>
  // - delete(id: string): Promise<void>
  // - activate(id: string): Promise<void>
  // - deactivate(id: string): Promise<void>
  // - findByCronExpression(cronExpression: string): Promise<ReportSchedule[]>
  // - findUpcomingSchedules(limit: number): Promise<ReportSchedule[]>
}
