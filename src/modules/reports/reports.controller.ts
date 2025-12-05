import { Controller, Param, Get, Post, Put, Body, Delete, Res, HttpStatus } from "@nestjs/common";
import { Response } from 'express';
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
    console.log('🔥🔥🔥 PREVIEW ENDPOINT HIT! 🔥🔥🔥');
    console.log('Report name:', reportDefinition?.name);
    console.log('Selected fields:', reportDefinition?.selectedFields?.length);
    return this.reportsService.previewReport(reportDefinition);
  }

  @Post('export/excel')
  async exportToExcel(
    @Body() reportDefinition: any,
    @Res() res: Response
  ) {
    try {
      console.log('📊 Excel export requested for:', reportDefinition?.name);
      const { buffer, filename } = await this.reportsService.exportToExcel(reportDefinition);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      
      res.status(HttpStatus.OK).send(buffer);
    } catch (error) {
      console.error('❌ Excel export error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to export report to Excel',
        error: error.message
      });
    }
  }
    
    
}