import { ReportParameter } from "src/entities/report-parameter.entity";
import { LayoutConfiguration } from "./layout-configuration.type";
import { QueryConfiguration } from "./query-configuration.type";

/**
 * Represents the result of a generated report.
 * 
 * This interface defines the structure for report generation results,
 * containing the actual report content, its MIME type, and the filename
 * for download or storage purposes.
 * 
 * @interface ReportResult
 * 
 * @property {any} content - The actual report content. Can be a Buffer (for binary formats like PDF/Excel) or a string (for HTML/text formats)
 * @property {string} mimeType - MIME type of the report content (e.g., 'application/pdf', 'text/html', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
 * @property {string} fileName - Suggested filename for the report download (typically includes timestamp for uniqueness)
 * 
 * @example
 * const result: ReportResult = {
 *   content: pdfBuffer,
 *   mimeType: 'application/pdf',
 *   fileName: 'sales-report-2024-01-15T10-30-00.pdf'
 * };
 */
export interface ReportResult {
  /** The actual report content. Can be a Buffer (for binary formats like PDF/Excel) or a string (for HTML/text formats) */
  content: any;
  /** MIME type of the report content (e.g., 'application/pdf', 'text/html', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') */
  mimeType: string;
  /** Suggested filename for the report download (typically includes timestamp for uniqueness) */
  fileName: string;  
}

