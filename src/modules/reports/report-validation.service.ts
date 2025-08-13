import { BadRequestException } from "@nestjs/common";
import { ReportParameter } from "src/entities/report-parameter.entity";
import { Report } from "src/entities/report.entity";

export class ReportValidationService {
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