import { Controller, Get, Param, Post, Put, Delete, Body, BadRequestException } from "@nestjs/common";
import { DataSourceService } from "./data-source.service";
import { DatabaseSchema, exampleDatabaseSchema } from "../../types/database-schema.type";

@Controller('data-sources')
export class DataSourceController {
    
    constructor(private readonly dataSourceService: DataSourceService) {}
    
    @Get()
    async getDataSources() {
        return this.dataSourceService.findAll();
    }

    @Get(':id')
    async getDataSource(@Param('id') id: string) {
        return this.dataSourceService.findById(id);
    }

    @Get(':id/schema')
    async getSchema(@Param('id') id: string): Promise<DatabaseSchema> {
        const dataSource = await this.dataSourceService.findById(id);
        return dataSource.schema ?? exampleDatabaseSchema;
    }

    @Post()
    async create(@Body() body: any) {
        // Expecting: { name, type, server, port?, database, username, password, schema? }
        return this.dataSourceService.create(body);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() body: any) {
        // Expecting: { name, type, server, port?, database, username, password, schema? }
        return this.dataSourceService.update(id, body);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        await this.dataSourceService.delete(id);
        return { success: true, message: 'Data source deleted successfully' };
    }

    @Post('introspect')
    async introspect(@Body() body: { 
        server: string; 
        port?: number; 
        database: string; 
        username: string; 
        password: string; 
        type: string;
        includedSchemas?: string[];
        includedObjectTypes?: string[];
        objectNamePattern?: string;
    }): Promise<DatabaseSchema> {
        return this.dataSourceService.introspect(
            body.server, 
            body.port, 
            body.database, 
            body.username, 
            body.password, 
            body.type,
            body.includedSchemas,
            body.includedObjectTypes,
            body.objectNamePattern
        );
    }
}