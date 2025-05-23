# Node Test - Express API with PostgreSQL

This is an Express.js application with PostgreSQL database integration, designed for testing AI-powered Merge Request review bots. The application intentionally contains various logical issues, security vulnerabilities, and performance problems for testing purposes.

## Features

- Express.js REST API
- PostgreSQL database with 4 related tables
- Complex database queries with multiple JOINs
- Intentional bugs and security vulnerabilities for testing
- Comprehensive reporting endpoints

## Database Schema

### Tables Structure (Parent-Child Relationships)

1. **Companies** (Parent)
   - id, name, email, address, phone, created_at, updated_at

2. **Departments** (Child of Companies)
   - id, company_id, name, budget, manager_name, created_at, updated_at

3. **Employees** (Child of Departments)
   - id, department_id, first_name, last_name, email, phone, salary, hire_date, position, is_active, created_at, updated_at

4. **Projects** (Child of Employees)
   - id, name, description, start_date, end_date, budget, status, assigned_employee_id, created_at, updated_at

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd node_test
```

2. Install dependencies:
```bash
npm install
```

3. Set up PostgreSQL database:
   - Create a database named `node_test_db`
   - Update the `.env` file with your database credentials

4. Initialize the database:
```bash
npm run init-db
```

5. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Companies
- `GET /api/companies` - Get all companies
- `GET /api/companies/:id` - Get company by ID
- `POST /api/companies` - Create new company
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company
- `GET /api/companies/:id/departments` - Get company with departments (JOIN)

### Departments
- `GET /api/departments` - Get all departments
- `GET /api/departments/:id` - Get department by ID
- `POST /api/departments` - Create new department
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Delete department
- `GET /api/departments/:id/employees` - Get department with employees (Complex JOIN)
- `GET /api/departments/company/:companyId/budget-summary` - Get budget summary by company

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `GET /api/employees/department/:departmentId/salary-stats` - Get salary statistics
- `GET /api/employees/search` - Search employees with filters

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/status/:status/summary` - Get projects by status
- `GET /api/projects/overdue` - Get overdue projects
- `GET /api/projects/budget-analysis` - Get budget analysis (Multiple JOINs)
- `POST /api/projects/:id/assign` - Assign project to employee

### Reports (Complex Queries with Multiple JOINs)
- `GET /api/reports/company-overview` - Comprehensive company report
- `GET /api/reports/employee-performance` - Employee performance analysis
- `GET /api/reports/project-timeline` - Project timeline analysis
- `GET /api/reports/financial-summary` - Financial summary report
- `GET /api/reports/department-efficiency` - Department efficiency report
- `GET /api/reports/cross-company-analysis` - Cross-company comparison

## Intentional Issues for Testing

This application contains various intentional bugs and issues for testing AI review bots:

### Security Issues
- SQL injection vulnerabilities
- Missing input validation
- Exposed sensitive error information
- No authentication/authorization
- Plain text password storage (commented out)

### Performance Issues
- Missing pagination on large datasets
- Complex queries without proper indexing
- No query timeout handling
- No result caching
- Expensive subqueries

### Logic Issues
- Race conditions in update operations
- Missing transaction handling
- No cascade delete validation
- Division by zero potential
- Missing data validation
- Wrong HTTP status codes
- Hard deletes instead of soft deletes

### Database Issues
- Missing foreign key validations
- No connection error handling
- Potential memory leaks
- No connection pooling limits

## Environment Variables

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=node_test_db
DB_USER=postgres
DB_PASSWORD=password

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration (unused but present)
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h
```

## Sample API Calls

### Create a Company
```bash
curl -X POST http://localhost:3000/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "email": "test@company.com",
    "address": "123 Test St",
    "phone": "+1-555-0123"
  }'
```

### Get Company Overview Report
```bash
curl http://localhost:3000/api/reports/company-overview
```

### Search Employees
```bash
curl "http://localhost:3000/api/employees/search?position=Engineer&min_salary=70000"
```

## Testing the AI Review Bot

This application is specifically designed to test AI-powered Merge Request review bots. The intentional issues should be detected by a good review bot, including:

1. Security vulnerabilities
2. Performance bottlenecks
3. Logic errors
4. Code quality issues
5. Database design problems

## License

MIT License - This is a test application for educational purposes.
