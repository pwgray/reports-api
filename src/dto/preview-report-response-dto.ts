import { ApiProperty } from "@nestjs/swagger";

export class PreviewReportResponseDto {
    @ApiProperty({ description: 'Report data rows', type: [Object] })
    data: any[];
  
    @ApiProperty({ description: 'Total number of rows', example: 150 })
    totalRows: number;
  
    @ApiProperty({ description: 'Execution time in milliseconds', example: 1250 })
    executionTime: number;
  }