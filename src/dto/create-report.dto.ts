import { IsString, Length, IsOptional, MaxLength, IsObject, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { QueryConfigurationDto } from './query-configuration.dto';
import { LayoutConfigurationDto } from './layout-configuration.dto';

// dto/create-report.dto.ts
export class CreateReportDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => QueryConfigurationDto)
  queryConfig: QueryConfigurationDto;

  @IsObject()
  @ValidateNested()
  @Type(() => LayoutConfigurationDto)
  layoutConfig: LayoutConfigurationDto;

  @IsUUID(undefined, { message: 'dataSourceId must be a valid UUID' })
  dataSourceId: string;

  @IsOptional()
  createdBy?: string; // User ID of the report creator
}