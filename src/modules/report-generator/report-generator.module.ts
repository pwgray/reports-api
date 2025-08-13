import { Module } from "@nestjs/common";
import { ReportGeneratorService } from "./report-generator.service";

@Module({
  imports: [],
  controllers: [],
  providers: [ReportGeneratorService],
  exports: [ReportGeneratorService],
})
export class ReportGeneratorModule {}