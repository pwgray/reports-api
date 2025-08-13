import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { ReportParameter } from "./report-parameter.entity";
import { QueryConfiguration } from "src/types/query-configuration.type";
import { User } from "./user.entity";
import { LayoutConfiguration } from "src/types/layout-configuration.type";
import { ReportSchedule } from "./report-schedule.entity";
import { DataSource } from "./data-source.entity";

// entities/report.entity.ts
@Entity('reports')
export class Report {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    name: string;

    @Column('text', { nullable: true })
    description: string;

    @Column("simple-json", { nullable: true })
    queryConfig: QueryConfiguration;

    @Column("simple-json", { nullable: true })
    layoutConfig: LayoutConfiguration;

    @ManyToOne(() => DataSource)
    @JoinColumn({ name: 'data_source_id' })
    dataSource: DataSource;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by_id' })
    createdBy?: User;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: false })
    isArchived: boolean;

    @Column({ default: false })
    isPublic: boolean;

    @Column("simple-json", { nullable: true })
    metadata: Record<string, any>;

    @OneToMany(() => ReportParameter, param => param.report)
    parameters: ReportParameter[];

    @OneToMany(() => ReportSchedule, schedule => schedule.report)
    schedules: ReportSchedule[];
    

    constructor(partial: Partial<Report>) {
        Object.assign(this, partial);
    }
}


