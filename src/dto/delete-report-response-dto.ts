import { ApiProperty } from "@nestjs/swagger";

export class DeleteReportResponseDto {
    @ApiProperty({ description: 'Indicates if the deletion was successful', example: true })
    success: boolean;
}