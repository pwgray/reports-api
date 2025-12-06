import { Module } from "@nestjs/common";
import { ReportGeneratorService } from "./report-generator.service";

/**
 * Report Generator Module
 * 
 * This NestJS module provides functionality for generating reports in various formats
 * (HTML, PDF, Excel) from query results. It handles template rendering, formatting,
 * and file generation for the reports system.
 * 
 * @module ReportGeneratorModule
 * 
 * @description
 * The ReportGeneratorModule encapsulates:
 * - **Report Generation**: Converting query results into formatted reports
 * - **Format Support**: HTML, PDF, and Excel output formats
 * - **Template Rendering**: HTML template processing and styling
 * - **File Generation**: Creating downloadable report files
 * 
 * @exports
 * - `ReportGeneratorService`: Service for generating reports in various formats
 * 
 * @imports
 * - None (standalone module)
 * 
 * @controllers
 * - None (service-only module, used by other modules)
 * 
 * @example
 * ```typescript
 * // Import the module in your app module
 * import { ReportGeneratorModule } from './modules/report-generator/report-generator.module';
 * 
 * @Module({
 *   imports: [ReportGeneratorModule],
 * })
 * export class AppModule {}
 * 
 * // Use the exported service in other modules
 * import { ReportGeneratorService } from './modules/report-generator/report-generator.module';
 * 
 * constructor(private readonly reportGenerator: ReportGeneratorService) {}
 * 
 * // Generate a PDF report
 * const report = await this.reportGenerator.generate(
 *   queryResults,
 *   'pdf',
 *   { title: 'Sales Report' }
 * );
 * ```
 */
@Module({
  imports: [],
  controllers: [],
  providers: [ReportGeneratorService],
  exports: [ReportGeneratorService],
})
export class ReportGeneratorModule {}