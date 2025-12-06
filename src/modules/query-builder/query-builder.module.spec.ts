import { Test } from '@nestjs/testing';
import { QueryBuilderModule } from './query-builder.module';
import { QueryBuilderService } from './query-builder.service';
import { DataSourceService } from './data-source.service';
import { DataSourceController } from './data-source.controller';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from '../../entities/data-source.entity';

describe('QueryBuilderModule', () => {
  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  it('should be defined', () => {
    expect(QueryBuilderModule).toBeDefined();
  });

  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [QueryBuilderModule],
    })
      .overrideProvider(getRepositoryToken(DataSource))
      .useValue(mockRepository)
      .compile();

    expect(module).toBeDefined();
  });

  it('should provide QueryBuilderService', async () => {
    const module = await Test.createTestingModule({
      imports: [QueryBuilderModule],
    })
      .overrideProvider(getRepositoryToken(DataSource))
      .useValue(mockRepository)
      .compile();

    const service = module.get(QueryBuilderService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(QueryBuilderService);
  });

  it('should provide DataSourceService', async () => {
    const module = await Test.createTestingModule({
      imports: [QueryBuilderModule],
    })
      .overrideProvider(getRepositoryToken(DataSource))
      .useValue(mockRepository)
      .compile();

    const service = module.get(DataSourceService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(DataSourceService);
  });

  it('should provide DataSourceController', async () => {
    const module = await Test.createTestingModule({
      imports: [QueryBuilderModule],
    })
      .overrideProvider(getRepositoryToken(DataSource))
      .useValue(mockRepository)
      .compile();

    const controller = module.get(DataSourceController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(DataSourceController);
  });

  it('should export QueryBuilderService', async () => {
    const module = await Test.createTestingModule({
      imports: [QueryBuilderModule],
    })
      .overrideProvider(getRepositoryToken(DataSource))
      .useValue(mockRepository)
      .compile();

    const exportedService = module.get(QueryBuilderService);
    expect(exportedService).toBeDefined();
    expect(exportedService).toBeInstanceOf(QueryBuilderService);
  });

  it('should export DataSourceService', async () => {
    const module = await Test.createTestingModule({
      imports: [QueryBuilderModule],
    })
      .overrideProvider(getRepositoryToken(DataSource))
      .useValue(mockRepository)
      .compile();

    const exportedService = module.get(DataSourceService);
    expect(exportedService).toBeDefined();
    expect(exportedService).toBeInstanceOf(DataSourceService);
  });

  it('should inject DataSource repository into services', async () => {
    const module = await Test.createTestingModule({
      imports: [QueryBuilderModule],
    })
      .overrideProvider(getRepositoryToken(DataSource))
      .useValue(mockRepository)
      .compile();

    const queryBuilderService = module.get(QueryBuilderService);
    const dataSourceService = module.get(DataSourceService);

    expect(queryBuilderService).toBeDefined();
    expect(dataSourceService).toBeDefined();
  });
});
