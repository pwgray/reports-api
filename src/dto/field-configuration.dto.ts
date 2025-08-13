import { IsString } from "class-validator";

export class FieldConfigurationDto {
    @IsString()
    name: string;

    @IsString()
    alias: string;

    @IsString()
    type: string; // e.g., 'string', 'number', 'date'
}