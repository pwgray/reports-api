# Reports API

A comprehensive REST API built with NestJS for creating, managing, and scheduling database reports. This API provides powerful tools for connecting to multiple data sources, building complex queries visually, generating reports in various formats, and scheduling automated report delivery.

## Purpose

The Reports API enables developers and organizations to:

- **Connect to multiple databases** (SQL Server, MySQL, PostgreSQL, Oracle) as data sources
- **Build queries visually** without writing SQL manually using an intuitive query builder
- **Create and manage reports** with field selection, filtering, grouping, and sorting
- **Export reports** to Excel format for further analysis
- **Schedule reports** to run automatically and be delivered via email
- **Introspect database schemas** to automatically discover tables, views, columns, and relationships

## Features

- ✅ **Data Source Management**: Connect to SQL Server, MySQL, PostgreSQL, and Oracle databases
- ✅ **Query Builder**: Visual query builder with field selection, filtering, grouping, and sorting
- ✅ **Report Management**: Create, update, delete, and archive reports
- ✅ **Report Preview**: Preview reports before saving them
- ✅ **Excel Export**: Export reports to Excel (.xlsx) format
- ✅ **Scheduled Reports**: Schedule reports using cron expressions with automatic email delivery
- ✅ **Database Introspection**: Automatically discover database schema (tables, views, columns, relationships)
- ✅ **Report Parameters**: Support for dynamic parameters for flexible report execution
- ✅ **Swagger Documentation**: Interactive API documentation built-in

## Technology Stack

- **Framework**: NestJS 11
- **Language**: TypeScript
- **Database**: TypeORM with SQL Server
- **Queue System**: BullMQ (Redis)
- **Validation**: class-validator, class-transformer
- **Excel Generation**: ExcelJS, xlsx

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **SQL Server database** (for the application database)
- **Redis** (for scheduled reports queue)
- Access to one or more databases to connect as data sources

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd reports-api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables** (see Configuration section)

4. **Set up the database** (see Database Setup section)

5. **Start the application:**
   ```bash
   npm run start:dev
   ```

## Configuration

Create a `.env` file in the root directory with the following variables:

### Required Environment Variables

```env
# Application Database (SQL Server)
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=your_password
DB_NAME=reports_db
DB_SCHEMA=dbo

# Optional: Windows Domain Authentication
# DB_DOMAIN=yourdomain.com

# Redis (for scheduled reports)
REDIS_HOST=localhost
REDIS_PORT=6379

# Application
PORT=3000
NODE_ENV=development
```

### Environment Variable Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | SQL Server hostname | `localhost` | Yes |
| `DB_PORT` | SQL Server port | `1433` | Yes |
| `DB_USERNAME` | Database username | `sa` | Yes |
| `DB_PASSWORD` | Database password | - | Yes |
| `DB_NAME` | Application database name | `reports_db` | Yes |
| `DB_SCHEMA` | Database schema | `dbo` | No |
| `DB_DOMAIN` | Windows domain (for domain auth) | - | No |
| `REDIS_HOST` | Redis hostname | `localhost` | Yes |
| `REDIS_PORT` | Redis port | `6379` | Yes |
| `PORT` | API server port | `3000` | No |
| `NODE_ENV` | Environment (development/production) | - | No |

## Database Setup

### 1. Create the Application Database

```sql
CREATE DATABASE reports_db;
```

### 2. Run Migrations

The application uses TypeORM migrations. In development mode, `synchronize` is enabled, so tables are created automatically. For production:

1. Review migration files in the `migrations/` directory
2. Run migrations manually or configure TypeORM to run them automatically

See `migrations/README.md` for detailed migration instructions.

### 3. Seed Sample Data Sources (Optional)

To seed a sample data source:

```bash
npm run seed:data-sources
```

This creates a sample "Northwind Demo" data source (requires a Northwind database).

## Running the Application

### Development Mode

```bash
npm run start:dev
```

Starts the server with hot-reload. The API will be available at `http://localhost:3000`

### Production Mode

```bash
# Build the application
npm run build

# Run in production
npm run start:prod
```

### Debug Mode

```bash
npm run start:debug
```

## API Documentation

Once the application is running, you can access the Swagger documentation at:

```
http://localhost:3000/api
```

This provides an interactive interface to test all API endpoints.

## API Endpoints

### Base URL

All endpoints are prefixed with `/api`:

```
http://localhost:3000/api
```

### Data Sources

- `GET /api/data-sources` - Get all data sources
- `GET /api/data-sources/:id` - Get data source by ID
- `GET /api/data-sources/:id/schema` - Get database schema for a data source
- `POST /api/data-sources` - Create a new data source
- `PUT /api/data-sources/:id` - Update a data source
- `DELETE /api/data-sources/:id` - Delete a data source
- `POST /api/data-sources/introspect` - Introspect a database schema

### Reports

- `GET /api/reports` - Get all reports
- `GET /api/reports/:id` - Get report by ID
- `POST /api/reports` - Create a new report
- `PUT /api/reports/:id` - Update a report
- `DELETE /api/reports/:id` - Delete a report
- `POST /api/reports/preview` - Preview a report without saving
- `POST /api/reports/export/excel` - Export report to Excel

### Scheduler

- `POST /api/scheduler/schedule` - Schedule a report for automatic execution
- `GET /api/scheduler/user/:userId` - Get all scheduled reports for a user
- `GET /api/scheduler/schedule/:id` - Get a specific schedule
- `DELETE /api/scheduler/schedule/:id` - Cancel a scheduled report

## Usage Examples

### 1. Create a Data Source

```bash
curl -X POST http://localhost:3000/api/data-sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Database",
    "server": "prod-db.example.com",
    "port": 1433,
    "database": "ProductionDB",
    "username": "report_user",
    "password": "secure_password",
    "type": "sqlserver"
  }'
```

### 2. Introspect a Database Schema

```bash
curl -X POST http://localhost:3000/api/data-sources/introspect \
  -H "Content-Type: application/json" \
  -d '{
    "server": "localhost",
    "port": 1433,
    "database": "Northwind",
    "username": "sa",
    "password": "your_password",
    "type": "sqlserver",
    "includedSchemas": ["dbo"],
    "includedObjectTypes": ["table", "view"]
  }'
```

### 3. Preview a Report

```bash
curl -X POST http://localhost:3000/api/reports/preview \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Sales Report",
    "dataSource": {
      "id": "data-source-uuid",
      "name": "Production Database"
    },
    "selectedFields": [
      {
        "table": "Customers",
        "column": "CustomerID",
        "displayName": "Customer ID"
      },
      {
        "table": "Orders",
        "column": "OrderDate",
        "displayName": "Order Date"
      }
    ],
    "filters": [
      {
        "field": "Orders.OrderDate",
        "operator": ">=",
        "value": "2024-01-01"
      }
    ],
    "limit": 100
  }'
```

### 4. Create and Save a Report

```bash
curl -X POST http://localhost:3000/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monthly Sales Report",
    "description": "Monthly sales report by customer",
    "dataSourceId": "data-source-uuid",
    "queryConfig": {
      "fields": [
        {
          "table": "Orders",
          "column": "OrderID",
          "displayName": "Order ID",
          "aggregation": null
        },
        {
          "table": "Orders",
          "column": "OrderDate",
          "displayName": "Order Date",
          "aggregation": null
        }
      ],
      "filters": [],
      "groupBy": [],
      "sorting": []
    },
    "layoutConfig": {
      "columns": []
    },
    "createdBy": "user-uuid"
  }'
```

### 5. Export Report to Excel

```bash
curl -X POST http://localhost:3000/api/reports/export/excel \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sales Report",
    "dataSource": {
      "id": "data-source-uuid"
    },
    "selectedFields": [
      {
        "table": "Orders",
        "column": "OrderID",
        "displayName": "Order ID"
      }
    ]
  }' \
  --output sales-report.xlsx
```

### 6. Schedule a Report

```bash
curl -X POST http://localhost:3000/api/scheduler/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "reportId": "report-uuid",
    "userId": "user-uuid",
    "cronExpression": "0 0 * * *",
    "scheduleTime": "2024-01-15T00:00:00Z",
    "recipients": ["manager@example.com", "team@example.com"],
    "format": "excel",
    "parameters": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  }'
```

## Testing

### Run Unit Tests

```bash
npm run test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:cov
```

### Run End-to-End Tests

```bash
npm run test:e2e
```

## Project Structure

```
reports-api/
├── src/
│   ├── config/              # Configuration files
│   ├── dto/                 # Data Transfer Objects
│   ├── entities/            # TypeORM entities
│   ├── modules/
│   │   ├── query-builder/   # Query building logic
│   │   ├── reports/         # Report CRUD operations
│   │   ├── scheduler/       # Scheduled report execution
│   │   ├── report-generator/ # Report format generation
│   │   └── users/           # User management
│   ├── types/               # TypeScript type definitions
│   ├── seeds/               # Database seed scripts
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry point
├── migrations/              # Database migrations
├── test/                    # E2E tests
└── package.json
```

## Development

### Code Formatting

```bash
npm run format
```

### Linting

```bash
npm run lint
```

## Troubleshooting

### Database Connection Issues

- Verify SQL Server is running and accessible
- Check firewall settings
- Verify credentials in `.env` file
- For domain authentication, ensure `DB_DOMAIN` is set correctly

### Redis Connection Issues

- Ensure Redis is running: `redis-cli ping`
- Check `REDIS_HOST` and `REDIS_PORT` in `.env`
- Verify Redis is accessible from the application server

### Scheduled Reports Not Executing

- Verify Redis is running
- Check scheduler service logs
- Ensure cron expressions are valid
- Verify email configuration (if applicable)

## License

UNLICENSED
