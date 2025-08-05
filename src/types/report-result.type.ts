import { ReportParameter } from "src/entities/report-parameter.entity";
import { LayoutConfiguration } from "./layout-configuration.type";
import { QueryConfiguration } from "./query-configuration.type";

export interface ReportResult {
  content: any;
  mimeType: string;
  fileName: string;  
}

