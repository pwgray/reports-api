import { ApiProperty } from "@nestjs/swagger";

export class DeleteResponseDto {
    @ApiProperty({ description: 'Indicates if the deletion was successful', example: true })
    success: boolean;
  
    @ApiProperty({ description: 'Response message', example: 'Data source deleted successfully' })
    message: string;
  }