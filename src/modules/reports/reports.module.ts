import { TypeOrmModule } from "@nestjs/typeorm";
import { Module } from "@nestjs/common";
import { ReportParameter } from "src/entities/report-parameter.entity";
import { ReportsService } from "./reports.service";
import { QueryBuilderModule } from "../query-builder/query-builder.module";
import { EmailService } from "./email-service";
import { ReportGeneratorModule } from "../report-generator/report-generator.module";
import { ReportsController } from "./reports.controller";
import { ReportValidationService } from "./report-validation.service";
import { Report } from "src/entities/report.entity";
import { ReportSchedule } from "src/entities/report-schedule.entity";
import { UserModule } from "../users/user.module";
import { Repository } from "typeorm";
import { ReportParameterService } from "./report-parameter.service";


@Module({
  imports: [
    TypeOrmModule.forFeature([Report, ReportParameter, ReportSchedule]),
    UserModule,
    QueryBuilderModule,
    ReportGeneratorModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportValidationService, ReportParameterService, EmailService],
  exports: [ReportsService, ReportParameterService, EmailService],
})
export class ReportsModule {}