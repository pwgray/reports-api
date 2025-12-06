import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportValidationService } from './report-validation.service';
import { ReportParameterService } from './report-parameter.service';
import { EmailService } from './email-service';
import { Report } from 'src/entities/report.entity';
import { ReportParameter } from 'src/entities/report-parameter.entity';
import { ReportSchedule } from 'src/entities/report-schedule.entity';
import { QueryBuilderService } from '../query-builder/query-builder.service';
import { ReportGeneratorService } from '../report-generator/report-generator.service';
import { UserService } from '../users/user.service';

describe('ReportsModule', () => {
  let module: TestingModule;

  // Mock repositories
  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  // Mock services from other modules
  const mockUserService = {
    findOne: jest.fn(),
  };

  const mockQueryBuilderService = {
    buildQuery: jest.fn(),
    executeQuery: jest.fn(),
  };

  const mockReportGeneratorService = {
    generate: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        ReportsService,
        ReportValidationService,
        ReportParameterService,
        EmailService,
        {
          provide: getRepositoryToken(Report),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ReportParameter),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ReportSchedule),
          useValue: mockRepository,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: QueryBuilderService,
          useValue: mockQueryBuilderService,
        },
        {
          provide: ReportGeneratorService,
          useValue: mockReportGeneratorService,
        },
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have ReportsController', () => {
    const controller = module.get<ReportsController>(ReportsController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(ReportsController);
  });

  it('should have ReportsService', () => {
    const service = module.get<ReportsService>(ReportsService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ReportsService);
  });

  it('should have ReportValidationService', () => {
    const service = module.get<ReportValidationService>(ReportValidationService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ReportValidationService);
  });

  it('should have ReportParameterService', () => {
    const service = module.get<ReportParameterService>(ReportParameterService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ReportParameterService);
  });

  it('should have EmailService', () => {
    const service = module.get<EmailService>(EmailService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(EmailService);
  });

  it('should provide all required services', () => {
    expect(module.get<ReportsService>(ReportsService)).toBeDefined();
    expect(module.get<ReportParameterService>(ReportParameterService)).toBeDefined();
    expect(module.get<EmailService>(EmailService)).toBeDefined();
    expect(module.get<ReportValidationService>(ReportValidationService)).toBeDefined();
  });

  it('should inject UserService dependency', () => {
    const reportsService = module.get<ReportsService>(ReportsService);
    expect(reportsService).toBeDefined();
    // Service is properly instantiated with mocked UserService
  });

  it('should inject QueryBuilderService dependency', () => {
    const reportsService = module.get<ReportsService>(ReportsService);
    expect(reportsService).toBeDefined();
    // Service is properly instantiated with mocked QueryBuilderService
  });
});
