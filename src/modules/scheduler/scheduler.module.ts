import { BullModule } from "@nestjs/bull";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Module } from "@nestjs/common";
import { ReportSchedule } from "src/entities/report-schedule.entity";
import { ReportProcessor } from "./report.processor";
import { SchedulerService } from "./scheduler.service";
import { SchedulerController } from "./scheduler.controller";
import { ReportsModule } from "../reports/reports.module";
import { ReportScheduleService } from "./report-schedule.service";

/**
 * Scheduler Module
 * 
 * This NestJS module provides functionality for scheduling and automatically executing
 * reports at specified times. It uses BullMQ (via @nestjs/bull) for background job
 * processing and Redis for queue management. The module handles cron-based scheduling,
 * report generation, and email delivery of scheduled reports.
 * 
 * @module SchedulerModule
 * 
 * @description
 * The SchedulerModule encapsulates:
 * - **Report Scheduling**: Creating and managing schedules for automatic report execution
 * - **Background Job Processing**: Using BullMQ to process scheduled report generation jobs
 * - **Queue Management**: Redis-based queue for reliable job processing
 * - **Schedule Persistence**: Storing and retrieving report schedules from the database
 * - **Email Delivery**: Sending generated reports to specified recipients
 * 
 * @imports
 * - `BullModule.forRoot()`: Configures BullMQ with Redis connection (host and port from environment variables)
 * - `BullModule.registerQueue()`: Registers the 'report-generation' queue for processing scheduled reports
 * - `TypeOrmModule.forFeature([ReportSchedule])`: Provides TypeORM repository for ReportSchedule entity
 * - `ReportsModule`: Imports report execution and generation functionality
 * 
 * @providers
 * - `SchedulerService`: Core service for scheduling report executions and managing schedules
 * - `ReportProcessor`: BullMQ job processor that handles scheduled report generation in the background
 * - `ReportScheduleService`: Service for managing report schedule persistence (CRUD operations)
 * 
 * @controllers
 * - `SchedulerController`: REST API endpoints for scheduling operations:
 *   - POST /scheduler/schedule - Create a new report schedule
 *   - DELETE /scheduler/schedule/:id - Cancel a scheduled report
 *   - GET /scheduler/user/:userId - Get all schedules for a user
 *   - GET /scheduler/schedule/:id - Get a specific schedule
 * 
 * @exports
 * - `ReportScheduleService`: Exported for use in other modules that need schedule management
 * 
 * @environmentVariables
 * - `REDIS_HOST`: Redis server hostname (required for BullMQ)
 * - `REDIS_PORT`: Redis server port (defaults to 6379 if not provided)
 * 
 * @dependencies
 * - Redis: Required for BullMQ queue management
 * - ReportsModule: Provides report execution and generation services
 * - TypeORM: For database persistence of schedules
 * 
 * @example
 * ```typescript
 * // Import the module in your app module
 * import { SchedulerModule } from './modules/scheduler/scheduler.module';
 * 
 * @Module({
 *   imports: [
 *     SchedulerModule,
 *     // ... other modules
 *   ],
 * })
 * export class AppModule {}
 * 
 * // Use the exported service in other modules
 * import { ReportScheduleService } from './modules/scheduler/scheduler.module';
 * 
 * constructor(private readonly scheduleService: ReportScheduleService) {}
 * 
 * // Schedule a report
 * await this.schedulerService.scheduleReport(
 *   'report-id',
 *   'user-id',
 *   { startDate: '2024-01-01' },
 *   ['user@example.com'],
 *   'pdf',
 *   new Date('2024-12-31')
 * );
 * ```
 * 
 * @remarks
 * - The module requires a running Redis instance for BullMQ to function
 * - Report generation jobs are processed asynchronously in the background
 * - Failed jobs can be retried based on BullMQ configuration
 * - The 'report-generation' queue name must match the queue name used in ReportProcessor
 */
@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue({
      name: 'report-generation',
    }),    
    TypeOrmModule.forFeature([ReportSchedule]),
    ReportsModule,
  ],
  providers: [SchedulerService, ReportProcessor, ReportScheduleService],
  controllers: [SchedulerController],
  exports: [ReportScheduleService],
})
export class SchedulerModule {}