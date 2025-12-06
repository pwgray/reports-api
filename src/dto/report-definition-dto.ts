import { IsString, IsOptional, IsObject, IsArray, IsUUID, IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ReportDefinitionDto {
    @ApiProperty({ description: 'Report ID (optional for new reports)', required: false, example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsOptional()
    @IsUUID()
    id?: string;
  
    @ApiProperty({ description: 'Report name', example: 'Sales Report' })
    @IsString()
    name: string;
  
    @ApiProperty({ description: 'Report description', required: false, example: 'Monthly sales report' })
    @IsOptional()
    @IsString()
    description?: string;
  
    @ApiProperty({ description: 'Data source information', type: Object, example: { id: 'ds-123', name: 'Production DB' } })
    @IsObject()
    dataSource: any;
  
    @ApiProperty({ description: 'Selected fields for the report', type: [Object], example: [{ name: 'customer_id', displayName: 'Customer ID' }] })
    @IsArray()
    selectedFields: any[];
  
    @ApiProperty({ description: 'Filter conditions', required: false, type: [Object] })
    @IsOptional()
    @IsArray()
    filters?: any[];
  
    @ApiProperty({ description: 'Group by fields', required: false, type: [Object] })
    @IsOptional()
    @IsArray()
    groupBy?: any[];
  
    @ApiProperty({ description: 'Sorting configuration', required: false, type: [Object] })
    @IsOptional()
    @IsArray()
    sorting?: any[];
  
    @ApiProperty({ description: 'Layout configuration', required: false, type: Object })
    @IsOptional()
    @IsObject()
    layout?: any;
  
    @ApiProperty({ description: 'Report parameters', required: false, type: [Object] })
    @IsOptional()
    @IsArray()
    parameters?: any[];
  
    @ApiProperty({ description: 'Preview limit (max rows to return)', required: false, example: 100 })
    @IsOptional()
    limit?: number;
  }