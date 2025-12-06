// @ts-nocheck - Test file with mock structures
import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report } from 'src/entities/report.entity';
import { Response } from 'express';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: ReportsService;

  const mockReportsService = {
    getReports: jest.fn(),
    getReport: jest.fn(),
    createReport: jest.fn(),
    updateReport: jest.fn(),
    deleteReport: jest.fn(),
    previewReport: jest.fn(),
    exportToExcel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getReports', () => {
    it('should return an array of reports', async () => {
      const mockReports = [
        { id: '1', name: 'Report 1' },
        { id: '2', name: 'Report 2' },
      ] as Report[];

      mockReportsService.getReports.mockResolvedValue(mockReports);

      const result = await controller.getReports();

      expect(result).toEqual(mockReports);
      expect(service.getReports).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no reports exist', async () => {
      mockReportsService.getReports.mockResolvedValue([]);

      const result = await controller.getReports();

      expect(result).toEqual([]);
      expect(service.getReports).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from service', async () => {
      const error = new Error('Database error');
      mockReportsService.getReports.mockRejectedValue(error);

      await expect(controller.getReports()).rejects.toThrow('Database error');
    });
  });

  describe('getReport', () => {
    it('should return a single report by id', async () => {
      const mockReport = {
        id: '123',
        name: 'Test Report',
        dataSource: { id: 'ds-1' },
      } as Report;

      mockReportsService.getReport.mockResolvedValue(mockReport);

      const result = await controller.getReport('123');

      expect(result).toEqual(mockReport);
      expect(service.getReport).toHaveBeenCalledWith('123');
      expect(service.getReport).toHaveBeenCalledTimes(1);
    });

    it('should return null when report not found', async () => {
      mockReportsService.getReport.mockResolvedValue(null);

      const result = await controller.getReport('non-existent');

      expect(result).toBeNull();
      expect(service.getReport).toHaveBeenCalledWith('non-existent');
    });

    it('should handle different ID formats', async () => {
      const uuidId = '550e8400-e29b-41d4-a716-446655440000';
      mockReportsService.getReport.mockResolvedValue({ id: uuidId } as Report);

      await controller.getReport(uuidId);

      expect(service.getReport).toHaveBeenCalledWith(uuidId);
    });
  });

  describe('createReport', () => {
    it('should create a new report', async () => {
      const newReport = {
        name: 'New Report',
        description: 'Test description',
      } as Report;

      const createdReport = {
        ...newReport,
        id: '456',
        createdAt: new Date(),
      } as Report;

      mockReportsService.createReport.mockResolvedValue(createdReport);

      const result = await controller.createReport(newReport);

      expect(result).toEqual(createdReport);
      expect(service.createReport).toHaveBeenCalledWith(newReport);
      expect(service.createReport).toHaveBeenCalledTimes(1);
    });

    it('should handle report with all properties', async () => {
      const complexReport = {
        name: 'Complex Report',
        description: 'With all fields',
        queryConfig: { fields: [] },
        layoutConfig: { name: 'Layout' },
        dataSource: { id: 'ds-1' },
      } as Report;

      mockReportsService.createReport.mockResolvedValue(complexReport);

      const result = await controller.createReport(complexReport);

      expect(result).toEqual(complexReport);
      expect(service.createReport).toHaveBeenCalledWith(complexReport);
    });

    it('should propagate validation errors', async () => {
      const invalidReport = {} as Report;
      const error = new Error('Validation failed');
      mockReportsService.createReport.mockRejectedValue(error);

      await expect(controller.createReport(invalidReport)).rejects.toThrow('Validation failed');
    });
  });

  describe('updateReport', () => {
    it('should update an existing report', async () => {
      const reportId = '789';
      const updateData = {
        name: 'Updated Report',
        description: 'Updated description',
      } as Report;

      const updatedReport = {
        ...updateData,
        id: reportId,
        updatedAt: new Date(),
      } as Report;

      mockReportsService.updateReport.mockResolvedValue(updatedReport);

      const result = await controller.updateReport(reportId, updateData);

      expect(result).toEqual(updatedReport);
      expect(service.updateReport).toHaveBeenCalledWith(reportId, updateData);
      expect(service.updateReport).toHaveBeenCalledTimes(1);
    });

    it('should handle partial updates', async () => {
      const reportId = '123';
      const partialUpdate = { name: 'New Name' } as Report;

      mockReportsService.updateReport.mockResolvedValue({ id: reportId, ...partialUpdate } as Report);

      await controller.updateReport(reportId, partialUpdate);

      expect(service.updateReport).toHaveBeenCalledWith(reportId, partialUpdate);
    });

    it('should propagate errors for non-existent reports', async () => {
      const error = new Error('Report not found');
      mockReportsService.updateReport.mockRejectedValue(error);

      await expect(controller.updateReport('999', {} as Report)).rejects.toThrow('Report not found');
    });
  });

  describe('deleteReport', () => {
    it('should delete a report and return success', async () => {
      const reportId = '123';
      mockReportsService.deleteReport.mockResolvedValue(undefined);

      const result = await controller.deleteReport(reportId);

      expect(result).toEqual({ success: true });
      expect(service.deleteReport).toHaveBeenCalledWith(reportId);
      expect(service.deleteReport).toHaveBeenCalledTimes(1);
    });

    it('should handle deletion of non-existent report', async () => {
      mockReportsService.deleteReport.mockResolvedValue(undefined);

      const result = await controller.deleteReport('non-existent');

      expect(result).toEqual({ success: true });
    });

    it('should propagate deletion errors', async () => {
      const error = new Error('Cannot delete report');
      mockReportsService.deleteReport.mockRejectedValue(error);

      await expect(controller.deleteReport('123')).rejects.toThrow('Cannot delete report');
    });
  });

  describe('previewReport', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should preview a report with definition', async () => {
      const reportDefinition = {
        name: 'Preview Report',
        selectedFields: [{ fieldName: 'id' }, { fieldName: 'name' }],
      };

      const previewResult = {
        data: [{ id: 1, name: 'Test' }],
        totalRows: 1,
        executionTime: 100,
      };

      mockReportsService.previewReport.mockResolvedValue(previewResult);

      const result = await controller.previewReport(reportDefinition);

      expect(result).toEqual(previewResult);
      expect(service.previewReport).toHaveBeenCalledWith(reportDefinition);
      expect(consoleLogSpy).toHaveBeenCalledWith('🔥🔥🔥 PREVIEW ENDPOINT HIT! 🔥🔥🔥');
    });

    it('should log report name and field count', async () => {
      const reportDefinition = {
        name: 'Test Report',
        selectedFields: [{ fieldName: 'col1' }, { fieldName: 'col2' }, { fieldName: 'col3' }],
      };

      mockReportsService.previewReport.mockResolvedValue({ data: [], totalRows: 0 });

      await controller.previewReport(reportDefinition);

      expect(consoleLogSpy).toHaveBeenCalledWith('Report name:', 'Test Report');
      expect(consoleLogSpy).toHaveBeenCalledWith('Selected fields:', 3);
    });

    it('should handle undefined report definition properties', async () => {
      const reportDefinition = {};

      mockReportsService.previewReport.mockResolvedValue({ data: [], totalRows: 0 });

      await controller.previewReport(reportDefinition);

      expect(consoleLogSpy).toHaveBeenCalledWith('Report name:', undefined);
      expect(consoleLogSpy).toHaveBeenCalledWith('Selected fields:', undefined);
    });

    it('should propagate preview errors', async () => {
      const error = new Error('Preview failed');
      mockReportsService.previewReport.mockRejectedValue(error);

      await expect(controller.previewReport({})).rejects.toThrow('Preview failed');
    });
  });

  describe('exportToExcel', () => {
    let mockResponse: Partial<Response>;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      mockResponse = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
      };
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should export report to Excel successfully', async () => {
      const reportDefinition = {
        name: 'Export Report',
        selectedFields: [{ fieldName: 'id' }],
      };

      const buffer = Buffer.from('excel-data');
      const filename = 'report_2024-01-01.xlsx';

      mockReportsService.exportToExcel.mockResolvedValue({ buffer, filename });

      await controller.exportToExcel(reportDefinition, mockResponse as Response);

      expect(service.exportToExcel).toHaveBeenCalledWith(reportDefinition);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Length', buffer.length);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.send).toHaveBeenCalledWith(buffer);
    });

    it('should log export request', async () => {
      const reportDefinition = { name: 'Test Export' };
      mockReportsService.exportToExcel.mockResolvedValue({
        buffer: Buffer.from('data'),
        filename: 'test.xlsx',
      });

      await controller.exportToExcel(reportDefinition, mockResponse as Response);

      expect(consoleLogSpy).toHaveBeenCalledWith('📊 Excel export requested for:', 'Test Export');
    });

    it('should handle export errors gracefully', async () => {
      const reportDefinition = { name: 'Error Report' };
      const error = new Error('Export failed');
      mockReportsService.exportToExcel.mockRejectedValue(error);

      await controller.exportToExcel(reportDefinition, mockResponse as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Excel export error:', error);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Failed to export report to Excel',
        error: 'Export failed',
      });
    });

    it('should handle export with undefined report name', async () => {
      const reportDefinition = {};
      mockReportsService.exportToExcel.mockResolvedValue({
        buffer: Buffer.from('data'),
        filename: 'report.xlsx',
      });

      await controller.exportToExcel(reportDefinition, mockResponse as Response);

      expect(consoleLogSpy).toHaveBeenCalledWith('📊 Excel export requested for:', undefined);
    });

    it('should set correct headers for Excel file', async () => {
      const reportDefinition = { name: 'Headers Test' };
      const buffer = Buffer.from('test-data-12345');
      const filename = 'custom_filename.xlsx';

      mockReportsService.exportToExcel.mockResolvedValue({ buffer, filename });

      await controller.exportToExcel(reportDefinition, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledTimes(3);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Length', buffer.length);
    });

    it('should handle large Excel exports', async () => {
      const reportDefinition = { name: 'Large Report' };
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      const filename = 'large_report.xlsx';

      mockReportsService.exportToExcel.mockResolvedValue({ buffer: largeBuffer, filename });

      await controller.exportToExcel(reportDefinition, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Length', largeBuffer.length);
      expect(mockResponse.send).toHaveBeenCalledWith(largeBuffer);
    });
  });
});
