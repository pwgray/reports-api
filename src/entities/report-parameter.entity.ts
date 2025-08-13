import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Report } from './report.entity';
import { ParameterType } from 'src/types/parameter.type';
import { ValidationRule } from 'src/types/validation-rule.type';

// entities/report-parameter.entity.ts
@Entity('report_parameters')
export class ReportParameter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255 })
  displayName: string;

  @Column({
    type: 'varchar',
    length: 50,
    enum: ParameterType
  })
  type: ParameterType;

  @Column("simple-json", { nullable: true })
  defaultValue: any;

  @Column({ default: false })
  required: boolean;

  @Column("simple-json", { nullable: true })
  validationRules: ValidationRule[];

  @ManyToOne(() => Report, report => report.parameters)
  @JoinColumn({ name: 'report_id' })
  report: Report;
}