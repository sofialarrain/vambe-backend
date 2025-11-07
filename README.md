# Vambe Challenge - Backend

AI-powered sales analytics platform backend built with NestJS, TypeScript, PostgreSQL, and Anthropic Claude.

## Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Anthropic Claude API
- **Documentation**: Swagger/OpenAPI

## Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- npm or yarn

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL="postgresql://vambe:vambe_password@localhost:5432/vambe_db?schema=public"

# Anthropic Claude API
ANTHROPIC_API_KEY="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"

# Application
PORT=3001
NODE_ENV=development

# CORS
FRONTEND_URL="http://localhost:3000"
```

## First Time Setup

### 1. Start PostgreSQL Database with Docker

```bash
# Start PostgreSQL container in detached mode
docker compose up -d

# Verify the container is running
docker ps
```

The database will be available at `localhost:5432` with:
- User: `vambe`
- Password: `vambe_password`
- Database: `vambe_db`

### 2. Setup Database Schema

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations to create database tables
npx prisma migrate dev

# (Optional) Open Prisma Studio to view/edit data
npx prisma studio
```

### 3. Start the Application

```bash
# Development mode (with hot reload)
npm run start:dev

# Or production mode
npm run start
```

## Development

**Note:** Make sure PostgreSQL is running (`docker compose up -d`) before starting the application.

```bash
# Start in development mode (watch mode)
npm run start:dev

# Start in debug mode
npm run start:debug

# Build for production
npm run build

# Start production build
npm run start:prod
```

### Docker Commands

```bash
# Start PostgreSQL
docker compose up -d

# Stop PostgreSQL
docker compose down

# View logs
docker compose logs -f postgres

# Reset database (WARNING: deletes all data)
docker compose down -v
docker compose up -d
npx prisma migrate dev
```

The API will be available at `http://localhost:3001/api`

## API Documentation

**Swagger/OpenAPI documentation is available in the backend**.

Once the application is running, access the interactive API documentation at:

```
http://localhost:3001/api/docs
```

The Swagger UI provides:
- Complete API endpoint documentation
- Request/response schemas
- Interactive testing interface (try endpoints directly from the browser)
- Endpoints organized by tags:
  - `analytics` - Analytics and metrics endpoints
  - `clients` - Client management endpoints
  - `llm` - LLM and AI processing endpoints

**Note:** The documentation is automatically generated from the code using `@nestjs/swagger` decorators in the controllers.

## Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e

# Run tests in debug mode
npm run test:debug
```

### Test Coverage

Generate coverage report:
```bash
npm run test:cov
```

View detailed HTML report: `coverage/lcov-report/index.html`

**Current Coverage**: 77%+ (334 tests passing)

## Project Structure

```
src/
├── analytics/          # Analytics services and controllers
├── clients/            # Client management
├── llm/               # AI/LLM services (categorization, insights)
├── prisma/            # Prisma service
├── common/            # Shared utilities, DTOs, constants, filters
└── main.ts           # Application entry point
```

## Scripts

- `npm run build` - Build the project
- `npm run start` - Start the application
- `npm run start:dev` - Start in development mode
- `npm run start:prod` - Start production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run unit tests
- `npm run test:cov` - Run tests with coverage

## License

Private - UNLICENSED
