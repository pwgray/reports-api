import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber, IsArray, IsEnum, MinLength, MaxLength } from "class-validator";
import { DatabaseType } from "../entities/data-source.entity";
import { DatabaseSchema } from "../types/database-schema.type";

export class UpdateDataSourceDto {
    @ApiProperty({ description: 'Name of the data source', required: false, example: 'Production Database', minLength: 1, maxLength: 255 })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name?: string;
  
    @ApiProperty({ description: 'Database type', required: false, enum: DatabaseType, example: DatabaseType.SQLSERVER })
    @IsOptional()
    @IsEnum(DatabaseType)
    type?: DatabaseType;
  
    @ApiProperty({ description: 'Database server hostname or IP address', required: false, example: 'localhost' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    server?: string;
  
    @ApiProperty({ description: 'Database server port', required: false, example: 1433 })
    @IsOptional()
    @IsNumber()
    port?: number;
  
    @ApiProperty({ description: 'Database name', required: false, example: 'Northwind' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    database?: string;
  
    @ApiProperty({ description: 'Database username', required: false, example: 'sa' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    username?: string;
  
    @ApiProperty({ description: 'Database password', required: false, example: 'password123' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    password?: string;
  
    @ApiProperty({ description: 'Database schema information', required: false })
    @IsOptional()
    schema?: DatabaseSchema;
  
    @ApiProperty({ description: 'List of schemas to include', required: false, type: [String], example: ['dbo', 'custom'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    includedSchemas?: string[];
  
    @ApiProperty({ description: 'List of object types to include', required: false, type: [String], example: ['table', 'view'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    includedObjectTypes?: string[];
  
    @ApiProperty({ description: 'Pattern for filtering objects by name', required: false, example: 'Customer%', maxLength: 500 })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    objectNamePattern?: string;
  }