import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber, IsArray, IsEnum, MinLength, MaxLength } from "class-validator";
import { DatabaseType } from "../entities/data-source.entity";

export class IntrospectDataSourceDto {
    @ApiProperty({ description: 'Database server hostname or IP address', example: 'localhost' })
    @IsString()
    @MinLength(1)
    server: string;
  
    @ApiProperty({ description: 'Database server port', required: false, example: 1433 })
    @IsOptional()
    @IsNumber()
    port?: number;
  
    @ApiProperty({ description: 'Database name', example: 'Northwind' })
    @IsString()
    @MinLength(1)
    database: string;
  
    @ApiProperty({ description: 'Database username', example: 'sa' })
    @IsString()
    @MinLength(1)
    username: string;
  
    @ApiProperty({ description: 'Database password', example: 'password123' })
    @IsString()
    @MinLength(1)
    password: string;
  
    @ApiProperty({ description: 'Database type', enum: DatabaseType, example: DatabaseType.SQLSERVER })
    @IsEnum(DatabaseType)
    type: DatabaseType;
  
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