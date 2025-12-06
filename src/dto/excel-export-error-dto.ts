import { ApiProperty } from "@nestjs/swagger";

export class ExcelExportErrorDto {
    @ApiProperty({ description: 'Error message', example: 'Failed to export report to Excel' })
    message: string;
  
    @ApiProperty({ description: 'Error details', example: 'Connection timeout' })
    error: string;
  }