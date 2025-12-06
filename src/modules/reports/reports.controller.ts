import { Controller, Param, Get, Post, Put, Body, Delete, Res, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty, ApiConsumes, ApiProduces } from "@nestjs/swagger";
import { Response } from 'express';
import { ReportsService } from "./reports.service";
import { Report } from "../../entities/report.entity";
import { CreateReportDto } from "../../dto/create-report.dto";

// DTOs for Swagger documentation
import { ReportDefinitionDto } from "../../dto/report-definition-dto";
import { PreviewReportResponseDto } from "../../dto/preview-report-response-dto";
import { DeleteReportResponseDto } from "../../dto/delete-report-response-dto";
import { ExcelExportErrorDto } from "../../dto/excel-export-error-dto";

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

    @Get()
    @ApiOperation({ 
        summary: 'Get all reports',
        description: 'Retrieves a list of all reports in the system'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'List of reports retrieved successfully',
        type: [Report]
    })
    async getReports() {
        return this.reportsService.getReports();
    }

    @Get(':id')
    @ApiOperation({ 
        summary: 'Get report by ID',
        description: 'Retrieves a specific report by its unique identifier'
    })
    @ApiParam({ 
        name: 'id', 
        description: 'Report unique identifier (UUID)',
        type: String
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Report retrieved successfully',
        type: Report
    })
    @ApiResponse({ 
        status: 404, 
        description: 'Report not found'
    })
    async getReport(@Param('id') id: string) {
        return this.reportsService.getReport(id);
    }

    @Post()
    @ApiOperation({ 
        summary: 'Create a new report',
        description: 'Creates a new report with the provided configuration including query and layout settings'
    })
    @ApiBody({ 
        type: CreateReportDto,
        description: 'Report configuration details'
    })
    @ApiResponse({ 
        status: 201, 
        description: 'Report created successfully',
        type: Report
    })
    @ApiResponse({ 
        status: 400, 
        description: 'Invalid input data'
    })
    async createReport(@Body() report: CreateReportDto) {
        return this.reportsService.createReport(report as any);
    }

    @Put(':id')
    @ApiOperation({ 
        summary: 'Update a report',
        description: 'Updates an existing report configuration. Only provided fields will be updated.'
    })
    @ApiParam({ 
        name: 'id', 
        description: 'Report unique identifier (UUID)',
        type: String
    })
    @ApiBody({ 
        type: CreateReportDto,
        description: 'Report configuration details to update'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Report updated successfully',
        type: Report
    })
    @ApiResponse({ 
        status: 404, 
        description: 'Report not found'
    })
    @ApiResponse({ 
        status: 400, 
        description: 'Invalid input data'
    })
    async updateReport(@Param('id') id: string, @Body() report: CreateReportDto) {
        return this.reportsService.updateReport(id, report as any);
    }

  @Delete(':id')
  @ApiOperation({ 
      summary: 'Delete a report',
      description: 'Deletes a report by its unique identifier'
  })
  @ApiParam({ 
      name: 'id', 
      description: 'Report unique identifier (UUID)',
      type: String
  })
  @ApiResponse({ 
      status: 200, 
      description: 'Report deleted successfully',
      type: DeleteReportResponseDto
  })
  @ApiResponse({ 
      status: 404, 
      description: 'Report not found'
  })
  async deleteReport(@Param('id') id: string) {
    await this.reportsService.deleteReport(id);
    return { success: true };
  }

  @Post('preview')
  @ApiOperation({ 
      summary: 'Preview report data',
      description: 'Executes a report query and returns a preview of the data without saving the report. Useful for testing report configurations before saving.'
  })
  @ApiBody({ 
      type: ReportDefinitionDto,
      description: 'Report definition with data source, selected fields, filters, and other configuration'
  })
  @ApiResponse({ 
      status: 200, 
      description: 'Report preview generated successfully',
      type: PreviewReportResponseDto
  })
  @ApiResponse({ 
      status: 400, 
      description: 'Invalid report definition or missing required fields'
  })
  @ApiResponse({ 
      status: 500, 
      description: 'Error executing report query'
  })
  async previewReport(@Body() reportDefinition: ReportDefinitionDto) {
    console.log('🔥🔥🔥 PREVIEW ENDPOINT HIT! 🔥🔥🔥');
    console.log('Report name:', reportDefinition?.name);
    console.log('Selected fields:', reportDefinition?.selectedFields?.length);
    return this.reportsService.previewReport(reportDefinition);
  }

  @Post('export/excel')
  @ApiOperation({ 
      summary: 'Export report to Excel',
      description: 'Exports a report to Excel format (.xlsx). Returns the Excel file as a binary download. The report can be defined inline or reference an existing report ID.'
  })
  @ApiBody({ 
      type: ReportDefinitionDto,
      description: 'Report definition with data source, selected fields, filters, and other configuration'
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiResponse({ 
      status: 200, 
      description: 'Excel file generated successfully',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: {
            type: 'string',
            format: 'binary'
          }
        }
      }
  })
  @ApiResponse({ 
      status: 400, 
      description: 'Invalid report definition or missing required fields',
      type: ExcelExportErrorDto
  })
  @ApiResponse({ 
      status: 500, 
      description: 'Error generating Excel file',
      type: ExcelExportErrorDto
  })
  async exportToExcel(
    @Body() reportDefinition: ReportDefinitionDto,
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