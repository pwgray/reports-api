import { BullModule } from "@nestjs/bull";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Module } from "@nestjs/common";
import { ReportSchedule } from "src/entities/report-schedule.entity";
import { ReportProcessor } from "./report.processor";
import { SchedulerService } from "./scheduler.service";
import { SchedulerController } from "./scheduler.controller";
import { ReportsModule } from "../reports/reports.module";
import { ReportScheduleService } from "./report-schedule.service";

// modules/scheduler/scheduler.module.ts
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