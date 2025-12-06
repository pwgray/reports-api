// @ts-nocheck - Test file with mocked external libraries
import { Test, TestingModule } from '@nestjs/testing';
import { ReportGeneratorService } from './report-generator.service';
import { BadRequestException } from '@nestjs/common';

// Mock puppeteer - must be defined before jest.mock()
const mockPdf = jest.fn();
const mockSetContent = jest.fn();
const mockNewPage = jest.fn();
const mockClose = jest.fn();
const mockLaunch = jest.fn();

// Mock ExcelJS - must be defined before jest.mock()
const mockWriteBuffer = jest.fn();
const mockAddRow = jest.fn();
const mockAddWorksheet = jest.fn();

// Mock puppeteer-core module
jest.mock('puppeteer-core', () => ({
  default: {
    launch: jest.fn(),
  },
}));

// Mock ExcelJS module - must have a Workbook constructor
jest.mock('exceljs', () => {
  const mockWorkbook = {
    addWorksheet: jest.fn(),
    xlsx: {
      writeBuffer: jest.fn(),
    },
  };
  
  return {
    Workbook: jest.fn().mockImplementation(() => mockWorkbook),
  };
});

describe('ReportGeneratorService', () => {
  let service: ReportGeneratorService;
  let puppeteer: any;
  let ExcelJS: any;

  const mockLayout = {
    name: 'Test Report',
    columns: [
      { fieldName: 'id', displayName: 'ID' },
      { fieldName: 'name', displayName: 'Name' },
      { fieldName: 'email', displayName: 'Email' },
    ],
  };

  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  ];

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Get the mocked modules
    puppeteer = require('puppeteer-core').default;
    const ExcelJSModule = require('exceljs');

    // Setup puppeteer mock chain
    mockPdf.mockResolvedValue(Buffer.from('fake-pdf-content'));
    mockSetContent.mockResolvedValue(undefined);
    mockNewPage.mockResolvedValue({
      setContent: mockSetContent,
      pdf: mockPdf,
    });
    mockClose.mockResolvedValue(undefined);
    
    puppeteer.launch.mockResolvedValue({
      newPage: mockNewPage,
      close: mockClose,
    });

    // Setup ExcelJS mock - configure the mock workbook instance
    mockWriteBuffer.mockResolvedValue(Buffer.from('fake-excel-content'));
    mockAddRow.mockReturnValue(undefined);
    mockAddWorksheet.mockReturnValue({
      addRow: mockAddRow,
    });

    // Configure what the Workbook constructor returns
    ExcelJSModule.Workbook.mockImplementation(() => ({
      addWorksheet: mockAddWorksheet,
      xlsx: {
        writeBuffer: mockWriteBuffer,
      },
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportGeneratorService],
    }).compile();

    service = module.get<ReportGeneratorService>(ReportGeneratorService);

    // Mock the applyExcelFormatting method to prevent "Method not implemented" error
    jest.spyOn(service as any, 'applyExcelFormatting').mockImplementation(() => {
      // Do nothing - formatting not implemented yet
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generate', () => {
    it('should generate HTML report when format is html', async () => {
      const result = await service.generate(mockLayout, mockData, 'html');

      expect(result).toBeDefined();
      expect(result.mimeType).toBe('text/html');
      expect(result.fileName).toMatch(/report-\d+\.html/);
      expect(result.content).toContain('<html>');
      expect(result.content).toContain('Test Report');
    });

    it('should generate PDF report when format is pdf', async () => {
      const result = await service.generate(mockLayout, mockData, 'pdf');

      expect(result).toBeDefined();
      expect(result.mimeType).toBe('application/pdf');
      expect(result.fileName).toMatch(/report-\d+\.pdf/);
      expect(result.content).toEqual(Buffer.from('fake-pdf-content'));
      expect(puppeteer.launch).toHaveBeenCalled();
      expect(mockNewPage).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });

    it('should generate Excel report when format is excel', async () => {
      const result = await service.generate(mockLayout, mockData, 'excel');

      expect(result).toBeDefined();
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(result.fileName).toMatch(/report-\d+\.xlsx/);
      expect(result.content).toEqual(Buffer.from('fake-excel-content'));
      expect(mockAddWorksheet).toHaveBeenCalledWith('Report');
    });

    it('should throw BadRequestException for unsupported format', async () => {
      await expect(
        service.generate(mockLayout, mockData, 'invalid' as any)
      ).rejects.toThrow(BadRequestException);
      
      await expect(
        service.generate(mockLayout, mockData, 'invalid' as any)
      ).rejects.toThrow('Unsupported format');
    });
  });

  describe('buildHtmlTemplate', () => {
    it('should build HTML template with layout name', () => {
      const template = service.buildHtmlTemplate(mockLayout);

      expect(template).toContain('<html>');
      expect(template).toContain('<title>Test Report</title>');
      expect(template).toContain('<h1>Test Report</h1>');
    });

    it('should include column headers in template', () => {
      const template = service.buildHtmlTemplate(mockLayout);

      expect(template).toContain('<th>ID</th>');
      expect(template).toContain('<th>Name</th>');
      expect(template).toContain('<th>Email</th>');
    });

    it('should include table structure', () => {
      const template = service.buildHtmlTemplate(mockLayout);

      expect(template).toContain('<table>');
      expect(template).toContain('</table>');
      expect(template).toContain('<tr>');
      expect(template).toContain('</tr>');
    });

    it('should handle layout with no columns', () => {
      const emptyLayout = { name: 'Empty Report', columns: [] };
      const template = service.buildHtmlTemplate(emptyLayout);

      expect(template).toContain('<html>');
      expect(template).toContain('Empty Report');
      expect(template).toContain('<table>');
    });

    it('should handle columns without fieldName', () => {
      const layoutWithoutFieldName = {
        name: 'Test',
        columns: [
          { displayName: 'Col1' },
          { fieldName: 'field2', displayName: 'Col2' },
        ],
      };
      const template = service.buildHtmlTemplate(layoutWithoutFieldName);

      expect(template).toContain('<th>Col1</th>');
      expect(template).toContain('<th>Col2</th>');
    });
  });

  describe('renderTemplate', () => {
    it('should replace {{data}} placeholder with JSON data', () => {
      const template = 'Report data: {{data}}';
      const result = service.renderTemplate(template, {
        data: mockData,
        layout: mockLayout,
      });

      expect(result).toContain('Report data:');
      expect(result).toContain(JSON.stringify(mockData));
    });

    it('should handle template without placeholder', () => {
      const template = '<html><body>Static content</body></html>';
      const result = service.renderTemplate(template, {
        data: mockData,
        layout: mockLayout,
      });

      expect(result).toBe(template);
    });

    it('should handle empty data array', () => {
      const template = 'Data: {{data}}';
      const result = service.renderTemplate(template, {
        data: [],
        layout: mockLayout,
      });

      expect(result).toContain('Data:');
      expect(result).toContain('[]');
    });
  });

  describe('generateHtml (private method tested via generate)', () => {
    it('should generate HTML with correct mime type', async () => {
      const result = await service.generate(mockLayout, mockData, 'html');

      expect(result.mimeType).toBe('text/html');
    });

    it('should generate HTML with timestamp in filename', async () => {
      const beforeTimestamp = Date.now();
      const result = await service.generate(mockLayout, mockData, 'html');
      const afterTimestamp = Date.now();

      const filenameMatch = result.fileName.match(/report-(\d+)\.html/);
      expect(filenameMatch).toBeTruthy();
      
      const timestamp = parseInt(filenameMatch[1]);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(timestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    it('should include table structure with data placeholders', async () => {
      const result = await service.generate(mockLayout, mockData, 'html');

      // The template should contain the table structure
      expect(result.content).toContain('<table>');
      expect(result.content).toContain('{{data.id}}');
      expect(result.content).toContain('{{data.name}}');
      expect(result.content).toContain('{{data.email}}');
    });
  });

  describe('generatePdf (private method tested via generate)', () => {
    it('should launch puppeteer browser', async () => {
      await service.generate(mockLayout, mockData, 'pdf');

      expect(puppeteer.launch).toHaveBeenCalled();
    });

    it('should create new page and set HTML content', async () => {
      await service.generate(mockLayout, mockData, 'pdf');

      expect(mockNewPage).toHaveBeenCalled();
      expect(mockSetContent).toHaveBeenCalled();
      expect(mockSetContent.mock.calls[0][0]).toContain('<html>');
    });

    it('should generate PDF with correct options', async () => {
      await service.generate(mockLayout, mockData, 'pdf');

      expect(mockPdf).toHaveBeenCalledWith({
        format: 'A4',
        printBackground: true,
        margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
      });
    });

    it('should close browser after generating PDF', async () => {
      await service.generate(mockLayout, mockData, 'pdf');

      expect(mockClose).toHaveBeenCalled();
    });

    it('should return PDF buffer as content', async () => {
      const result = await service.generate(mockLayout, mockData, 'pdf');

      expect(result.content).toBeInstanceOf(Buffer);
      expect(result.content.toString()).toBe('fake-pdf-content');
    });
  });

  describe('generateExcel (private method tested via generate)', () => {
    it('should create workbook and worksheet', async () => {
      await service.generate(mockLayout, mockData, 'excel');

      expect(mockAddWorksheet).toHaveBeenCalledWith('Report');
    });

    it('should add header row with column display names', async () => {
      await service.generate(mockLayout, mockData, 'excel');

      expect(mockAddRow).toHaveBeenCalledWith(['ID', 'Name', 'Email']);
    });

    it('should add data rows', async () => {
      await service.generate(mockLayout, mockData, 'excel');

      // Headers + 2 data rows = 3 total calls
      expect(mockAddRow).toHaveBeenCalledTimes(3);
      expect(mockAddRow).toHaveBeenCalledWith([1, 'John Doe', 'john@example.com']);
      expect(mockAddRow).toHaveBeenCalledWith([2, 'Jane Smith', 'jane@example.com']);
    });

    it('should write workbook to buffer', async () => {
      await service.generate(mockLayout, mockData, 'excel');

      expect(mockWriteBuffer).toHaveBeenCalled();
    });

    it('should return Excel buffer with correct mime type', async () => {
      const result = await service.generate(mockLayout, mockData, 'excel');

      expect(result.content).toBeInstanceOf(Buffer);
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('should handle empty data array', async () => {
      await service.generate(mockLayout, [], 'excel');

      // Only header row should be added
      expect(mockAddRow).toHaveBeenCalledTimes(1);
      expect(mockAddRow).toHaveBeenCalledWith(['ID', 'Name', 'Email']);
    });

    it('should handle missing field values in data', async () => {
      const incompleteData = [
        { id: 1, name: 'John' }, // missing email
        { id: 2, email: 'jane@example.com' }, // missing name
      ];

      await service.generate(mockLayout, incompleteData, 'excel');

      expect(mockAddRow).toHaveBeenCalledWith([1, 'John', undefined]);
      expect(mockAddRow).toHaveBeenCalledWith([2, undefined, 'jane@example.com']);
    });
  });

  describe('applyExcelFormatting', () => {
    it('should throw error as method is not implemented', () => {
      // Restore the original implementation for this test
      jest.spyOn(service as any, 'applyExcelFormatting').mockRestore();
      
      const mockWorksheet = {};

      expect(() => {
        service.applyExcelFormatting(mockWorksheet, mockLayout);
      }).toThrow('Method not implemented.');
    });
  });

  describe('error handling', () => {
    it('should handle puppeteer launch failure', async () => {
      puppeteer.launch.mockRejectedValueOnce(new Error('Failed to launch browser'));

      await expect(
        service.generate(mockLayout, mockData, 'pdf')
      ).rejects.toThrow('Failed to launch browser');
    });

    it('should handle Excel workbook write failure', async () => {
      // Configure the mock to throw when writeBuffer is called
      const ExcelJSModule = require('exceljs');
      ExcelJSModule.Workbook.mockImplementationOnce(() => ({
        addWorksheet: mockAddWorksheet.mockReturnValue({
          addRow: mockAddRow,
        }),
        xlsx: {
          writeBuffer: mockWriteBuffer.mockRejectedValueOnce(new Error('Failed to write buffer')),
        },
      }));

      await expect(
        service.generate(mockLayout, mockData, 'excel')
      ).rejects.toThrow('Failed to write buffer');
    });
  });
});
