import { Controller, Param, Get, Post, Put, Body, Delete } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { Report } from "../../entities/report.entity";

@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

    @Get()
    async getReports() {
        return this.reportsService.getReports();
    }

    @Get(':id')
    async getReport(@Param('id') id: string) {
        return this.reportsService.getReport(id);
    }

    @Post()
    async createReport(@Body() report: Report) {
        return this.reportsService.createReport(report);
    }

    @Put(':id')
    async updateReport(@Param('id') id: string, @Body() report: Report) {
        return this.reportsService.updateReport(id, report);
    }

  @Delete(':id')
  async deleteReport(@Param('id') id: string) {
    await this.reportsService.deleteReport(id);
    return { success: true };
  }

  @Post('preview')
  async previewReport(@Body() reportDefinition: any) {
    return this.reportsService.previewReport(reportDefinition);
  }
    
    
}