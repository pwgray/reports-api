import { ApiProperty } from "@nestjs/swagger";

export class CancelScheduleResponseDto {
    @ApiProperty({ description: 'Indicates if the cancellation was successful', example: true })
    success: boolean;
  
    @ApiProperty({ description: 'Response message', example: 'Schedule cancelled successfully' })
    message: string;
  }