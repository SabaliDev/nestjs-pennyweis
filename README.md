# PennyWeis Trading Platform - NestJS

A crypto paper trading platform backend built with NestJS, translated from the original Rust implementation.

## Features

- 🔐 User authentication with JWT and OAuth support
- 💰 Virtual wallet management with multiple currencies
- 📈 Real-time price data integration with CoinGecko
- 🔄 Order placement and execution system
- 📊 Portfolio tracking and analytics
- 🏆 Trading competitions
- 📱 RESTful API with comprehensive documentation

## Quick Start

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 12+
- Redis 6+

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nestjs-pennyweis
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run start:dev
```

5. Open your browser and navigate to:
- API: http://localhost:3000
- Documentation: http://localhost:3000/api/docs

## Available Scripts

- `npm run start` - Start the production server
- `npm run start:dev` - Start the development server with hot reload
- `npm run start:debug` - Start the server in debug mode
- `npm run build` - Build the application for production
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Database

The application uses PostgreSQL with TypeORM for database management.

### Migration Commands

- `npm run migration:generate <name>` - Generate a new migration
- `npm run migration:run` - Run pending migrations
- `npm run migration:revert` - Revert the last migration

## API Documentation

Interactive API documentation is available at `/api/docs` when the server is running.

## Configuration

The application uses environment variables for configuration. See `.env.example` for all available options.

### Key Configuration Areas

- **Database**: PostgreSQL connection settings
- **Redis**: Cache and session storage
- **JWT**: Authentication token configuration
- **CoinGecko**: Price data API integration
- **Features**: Enable/disable platform features

## Architecture

```
src/
├── config/           # Configuration modules
├── entities/         # TypeORM entities
├── modules/         # Feature modules
│   ├── auth/        # Authentication
│   ├── trading/     # Order and trade management
│   ├── wallet/      # Virtual wallet management
│   ├── price/       # Price data integration
│   └── ...
├── guards/          # Authentication guards
├── middleware/      # Custom middleware
├── dto/            # Data transfer objects
└── utils/          # Utility functions
```

## Development

### Code Style

The project uses ESLint and Prettier for code formatting. Run `npm run lint` and `npm run format` to ensure code quality.

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables

3. Run database migrations:
```bash
npm run migration:run
```

4. Start the production server:
```bash
npm run start:prod
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or support, please open an issue on GitHub or contact the development team.
docker-compose up -d postgres timescaledb redis
docker-compose up -d postgres 
npx typeorm-ts-node-commonjs migration:generate -d src/config/typeorm.config.ts database/migrations/InitialSchema
 npx typeorm-ts-node-commonjs migration:run -d src/config/typeorm.config.ts  