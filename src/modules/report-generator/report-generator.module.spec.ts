import { Test } from '@nestjs/testing';
import { ReportGeneratorModule } from './report-generator.module';
import { ReportGeneratorService } from './report-generator.service';

describe('ReportGeneratorModule', () => {
  it('should be defined', () => {
    expect(ReportGeneratorModule).toBeDefined();
  });

  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [ReportGeneratorModule],
    }).compile();

    expect(module).toBeDefined();
  });

  it('should provide ReportGeneratorService', async () => {
    const module = await Test.createTestingModule({
      imports: [ReportGeneratorModule],
    }).compile();

    const service = module.get(ReportGeneratorService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ReportGeneratorService);
  });

  it('should export ReportGeneratorService', async () => {
    const module = await Test.createTestingModule({
      imports: [ReportGeneratorModule],
    }).compile();

    const exportedService = module.get(ReportGeneratorService);
    expect(exportedService).toBeDefined();
    expect(exportedService).toBeInstanceOf(ReportGeneratorService);
  });
});
