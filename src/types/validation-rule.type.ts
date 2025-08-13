export interface ValidationRule {
  rule: string;
  message: string;
  params?: any[];
  pattern: string;
  value: any;
  values: string[];
  type?: string;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  required?: boolean;
  customFunction?: (value: any) => boolean | string; // Custom validation function
}