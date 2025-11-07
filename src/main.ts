import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global exception filter for consistent error handling
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Set global prefix BEFORE Swagger configuration
  app.setGlobalPrefix('api');

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Vambe Challenge API')
    .setDescription('AI-powered sales analytics platform API documentation')
    .setVersion('1.0')
    .addTag('analytics', 'Analytics and metrics endpoints')
    .addTag('clients', 'Client management endpoints')
    .addTag('llm', 'LLM and AI processing endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  const prismaService = app.get(PrismaService);
  try {
    await prismaService.$queryRaw`SELECT 1`;
    console.log(`✅ Database connected successfully`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
  
  console.log(`🚀 Backend running on http://localhost:${port}/api`);
  console.log(`📚 API Documentation available at http://localhost:${port}/api/docs`);
}
bootstrap();
