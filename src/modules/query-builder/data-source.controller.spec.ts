import { Test, TestingModule } from '@nestjs/testing';
import { DataSourceController } from './data-source.controller';
import { DataSourceService } from './data-source.service';
import { NotFoundException } from '@nestjs/common';
import { exampleDatabaseSchema } from '../../types/database-schema.type';

describe('DataSourceController', () => {
  let controller: DataSourceController;
  let service: DataSourceService;

  const mockDataSourceService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    introspect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataSourceController],
      providers: [
        {
          provide: DataSourceService,
          useValue: mockDataSourceService,
        },
      ],
    }).compile();

    controller = module.get<DataSourceController>(DataSourceController);
    service = module.get<DataSourceService>(DataSourceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDataSources', () => {
    it('should return an array of data sources', async () => {
      const mockDataSources = [
        { id: '1', name: 'Test DS 1' },
        { id: '2', name: 'Test DS 2' }
      ];
      mockDataSourceService.findAll.mockResolvedValue(mockDataSources);

      const result = await controller.getDataSources();

      expect(result).toEqual(mockDataSources);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no data sources exist', async () => {
      mockDataSourceService.findAll.mockResolvedValue([]);

      const result = await controller.getDataSources();

      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDataSource', () => {
    it('should return a single data source by id', async () => {
      const mockDataSource = { id: '123', name: 'Test DS' };
      mockDataSourceService.findById.mockResolvedValue(mockDataSource);

      const result = await controller.getDataSource('123');

      expect(result).toEqual(mockDataSource);
      expect(service.findById).toHaveBeenCalledWith('123');
    });

    it('should propagate NotFoundException from service', async () => {
      mockDataSourceService.findById.mockRejectedValue(
        new NotFoundException('DataSource with ID 999 not found')
      );

      await expect(controller.getDataSource('999')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getSchema', () => {
    it('should return schema from data source if available', async () => {
      const mockSchema = { 
        databaseName: 'test', 
        tables: [],
        views: [],
        procedures: []
      };
      const mockDataSource = { id: '123', schema: mockSchema };
      mockDataSourceService.findById.mockResolvedValue(mockDataSource);

      const result = await controller.getSchema('123');

      expect(result).toEqual(mockSchema);
      expect(service.findById).toHaveBeenCalledWith('123');
    });

    it('should return example schema if data source schema is null', async () => {
      const mockDataSource = { id: '123', schema: null };
      mockDataSourceService.findById.mockResolvedValue(mockDataSource);

      const result = await controller.getSchema('123');

      expect(result).toEqual(exampleDatabaseSchema);
      expect(service.findById).toHaveBeenCalledWith('123');
    });

    it('should return example schema if data source schema is undefined', async () => {
      const mockDataSource = { id: '123', schema: undefined };
      mockDataSourceService.findById.mockResolvedValue(mockDataSource);

      const result = await controller.getSchema('123');

      expect(result).toEqual(exampleDatabaseSchema);
      expect(service.findById).toHaveBeenCalledWith('123');
    });
  });

  describe('create', () => {
    it('should create a new data source', async () => {
      const createDto = { 
        name: 'New DS', 
        type: 'sqlserver',
        server: 'localhost',
        database: 'testdb',
        username: 'sa',
        password: 'password'
      };
      const mockCreated = { id: '456', ...createDto };
      mockDataSourceService.create.mockResolvedValue(mockCreated);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCreated);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should create data source with optional port', async () => {
      const createDto = { 
        name: 'New DS', 
        type: 'sqlserver',
        server: 'localhost',
        port: 1433,
        database: 'testdb',
        username: 'sa',
        password: 'password'
      };
      const mockCreated = { id: '456', ...createDto };
      mockDataSourceService.create.mockResolvedValue(mockCreated);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCreated);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update an existing data source', async () => {
      const updateDto = { name: 'Updated DS' };
      const mockUpdated = { id: '123', name: 'Updated DS' };
      mockDataSourceService.update.mockResolvedValue(mockUpdated);

      const result = await controller.update('123', updateDto);

      expect(result).toEqual(mockUpdated);
      expect(service.update).toHaveBeenCalledWith('123', updateDto);
    });

    it('should update multiple fields', async () => {
      const updateDto = { 
        name: 'Updated DS',
        server: 'newserver',
        database: 'newdb'
      };
      const mockUpdated = { id: '123', ...updateDto };
      mockDataSourceService.update.mockResolvedValue(mockUpdated);

      const result = await controller.update('123', updateDto);

      expect(result).toEqual(mockUpdated);
      expect(service.update).toHaveBeenCalledWith('123', updateDto);
    });
  });

  describe('delete', () => {
    it('should delete a data source and return success message', async () => {
      mockDataSourceService.delete.mockResolvedValue(undefined);

      const result = await controller.delete('123');

      expect(result).toEqual({ 
        success: true, 
        message: 'Data source deleted successfully' 
      });
      expect(service.delete).toHaveBeenCalledWith('123');
    });

    it('should propagate NotFoundException when deleting non-existent data source', async () => {
      mockDataSourceService.delete.mockRejectedValue(
        new NotFoundException('DataSource with ID 999 not found')
      );

      await expect(controller.delete('999')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('introspect', () => {
    it('should introspect database and return schema', async () => {
      const introspectDto = {
        server: 'localhost',
        port: 1433,
        database: 'testdb',
        username: 'sa',
        password: 'pass',
        type: 'sqlserver',
      };
      const mockSchema = { 
        databaseName: 'testdb', 
        tables: [],
        views: [],
        procedures: []
      };
      mockDataSourceService.introspect.mockResolvedValue(mockSchema);

      const result = await controller.introspect(introspectDto);

      expect(result).toEqual(mockSchema);
      expect(service.introspect).toHaveBeenCalledWith(
        'localhost',
        1433,
        'testdb',
        'sa',
        'pass',
        'sqlserver',
        undefined,
        undefined,
        undefined
      );
    });

    it('should handle introspection without port', async () => {
      const introspectDto = {
        server: 'localhost',
        database: 'testdb',
        username: 'sa',
        password: 'pass',
        type: 'sqlserver',
      };
      const mockSchema = { 
        databaseName: 'testdb', 
        tables: []
      };
      mockDataSourceService.introspect.mockResolvedValue(mockSchema);

      const result = await controller.introspect(introspectDto);

      expect(result).toEqual(mockSchema);
      expect(service.introspect).toHaveBeenCalledWith(
        'localhost',
        undefined,
        'testdb',
        'sa',
        'pass',
        'sqlserver',
        undefined,
        undefined,
        undefined
      );
    });

    it('should handle optional introspection parameters', async () => {
      const introspectDto = {
        server: 'localhost',
        database: 'testdb',
        username: 'sa',
        password: 'pass',
        type: 'sqlserver',
        includedSchemas: ['dbo', 'sales'],
        includedObjectTypes: ['table', 'view'],
        objectNamePattern: 'User%',
      };
      const mockSchema = { 
        databaseName: 'testdb', 
        tables: []
      };
      mockDataSourceService.introspect.mockResolvedValue(mockSchema);

      const result = await controller.introspect(introspectDto);

      expect(result).toEqual(mockSchema);
      expect(service.introspect).toHaveBeenCalledWith(
        'localhost',
        undefined,
        'testdb',
        'sa',
        'pass',
        'sqlserver',
        ['dbo', 'sales'],
        ['table', 'view'],
        'User%'
      );
    });

    it('should handle introspection with only schema filter', async () => {
      const introspectDto = {
        server: 'localhost',
        database: 'testdb',
        username: 'sa',
        password: 'pass',
        type: 'sqlserver',
        includedSchemas: ['dbo'],
      };
      const mockSchema = { 
        databaseName: 'testdb', 
        tables: []
      };
      mockDataSourceService.introspect.mockResolvedValue(mockSchema);

      const result = await controller.introspect(introspectDto);

      expect(service.introspect).toHaveBeenCalledWith(
        'localhost',
        undefined,
        'testdb',
        'sa',
        'pass',
        'sqlserver',
        ['dbo'],
        undefined,
        undefined
      );
    });
  });
});
