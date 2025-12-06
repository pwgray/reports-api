import { ReportSchedule } from "src/entities/report-schedule.entity";
import { SchedulerService } from "./scheduler.service";
import { Controller, Get, Post, Delete, Param, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from "@nestjs/swagger";

// DTOs for Swagger documentation
import { ScheduleReportDto } from "../../dto/schedule-report-dto";
import { CancelScheduleResponseDto } from "../../dto/cancel-schedule-response-dto";

@ApiTags('scheduler')
@Controller('scheduler')
export class SchedulerController {
    constructor(private readonly schedulerService: SchedulerService) { }

    @Post('schedule')
    @ApiOperation({ 
        summary: 'Schedule a report for automatic execution',
        description: 'Creates a new schedule for a report to be automatically executed at specified times using a cron expression. The report will be generated and emailed to the specified recipients at the scheduled times.'
    })
    @ApiBody({ 
        type: ScheduleReportDto,
        description: 'Schedule configuration including report ID, cron expression, recipients, and format'
    })
    @ApiResponse({ 
        status: 201, 
        description: 'Report scheduled successfully',
        type: ReportSchedule
    })
    @ApiResponse({ 
        status: 400, 
        description: 'Invalid schedule configuration or missing required fields'
    })
    @ApiResponse({ 
        status: 404, 
        description: 'Report or user not found'
    })
    async scheduleReport(
        @Body() scheduleDto: ScheduleReportDto
    ): Promise<void> {
        await this.schedulerService.scheduleReport(
            scheduleDto.reportId,
            scheduleDto.userId,
            scheduleDto.parameters || {},
            scheduleDto.recipients,
            scheduleDto.format,
            new Date(scheduleDto.scheduleTime)
        );
    }

    @Delete('schedule/:id')
    @ApiOperation({ 
        summary: 'Cancel a scheduled report',
        description: 'Cancels and removes a scheduled report execution. The schedule will be deactivated and removed from the queue.'
    })
    @ApiParam({ 
        name: 'id', 
        description: 'Schedule unique identifier (UUID)',
        type: String
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Schedule cancelled successfully',
        type: CancelScheduleResponseDto
    })
    @ApiResponse({ 
        status: 404, 
        description: 'Schedule not found'
    })
    async cancelScheduledReport(@Param('id') scheduleId: string): Promise<CancelScheduleResponseDto> {
        await this.schedulerService.cancelScheduledReport(scheduleId);
        return { success: true, message: 'Schedule cancelled successfully' };
    }

    @Get('user/:userId')
    @ApiOperation({ 
        summary: 'Get all scheduled reports for a user',
        description: 'Retrieves all active scheduled reports associated with a specific user'
    })
    @ApiParam({ 
        name: 'userId', 
        description: 'User unique identifier (UUID)',
        type: String
    })
    @ApiResponse({ 
        status: 200, 
        description: 'List of scheduled reports retrieved successfully',
        type: [ReportSchedule]
    })
    async getScheduledReports(@Param('userId') userId: string): Promise<ReportSchedule[]> {
        return await this.schedulerService.getScheduledReports(userId);
    }

    @Get('schedule/:id')
    @ApiOperation({ 
        summary: 'Get a specific report schedule',
        description: 'Retrieves detailed information about a specific report schedule by its unique identifier'
    })
    @ApiParam({ 
        name: 'id', 
        description: 'Schedule unique identifier (UUID)',
        type: String
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Schedule retrieved successfully',
        type: ReportSchedule
    })
    @ApiResponse({ 
        status: 404, 
        description: 'Schedule not found'
    })
    async getReportSchedule(@Param('id') scheduleId: string): Promise<ReportSchedule> {
        return await this.schedulerService.getReportSchedule(scheduleId);
    }
}