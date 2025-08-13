import { Injectable, BadRequestException } from "@nestjs/common";
import puppeteer from "puppeteer-core";
import { LayoutConfiguration } from "src/types/layout-configuration.type";
import { ReportResult } from "src/types/report-result.type";
var ExcelJS = require('exceljs');

// modules/report-generator/report-generator.service.ts
@Injectable()
export class ReportGeneratorService {
    async generate(
        layout: LayoutConfiguration,
        data: any[],
        format: 'html' | 'pdf' | 'excel'
    ): Promise<ReportResult> {
        switch (format) {
            case 'html':
                return await this.generateHtml(layout, data);
            case 'pdf':
                return await this.generatePdf(layout, data);
            case 'excel':
                return await this.generateExcel(layout, data);
            default:
                throw new BadRequestException('Unsupported format');
        }
    }

    private async generateHtml(layout: LayoutConfiguration, data: any[]): Promise<ReportResult> {
        const template = this.buildHtmlTemplate(layout);
        const html = this.renderTemplate(template, { data, layout });

        return {
            content: html,
            mimeType: 'text/html',
            fileName: `report-${Date.now()}.html`,
        };
    }

    renderTemplate(template: string, arg1: { data: any[]; layout: LayoutConfiguration; }) {
        // Implement template rendering logic here
        // This could use a templating engine like Handlebars, EJS, etc.
        // For simplicity, we will return a basic string representation
        return template.replace('{{data}}', JSON.stringify(arg1.data));
        // In a real implementation, you would replace this with actual rendering logic
        // using a templating engine.
        // Example: return handlebars.compile(template)(arg1);
    }

    buildHtmlTemplate(layout: LayoutConfiguration) {
        // Build HTML template based on layout configuration
        let template = `<html><head><title>${layout.name}</title></head><body>`;
        template += `<h1>${layout.name}</h1>`;
        template += `<table>`;
        template += `<tr>${layout.columns.map(col => `<th>${col.displayName}</th>`).join('')}</tr>`;
        layout.columns.forEach(col => {
            template += `<tr>${col.fieldName ? `<td>{{data.${col.fieldName}}}</td>` : ''}</tr>`;
        });
        template += `</table>`;
        template += `</body></html>`;
        return template;
    }


    private async generatePdf(layout: LayoutConfiguration, data: any[]): Promise<ReportResult> {
        const htmlResult = await this.generateHtml(layout, data);

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlResult.content);

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' }
        });

        await browser.close();

        return {
            content: pdf,
            mimeType: 'application/pdf',
            fileName: `report-${Date.now()}.pdf`,
        };
    }

    private async generateExcel(layout: LayoutConfiguration, data: any[]): Promise<ReportResult> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report');

        // Add headers
        const headers = layout.columns.map(col => col.displayName);
        worksheet.addRow(headers);

        // Add data rows
        data.forEach(row => {
            const values = layout.columns.map(col => row[col.fieldName]);
            worksheet.addRow(values);
        });

        // Apply formatting
        this.applyExcelFormatting(worksheet, layout);

        const buffer = await workbook.xlsx.writeBuffer();

        return {
            content: buffer,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            fileName: `report-${Date.now()}.xlsx`,
        };
    }

    applyExcelFormatting(worksheet: any, layout: LayoutConfiguration) {
        throw new Error("Method not implemented.");
    }
}