import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Report } from "./report.entity";
import { User } from "./user.entity";

// entities/report-schedule.entity.ts
@Entity('report_schedules')
export class ReportSchedule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    reportId: string;

    @Column()
    userId: string;

    @Column()
    cronExpression: string;

    @Column('simple-array')
    recipients: string[];

    @Column()
    format: string;

    @Column({ default: true })
    isActive: boolean;

    @ManyToOne(() => Report, report => report.parameters)
    @JoinColumn({ name: 'reportId' })
    report: Report;

    @OneToMany(() => User, user => user.reports)
    @JoinColumn({ name: 'userId' })
    user: User;

    parameters: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column()
    scheduleTime: Date;
}