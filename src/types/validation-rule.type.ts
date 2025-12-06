/**
 * Defines a validation rule for report parameters or field values.
 * 
 * This interface represents a validation rule that can be applied to
 * parameter values or field data to ensure data quality and correctness.
 * Supports multiple validation types including regex patterns, length
 * constraints, value ranges, enums, and custom validation functions.
 * 
 * @interface ValidationRule
 * 
 * @property {string} rule - Name or identifier of the validation rule
 * @property {string} message - Error message to display when validation fails
 * @property {any[]} [params] - Optional parameters for the validation rule
 * @property {string} pattern - Regular expression pattern for regex validation
 * @property {any} value - Value to validate against (for min/max comparisons)
 * @property {string[]} values - Array of allowed values (for enum validation)
 * @property {string} [type] - Type of validation rule ('regex', 'minLength', 'maxLength', 'minValue', 'maxValue', 'enum')
 * @property {number} [minLength] - Minimum length constraint for string/array values
 * @property {number} [maxLength] - Maximum length constraint for string/array values
 * @property {number} [minValue] - Minimum value constraint for numeric values
 * @property {number} [maxValue] - Maximum value constraint for numeric values
 * @property {boolean} [required] - Whether the value is required (cannot be null/undefined)
 * @property {(value: any) => boolean | string} [customFunction] - Custom validation function that returns true/false or an error message string
 * 
 * @example
 * // Regex validation
 * const emailRule: ValidationRule = {
 *   rule: 'email_format',
 *   message: 'Invalid email format',
 *   type: 'regex',
 *   pattern: '^[^@]+@[^@]+\\.[^@]+$',
 *   value: null,
 *   values: []
 * };
 * 
 * // Length validation
 * const lengthRule: ValidationRule = {
 *   rule: 'min_length',
 *   message: 'Value must be at least 5 characters',
 *   type: 'minLength',
 *   pattern: '',
 *   value: 5,
 *   values: [],
 *   minLength: 5
 * };
 * 
 * // Enum validation
 * const enumRule: ValidationRule = {
 *   rule: 'status_enum',
 *   message: 'Status must be one of: active, inactive, pending',
 *   type: 'enum',
 *   pattern: '',
 *   value: null,
 *   values: ['active', 'inactive', 'pending']
 * };
 * 
 * // Custom validation
 * const customRule: ValidationRule = {
 *   rule: 'custom_check',
 *   message: 'Custom validation failed',
 *   pattern: '',
 *   value: null,
 *   values: [],
 *   customFunction: (value: any) => {
 *     return value > 0 && value < 100;
 *   }
 * };
 */
export interface ValidationRule {
  /** Name or identifier of the validation rule */
  rule: string;
  /** Error message to display when validation fails */
  message: string;
  /** Optional parameters for the validation rule */
  params?: any[];
  /** Regular expression pattern for regex validation */
  pattern: string;
  /** Value to validate against (for min/max comparisons) */
  value: any;
  /** Array of allowed values (for enum validation) */
  values: string[];
  /** Type of validation rule ('regex', 'minLength', 'maxLength', 'minValue', 'maxValue', 'enum') */
  type?: string;
  /** Minimum length constraint for string/array values */
  minLength?: number;
  /** Maximum length constraint for string/array values */
  maxLength?: number;
  /** Minimum value constraint for numeric values */
  minValue?: number;
  /** Maximum value constraint for numeric values */
  maxValue?: number;
  /** Whether the value is required (cannot be null/undefined) */
  required?: boolean;
  /** Custom validation function that returns true/false or an error message string */
  customFunction?: (value: any) => boolean | string;
}