import { BadRequestException } from "@nestjs/common";
import { ReportParameter } from "src/entities/report-parameter.entity";
import { Report } from "src/entities/report.entity";

/**
 * Service for validating report parameters.
 * 
 * This service provides functionality to:
 * - Validate report parameters against their defined rules
 * - Check required parameter presence
 * - Apply validation rules (regex, length, value ranges, enums)
 * - Provide descriptive error messages for validation failures
 * 
 * The service ensures that user-provided parameters meet the requirements
 * defined in the report's parameter configuration before executing the report.
 * This prevents invalid queries and provides clear feedback to users.
 * 
 * @class ReportValidationService
 */
export class ReportValidationService {
    /**
     * Validates all parameters for a report against their configuration.
     * 
     * Checks that all required parameters are provided and that all provided
     * parameters (required or optional) pass their validation rules. Throws
     * descriptive errors if validation fails.
     * 
     * @param {Report} report - The report entity containing parameter definitions
     * @param {any} parameters - Object mapping parameter names to their values
     * @returns {void}
     * @throws {BadRequestException} If the report or parameters are invalid
     * @throws {BadRequestException} If a required parameter is missing
     * @throws {BadRequestException} If a parameter value fails validation rules
     * 
     * @example
     * const report = {
     *   parameters: [
     *     { name: 'startDate', required: true, type: ParameterType.DATE },
     *     { name: 'customerId', required: false, validationRules: [{ type: 'regex', pattern: '^C\\d+$' }] }
     *   ]
     * };
     * 
     * // Valid call
     * validationService.validateReportParameters(report, { startDate: '2024-01-01', customerId: 'C123' });
     * 
     * // Throws: Missing required parameter: startDate
     * validationService.validateReportParameters(report, { customerId: 'C123' });
     * 
     * @remarks
     * - Validates required parameters first, then applies validation rules
     * - Only validates non-null/undefined values (optional parameters can be omitted)
     * - Each parameter's validation rules are applied sequentially
     * - Stops at first validation failure and throws descriptive error
     */
    validateReportParameters(report: Report, parameters: any): void {
        if (!report || !report.parameters) {
            throw new BadRequestException("Invalid report or parameters");
        }   
        report.parameters.forEach(param => {
            const value = parameters[param.name];
            if (param.required && (value === undefined || value === null)) {
                throw new BadRequestException(`Missing required parameter: ${param.name}`);
            }
            if (value !== undefined && value !== null) {
                this.validateParameterValue(param, value);
            }
        });
    }
    /**
     * Validates a single parameter value against its validation rules.
     * 
     * Applies all validation rules defined for a parameter, checking each rule
     * type (regex, length, value ranges, enums) and throwing descriptive errors
     * if any rule fails.
     * 
     * @private
     * @param {ReportParameter} param - The parameter configuration with validation rules
     * @param {any} value - The value to validate
     * @returns {void}
     * @throws {BadRequestException} If the value fails any validation rule
     * @throws {BadRequestException} If an unknown validation rule type is encountered
     * 
     * @remarks
     * Supported validation rule types:
     * - `regex`: Validates value against a regular expression pattern
     * - `minLength`: Ensures string/array value has minimum length
     * - `maxLength`: Ensures string/array value has maximum length
     * - `minValue`: Ensures numeric value is at least the specified minimum
     * - `maxValue`: Ensures numeric value is at most the specified maximum
     * - `enum`: Ensures value is one of the allowed enum values
     * 
     * @example
     * // Regex validation
     * validateParameterValue(
     *   { name: 'email', validationRules: [{ type: 'regex', pattern: '^[^@]+@[^@]+\\.[^@]+$', message: 'Invalid email format' }] },
     *   'user@example.com'
     * );
     * 
     * // Length validation
     * validateParameterValue(
     *   { name: 'code', validationRules: [{ type: 'minLength', value: 5 }] },
     *   'ABC12' // Must be at least 5 characters
     * );
     * 
     * // Value range validation
     * validateParameterValue(
     *   { name: 'age', validationRules: [{ type: 'minValue', value: 18 }, { type: 'maxValue', value: 100 }] },
     *   25
     * );
     * 
     * // Enum validation
     * validateParameterValue(
     *   { name: 'status', validationRules: [{ type: 'enum', values: ['active', 'inactive', 'pending'] }] },
     *   'active'
     * );
     */
    private validateParameterValue(param: ReportParameter, value: any): void {
        if (param.validationRules) {
            param.validationRules.forEach(rule => {
                switch (rule.type) {
                    case 'regex':
                        if (!new RegExp(rule.pattern).test(value)) {
                            throw new BadRequestException(`Parameter ${param.name} does not match validation rule: ${rule.message}`);
                        }       
                        break;
                    case 'minLength':
                        if (value.length < rule.value) {
                            throw new BadRequestException(`Parameter ${param.name} must be at least ${rule.value} characters long`);
                        }
                        break;
                    case 'maxLength':
                        if (value.length > rule.value) {
                            throw new BadRequestException(`Parameter ${param.name} must be at most ${rule.value} characters long`);
                        }   
                        break;
                    case 'minValue':
                        if (value < rule.value) {
                            throw new BadRequestException(`Parameter ${param.name} must be at least ${rule.value}`);
                        }
                        break;
                    case 'maxValue':
                        if (value > rule.value) {
                            throw new BadRequestException(`Parameter ${param.name} must be at most ${rule.value}`);
                        }
                        break;
                    case 'enum':
                        if (!rule.values.includes(value)) {
                            throw new BadRequestException(`Parameter ${param.name} must be one of: ${rule.values.join(', ')}`);
                        }
                        break;
                    default:
                        throw new BadRequestException(`Unknown validation rule type: ${rule.type}`);
                }   
            });
        }
    }
}