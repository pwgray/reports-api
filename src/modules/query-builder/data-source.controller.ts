import { Controller, Get, Param, Post, Put, Delete, Body, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty } from "@nestjs/swagger";
import { DataSourceService } from "./data-source.service";
import { DatabaseSchema, exampleDatabaseSchema } from "../../types/database-schema.type";
import { DataSource } from "../../entities/data-source.entity";

// DTOs for Swagger documentation
import { CreateDataSourceDto } from "../../dto/create-data-source-dto";
import { UpdateDataSourceDto } from "../../dto/update-data-source.dto";
import { DeleteResponseDto } from "../../dto/delete-response.dto";
import { IntrospectDataSourceDto } from "../../dto/introspect-data-source.dto";

@ApiTags('data-sources')
@Controller('data-sources')
export class DataSourceController {
    
    constructor(private readonly dataSourceService: DataSourceService) {}
    
    @Get()
    @ApiOperation({ 
        summary: 'Get all data sources',
        description: 'Retrieves a list of all configured data sources'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'List of data sources retrieved successfully',
        type: [DataSource]
    })
    async getDataSources() {
        return this.dataSourceService.findAll();
    }

    @Get(':id')
    @ApiOperation({ 
        summary: 'Get data source by ID',
        description: 'Retrieves a specific data source by its unique identifier'
    })
    @ApiParam({ 
        name: 'id', 
        description: 'Data source unique identifier (UUID)',
        type: String
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Data source retrieved successfully',
        type: DataSource
    })
    @ApiResponse({ 
        status: 404, 
        description: 'Data source not found'
    })
    async getDataSource(@Param('id') id: string) {
        return this.dataSourceService.findById(id);
    }

    @Get(':id/schema')
    @ApiOperation({ 
        summary: 'Get database schema',
        description: 'Retrieves the database schema information for a specific data source. Returns the stored schema or an example schema if none exists.'
    })
    @ApiParam({ 
        name: 'id', 
        description: 'Data source unique identifier (UUID)',
        type: String
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Database schema retrieved successfully',
        type: Object
    })
    @ApiResponse({ 
        status: 404, 
        description: 'Data source not found'
    })
    async getSchema(@Param('id') id: string): Promise<DatabaseSchema> {
        const dataSource = await this.dataSourceService.findById(id);
        return dataSource.schema ?? exampleDatabaseSchema;
    }

    @Post()
    @ApiOperation({ 
        summary: 'Create a new data source',
        description: 'Creates a new data source configuration with connection details and optional schema information'
    })
    @ApiBody({ 
        type: CreateDataSourceDto,
        description: 'Data source configuration details'
    })
    @ApiResponse({ 
        status: 201, 
        description: 'Data source created successfully',
        type: DataSource
    })
    @ApiResponse({ 
        status: 400, 
        description: 'Invalid input data'
    })
    async create(@Body() body: CreateDataSourceDto) {
        return this.dataSourceService.create(body);
    }

    @Put(':id')
    @ApiOperation({ 
        summary: 'Update a data source',
        description: 'Updates an existing data source configuration. Only provided fields will be updated.'
    })
    @ApiParam({ 
        name: 'id', 
        description: 'Data source unique identifier (UUID)',
        type: String
    })
    @ApiBody({ 
        type: UpdateDataSourceDto,
        description: 'Data source configuration details to update'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Data source updated successfully',
        type: DataSource
    })
    @ApiResponse({ 
        status: 404, 
        description: 'Data source not found'
    })
    @ApiResponse({ 
        status: 400, 
        description: 'Invalid input data'
    })
    async update(@Param('id') id: string, @Body() body: UpdateDataSourceDto) {
        return this.dataSourceService.update(id, body);
    }

    @Delete(':id')
    @ApiOperation({ 
        summary: 'Delete a data source',
        description: 'Deletes a data source configuration by its unique identifier'
    })
    @ApiParam({ 
        name: 'id', 
        description: 'Data source unique identifier (UUID)',
        type: String
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Data source deleted successfully',
        type: DeleteResponseDto
    })
    @ApiResponse({ 
        status: 404, 
        description: 'Data source not found'
    })
    async delete(@Param('id') id: string) {
        await this.dataSourceService.delete(id);
        return { success: true, message: 'Data source deleted successfully' };
    }

    @Post('introspect')
    @ApiOperation({ 
        summary: 'Introspect database schema',
        description: 'Connects to a database and retrieves its schema information including tables, views, columns, relationships, and other metadata. This endpoint does not save the data source, it only returns the schema information.'
    })
    @ApiBody({ 
        type: IntrospectDataSourceDto,
        description: 'Database connection details for schema introspection'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Database schema introspected successfully',
        type: Object
    })
    @ApiResponse({ 
        status: 400, 
        description: 'Invalid connection details or unable to connect to database'
    })
    async introspect(@Body() body: IntrospectDataSourceDto): Promise<DatabaseSchema> {
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