import { Controller, Get, Param, Post, Body, BadRequestException } from "@nestjs/common";
import { DataSourceService } from "./data-source.service";
import { DatabaseSchema, exampleDatabaseSchema } from "../../types/database-schema.type";

@Controller('data-sources')
export class DataSourceController {
    
    constructor(private readonly dataSourceService: DataSourceService) {}
    
    @Get()
    async getDataSources() {
        return this.dataSourceService.findAll();
    }

    @Get(':id/schema')
    async getSchema(@Param('id') id: string): Promise<DatabaseSchema> {
        const dataSource = await this.dataSourceService.findById(id);
        return dataSource.schema ?? exampleDatabaseSchema;
    }

    @Post()
    async create(@Body() body: any) {
        // Expecting: { name, type, connectionString, schema? }
        return this.dataSourceService.create(body);
    }

    @Post('introspect')
    async introspect(@Body() body: { connectionString: string; type: string }): Promise<DatabaseSchema> {
        // TODO: Replace with real introspection. For now, return example schema.
        switch (body.type) {
            case 'sqlserver':
                return this.dataSourceService.introspect('Server=localhost;Port=1433;User ID=sa;Password=Heroguy2025!;Database=Northwind;', 'mssql');
            default:
                throw new BadRequestException('Invalid database type');
        }
    }
}