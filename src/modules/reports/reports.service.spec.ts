// @ts-nocheck - Test file with mock structures
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportsService } from './reports.service';
import { Report } from 'src/entities/report.entity';
import { QueryBuilderService } from '../query-builder/query-builder.service';
import { ReportGeneratorService } from '../report-generator/report-generator.service';
import { UserService } from '../users/user.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let reportRepository: Repository<Report>;
  let queryBuilderService: QueryBuilderService;
  let reportGeneratorService: ReportGeneratorService;
  let userService: UserService;

  const mockReportRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
  };

  const mockQueryBuilderService = {
    buildQuery: jest.fn(),
    executeQuery: jest.fn(),
  };

  const mockReportGeneratorService = {
    generate: jest.fn(),
  };

  const mockUserService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(Report),
          useValue: mockReportRepository,
        },
        {
          provide: QueryBuilderService,
          useValue: mockQueryBuilderService,
        },
        {
          provide: ReportGeneratorService,
          useValue: mockReportGeneratorService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    reportRepository = module.get<Repository<Report>>(getRepositoryToken(Report));
    queryBuilderService = module.get<QueryBuilderService>(QueryBuilderService);
    reportGeneratorService = module.get<ReportGeneratorService>(ReportGeneratorService);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeReport', () => {
    it('should execute a report and return result', async () => {
      const reportId = 'report-123';
      const parameters = { startDate: '2024-01-01' };
      const format = 'html';

      const mockReport = {
        id: reportId,
        queryConfig: { fields: [] },
        layoutConfig: { name: 'Layout' },
        dataSource: { id: 'ds-1' },
      };

      const mockQuery = 'SELECT * FROM table';
      const mockData = [{ id: 1, name: 'Test' }];
      const mockResult = {
        content: '<html>Report</html>',
        mimeType: 'text/html',
        fileName: 'report.html',
      };

      mockReportRepository.findOneBy.mockResolvedValue(mockReport);
      mockQueryBuilderService.buildQuery.mockResolvedValue(mockQuery);
      mockQueryBuilderService.executeQuery.mockResolvedValue(mockData);
      mockReportGeneratorService.generate.mockResolvedValue(mockResult);

      const result = await service.executeReport(reportId, parameters, format);

      expect(result).toEqual(mockResult);
      expect(reportRepository.findOneBy).toHaveBeenCalledWith({ id: reportId });
      expect(queryBuilderService.buildQuery).toHaveBeenCalledWith(mockReport.queryConfig, parameters);
      expect(queryBuilderService.executeQuery).toHaveBeenCalledWith('ds-1', mockQuery);
      expect(reportGeneratorService.generate).toHaveBeenCalledWith(mockReport.layoutConfig, mockData, format);
    });

    it('should throw error when report not found', async () => {
      mockReportRepository.findOneBy.mockResolvedValue(null);

      await expect(service.executeReport('non-existent', {}, 'html')).rejects.toThrow(
        'Report with ID non-existent not found.'
      );
    });

    it('should execute report in PDF format', async () => {
      const mockReport = {
        id: '123',
        queryConfig: {},
        layoutConfig: {},
        dataSource: { id: 'ds-1' },
      };

      mockReportRepository.findOneBy.mockResolvedValue(mockReport);
      mockQueryBuilderService.buildQuery.mockResolvedValue('SELECT *');
      mockQueryBuilderService.executeQuery.mockResolvedValue([]);
      mockReportGeneratorService.generate.mockResolvedValue({ content: Buffer.from('PDF') });

      await service.executeReport('123', {}, 'pdf');

      expect(reportGeneratorService.generate).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'pdf');
    });

    it('should execute report in Excel format', async () => {
      const mockReport = {
        id: '456',
        queryConfig: {},
        layoutConfig: {},
        dataSource: { id: 'ds-2' },
      };

      mockReportRepository.findOneBy.mockResolvedValue(mockReport);
      mockQueryBuilderService.buildQuery.mockResolvedValue('SELECT *');
      mockQueryBuilderService.executeQuery.mockResolvedValue([{ a: 1 }]);
      mockReportGeneratorService.generate.mockResolvedValue({ content: Buffer.from('Excel') });

      await service.executeReport('456', {}, 'excel');

      expect(reportGeneratorService.generate).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'excel');
    });
  });

  describe('getReports', () => {
    it('should return all reports with relations', async () => {
      const mockReports = [
        {
          id: '1',
          name: 'Report 1',
          dataSource: { id: 'ds-1' },
          parameters: [],
          schedules: [],
          createdBy: { id: 'user-1' },
          queryConfig: { fields: [] },
        },
        {
          id: '2',
          name: 'Report 2',
          dataSource: { id: 'ds-2' },
          parameters: [],
          schedules: [],
          createdBy: { id: 'user-2' },
          queryConfig: { fields: [] },
        },
      ];

      mockReportRepository.find.mockResolvedValue(mockReports);

      const result = await service.getReports();

      expect(reportRepository.find).toHaveBeenCalledWith({
        relations: ['dataSource', 'parameters', 'schedules', 'createdBy'],
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no reports exist', async () => {
      mockReportRepository.find.mockResolvedValue([]);

      const result = await service.getReports();

      expect(result).toEqual([]);
    });
  });

  describe('getReport', () => {
    it('should return a single report by id', async () => {
      const mockReport = {
        id: '123',
        name: 'Test Report',
        dataSource: { id: 'ds-1' },
        parameters: [],
        schedules: [],
        createdBy: { id: 'user-1' },
        queryConfig: { fields: [] },
      };

      mockReportRepository.findOne.mockResolvedValue(mockReport);

      const result = await service.getReport('123');

      expect(reportRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123' },
        relations: ['dataSource', 'parameters', 'schedules', 'createdBy'],
      });
      expect(result).toBeDefined();
    });

    it('should return null when report not found', async () => {
      mockReportRepository.findOne.mockResolvedValue(null);

      const result = await service.getReport('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createReport', () => {
    it('should create a new report', async () => {
      const newReport = {
        name: 'New Report',
        layoutConfig: { name: 'Layout' },
      };

      const savedReport = { ...newReport, id: '789' };
      mockReportRepository.save.mockResolvedValue(savedReport);

      const result = await service.createReport(newReport as Report);

      expect(reportRepository.save).toHaveBeenCalledWith(newReport);
      expect(result).toEqual(savedReport);
    });

    it('should parse layoutConfig string to object', async () => {
      const newReport = {
        name: 'Report with string config',
        layoutConfig: '{"name":"Layout","columns":[]}',
      };

      mockReportRepository.save.mockResolvedValue({ ...newReport, id: '999' });

      await service.createReport(newReport as any);

      expect(reportRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          layoutConfig: { name: 'Layout', columns: [] },
        })
      );
    });

    it('should handle layoutConfig already as object', async () => {
      const newReport = {
        name: 'Report with object config',
        layoutConfig: { name: 'Layout', columns: [] },
      };

      mockReportRepository.save.mockResolvedValue({ ...newReport, id: '888' });

      await service.createReport(newReport as Report);

      expect(reportRepository.save).toHaveBeenCalledWith(newReport);
    });

    it('should handle invalid JSON in layoutConfig', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const newReport = {
        name: 'Report with invalid JSON',
        layoutConfig: 'invalid-json{',
      };

      mockReportRepository.save.mockResolvedValue({ ...newReport, id: '777' });

      await service.createReport(newReport as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to parse layoutConfig:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateReport', () => {
    it('should update an existing report', async () => {
      const updateData = {
        id: '123',
        name: 'Updated Report',
        layoutConfig: { name: 'Updated Layout' },
      };

      mockReportRepository.save.mockResolvedValue(updateData);

      const result = await service.updateReport('123', updateData as Report);

      expect(reportRepository.save).toHaveBeenCalledWith(updateData);
      expect(result).toEqual(updateData);
    });

    it('should parse layoutConfig string when updating', async () => {
      const updateData = {
        id: '456',
        layoutConfig: '{"name":"Updated"}',
      };

      mockReportRepository.save.mockResolvedValue({ ...updateData, layoutConfig: { name: 'Updated' } });

      await service.updateReport('456', updateData as any);

      expect(reportRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          layoutConfig: { name: 'Updated' },
        })
      );
    });
  });

  describe('deleteReport', () => {
    it('should delete a report', async () => {
      mockReportRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteReport('123');

      expect(reportRepository.delete).toHaveBeenCalledWith('123');
    });

    it('should not throw error when deleting non-existent report', async () => {
      mockReportRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.deleteReport('non-existent')).resolves.not.toThrow();
    });
  });

  describe('archiveReport', () => {
    it('should archive a report', async () => {
      const mockReport = { id: '123', isArchived: false };
      mockReportRepository.findOneBy.mockResolvedValue(mockReport);
      mockReportRepository.save.mockResolvedValue({ ...mockReport, isArchived: true });

      await service.archiveReport('123');

      expect(mockReport.isArchived).toBe(true);
      expect(reportRepository.save).toHaveBeenCalledWith(mockReport);
    });

    it('should throw error when report not found', async () => {
      mockReportRepository.findOneBy.mockResolvedValue(null);

      await expect(service.archiveReport('non-existent')).rejects.toThrow(
        'Report with ID non-existent not found.'
      );
    });
  });

  describe('unarchiveReport', () => {
    it('should unarchive a report', async () => {
      const mockReport = { id: '123', isArchived: true };
      mockReportRepository.findOneBy.mockResolvedValue(mockReport);
      mockReportRepository.save.mockResolvedValue({ ...mockReport, isArchived: false });

      await service.unarchiveReport('123');

      expect(mockReport.isArchived).toBe(false);
      expect(reportRepository.save).toHaveBeenCalledWith(mockReport);
    });

    it('should throw error when report not found', async () => {
      mockReportRepository.findOneBy.mockResolvedValue(null);

      await expect(service.unarchiveReport('non-existent')).rejects.toThrow(
        'Report with ID non-existent not found.'
      );
    });
  });

  describe('publishReport', () => {
    it('should publish a report', async () => {
      const mockReport = { id: '123', isPublic: false };
      mockReportRepository.findOneBy.mockResolvedValue(mockReport);
      mockReportRepository.save.mockResolvedValue({ ...mockReport, isPublic: true });

      await service.publishReport('123');

      expect(mockReport.isPublic).toBe(true);
      expect(reportRepository.save).toHaveBeenCalledWith(mockReport);
    });

    it('should throw error when report not found', async () => {
      mockReportRepository.findOneBy.mockResolvedValue(null);

      await expect(service.publishReport('non-existent')).rejects.toThrow(
        'Report with ID non-existent not found.'
      );
    });
  });

  describe('unpublishReport', () => {
    it('should unpublish a report', async () => {
      const mockReport = { id: '123', isPublic: true };
      mockReportRepository.findOneBy.mockResolvedValue(mockReport);
      mockReportRepository.save.mockResolvedValue({ ...mockReport, isPublic: false });

      await service.unpublishReport('123');

      expect(mockReport.isPublic).toBe(false);
      expect(reportRepository.save).toHaveBeenCalledWith(mockReport);
    });

    it('should throw error when report not found', async () => {
      mockReportRepository.findOneBy.mockResolvedValue(null);

      await expect(service.unpublishReport('non-existent')).rejects.toThrow(
        'Report with ID non-existent not found.'
      );
    });
  });

  describe('getReportParameters', () => {
    it('should return parameters for a report', async () => {
      const mockReport = {
        id: '123',
        parameters: [
          { id: '1', name: 'param1' },
          { id: '2', name: 'param2' },
        ],
      };

      mockReportRepository.findOneBy.mockResolvedValue(mockReport);

      const result = await service.getReportParameters('123');

      expect(result).toEqual(mockReport.parameters);
    });

    it('should throw error when report not found', async () => {
      mockReportRepository.findOneBy.mockResolvedValue(null);

      await expect(service.getReportParameters('non-existent')).rejects.toThrow(
        'Report with ID non-existent not found.'
      );
    });
  });

  describe('getReportSchedules', () => {
    it('should return schedules for a report', async () => {
      const mockReport = {
        id: '123',
        schedules: [
          { id: '1', cron: '0 0 * * *' },
          { id: '2', cron: '0 12 * * *' },
        ],
      };

      mockReportRepository.findOneBy.mockResolvedValue(mockReport);

      const result = await service.getReportSchedules('123');

      expect(result).toEqual(mockReport.schedules);
    });

    it('should throw error when report not found', async () => {
      mockReportRepository.findOneBy.mockResolvedValue(null);

      await expect(service.getReportSchedules('non-existent')).rejects.toThrow(
        'Report with ID non-existent not found.'
      );
    });
  });

  describe('previewReport', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should preview a report with valid definition', async () => {
      const reportDefinition = {
        name: 'Preview Report',
        dataSource: {
          id: 'ds-1',
          type: 'sqlserver',
          schema: {
            tables: [
              {
                name: 'Users',
                schema: 'dbo',
                columns: [
                  { name: 'id', type: 'int' },
                  { name: 'name', type: 'varchar' },
                ],
              },
            ],
          },
        },
        selectedFields: [
          { tableName: 'Users', fieldName: 'id', displayName: 'ID', schema: 'dbo' },
          { tableName: 'Users', fieldName: 'name', displayName: 'Name', schema: 'dbo' },
        ],
        filters: [],
        groupBy: [],
        sorting: [],
      };

      const mockQuery = 'SELECT id, name FROM dbo.Users';
      const mockData = [
        { ID: 1, Name: 'John' },
        { ID: 2, Name: 'Jane' },
      ];
      const mockCountResult = [{ total: 2 }];

      mockQueryBuilderService.buildQuery
        .mockResolvedValueOnce(mockQuery)
        .mockResolvedValueOnce('SELECT COUNT(*) as total FROM dbo.Users');
      mockQueryBuilderService.executeQuery
        .mockResolvedValueOnce(mockData)
        .mockResolvedValueOnce(mockCountResult);

      const result = await service.previewReport(reportDefinition);

      expect(result).toEqual({
        data: mockData,
        totalRows: 2,
        executionTime: expect.any(Number),
        query: mockQuery,
      });
    });

    it('should throw error when report definition is missing', async () => {
      await expect(service.previewReport(null)).rejects.toThrow('Report definition is required');
    });

    it('should throw error when data source is missing', async () => {
      await expect(service.previewReport({ selectedFields: [] })).rejects.toThrow(
        'Report must have a valid data source'
      );
    });

    it('should throw error when data source ID is missing', async () => {
      await expect(
        service.previewReport({
          dataSource: {},
          selectedFields: [],
        })
      ).rejects.toThrow('Report must have a valid data source');
    });

    it('should throw error when no selected fields', async () => {
      await expect(
        service.previewReport({
          dataSource: { id: 'ds-1' },
          selectedFields: [],
        })
      ).rejects.toThrow('Report must have at least one selected field');
    });

    it('should use default limit of 100', async () => {
      const reportDefinition = {
        dataSource: {
          id: 'ds-1',
          type: 'sqlserver',
          schema: { tables: [{ name: 'Test', schema: 'dbo', columns: [{ name: 'id' }] }] },
        },
        selectedFields: [{ tableName: 'Test', fieldName: 'id', schema: 'dbo' }],
      };

      mockQueryBuilderService.buildQuery.mockResolvedValue('SELECT *');
      mockQueryBuilderService.executeQuery.mockResolvedValue([]);

      await service.previewReport(reportDefinition);

      expect(queryBuilderService.buildQuery).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 }),
        {},
        'mssql'
      );
    });

    it('should use custom limit from definition', async () => {
      const reportDefinition = {
        dataSource: {
          id: 'ds-1',
          type: 'sqlserver',
          schema: { tables: [{ name: 'Test', schema: 'dbo', columns: [{ name: 'id' }] }] },
        },
        selectedFields: [{ tableName: 'Test', fieldName: 'id', schema: 'dbo' }],
        limit: 50,
      };

      mockQueryBuilderService.buildQuery.mockResolvedValue('SELECT *');
      mockQueryBuilderService.executeQuery.mockResolvedValue([]);

      await service.previewReport(reportDefinition);

      expect(queryBuilderService.buildQuery).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 }),
        {},
        'mssql'
      );
    });
  });

  describe('exportToExcel', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should export report to Excel', async () => {
      const reportDefinition = {
        name: 'Export Test',
        dataSource: {
          id: 'ds-1',
          type: 'sqlserver',
          schema: { tables: [{ name: 'Test', schema: 'dbo', columns: [{ name: 'id' }] }] },
        },
        selectedFields: [
          { tableName: 'Test', fieldName: 'id', displayName: 'ID', schema: 'dbo' },
        ],
      };

      const mockData = [{ ID: 1 }, { ID: 2 }, { ID: 3 }];
      mockQueryBuilderService.buildQuery.mockResolvedValue('SELECT *');
      mockQueryBuilderService.executeQuery.mockResolvedValue(mockData);

      const result = await service.exportToExcel(reportDefinition);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toMatch(/Export Test_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.xlsx/);
    });

    it('should use default filename when name is missing', async () => {
      const reportDefinition = {
        dataSource: {
          id: 'ds-1',
          type: 'sqlserver',
          schema: { tables: [{ name: 'Test', schema: 'dbo', columns: [{ name: 'id' }] }] },
        },
        selectedFields: [{ tableName: 'Test', fieldName: 'id', schema: 'dbo' }],
      };

      mockQueryBuilderService.buildQuery.mockResolvedValue('SELECT *');
      mockQueryBuilderService.executeQuery.mockResolvedValue([]);

      const result = await service.exportToExcel(reportDefinition);

      expect(result.filename).toMatch(/report_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.xlsx/);
    });

    it('should log export statistics', async () => {
      const reportDefinition = {
        name: 'Stats Test',
        dataSource: {
          id: 'ds-1',
          type: 'sqlserver',
          schema: { tables: [{ name: 'Test', schema: 'dbo', columns: [{ name: 'id' }] }] },
        },
        selectedFields: [{ tableName: 'Test', fieldName: 'id', schema: 'dbo' }],
      };

      mockQueryBuilderService.buildQuery.mockResolvedValue('SELECT *');
      mockQueryBuilderService.executeQuery.mockResolvedValue([{ id: 1 }]);

      await service.exportToExcel(reportDefinition);

      expect(consoleLogSpy).toHaveBeenCalledWith('📊 Starting Excel export for:', 'Stats Test');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Excel export completed'));
    });
  });
});
