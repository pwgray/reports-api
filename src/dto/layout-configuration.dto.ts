import { IsString, Length, IsOptional, MaxLength, IsObject, ValidateNested, IsUUID } from 'class-validator';

export class LayoutConfigurationDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    header?: string;

    @IsString()
    @IsOptional()
    footer?: string;

    @IsString()
    @IsOptional()
    theme?: string; // e.g., 'light', 'dark'
}