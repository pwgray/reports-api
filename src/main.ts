import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  app.use(bodyParser.text({ limit: '10mb' }));
  app.use(bodyParser.raw({ limit: '10mb' }));
  app.use(bodyParser.text({ limit: '10mb' }));

  const config = new DocumentBuilder()
    .setTitle('Reports API')
    .setDescription('API for the Reports application')
    .setVersion('1.0')
    .addTag('reports')
    .addTag('data-sources')
    .build();  
    const document = SwaggerModule.createDocument(app as any, config);
    SwaggerModule.setup('api', app as any, document);
  
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
