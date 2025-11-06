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
- PostgreSQL 14+
- npm or yarn

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/vambe_db"

# Anthropic API
ANTHROPIC_API_KEY="your-api-key-here"

# Server
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

## Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Open Prisma Studio
npx prisma studio
```

## Development

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

The API will be available at `http://localhost:3001/api`

## API Documentation

Swagger documentation is available at:
```
http://localhost:3001/api/docs
```

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
