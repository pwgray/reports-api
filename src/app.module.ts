import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ReportsModule } from './modules/reports/reports.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { QueryBuilderModule } from './modules/query-builder/query-builder.module';
import { ReportGeneratorModule } from './modules/report-generator/report-generator.module';
import { UserModule } from './modules/users/user.module';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
    }),
    ReportsModule,
    SchedulerModule,
    QueryBuilderModule,
    ReportGeneratorModule,
    UserModule,
  ],
})
export class AppModule {}
