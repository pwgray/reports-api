import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Report } from "./report.entity";

// entities/user.entity.ts
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;   

    @Column({ length: 255 })
    username: string;  

    @Column({ length: 255, unique: true })
    email: string;  

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => Report, report => report.createdBy)
    reports: Report[];

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}