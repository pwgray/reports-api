import { ApiProperty } from "@nestjs/swagger";
import { IsUUID, IsOptional, IsObject, IsArray, ArrayMinSize, IsEmail, IsEnum, IsDateString, IsString } from "class-validator";

export class ScheduleReportDto {
    @ApiProperty({ description: 'Report ID to schedule', example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsUUID()
    reportId: string;
  
    @ApiProperty({ description: 'User ID who owns this schedule', example: 'user-123' })
    @IsUUID()
    userId: string;
  
    @ApiProperty({ description: 'Report parameters to use when executing', required: false, type: Object, example: { startDate: '2024-01-01', endDate: '2024-12-31' } })
    @IsOptional()
    @IsObject()
    parameters?: Record<string, any>;
  
    @ApiProperty({ description: 'Email addresses to send the report to', type: [String], example: ['user@example.com', 'manager@example.com'] })
    @IsArray()
    @ArrayMinSize(1)
    @IsEmail({}, { each: true })
    recipients: string[];
  
    @ApiProperty({ description: 'Output format for the scheduled report', enum: ['html', 'pdf', 'excel'], example: 'pdf' })
    @IsEnum(['html', 'pdf', 'excel'])
    format: 'html' | 'pdf' | 'excel';
  
    @ApiProperty({ description: 'Cron expression for scheduling (e.g., "0 0 * * *" for daily at midnight)', example: '0 0 * * *' })
    @IsString()
    cronExpression: string;
  
    @ApiProperty({ description: 'Initial schedule time (ISO date string)', example: '2024-01-15T00:00:00Z' })
    @IsDateString()
    scheduleTime: string;
  }