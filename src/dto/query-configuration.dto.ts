import { IsString, Length, IsOptional, MaxLength, IsObject, ValidateNested, IsUUID, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { FieldConfigurationDto } from './field-configuration.dto';
import { FilterConfigurationDto } from './filter-configuration.dto';

export class QueryConfigurationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldConfigurationDto)
  fields: FieldConfigurationDto[];

  @IsArray()
  @IsString({ each: true })
  tables: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterConfigurationDto)
  filters?: FilterConfigurationDto[];
}