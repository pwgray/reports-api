import { Controller, Get, Param } from "@nestjs/common";
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
}