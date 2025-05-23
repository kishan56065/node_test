const db = require('../config/database');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');

    // Create Companies table (Parent)
    await db.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        address TEXT,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Departments table (Child of Companies)
    await db.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        budget DECIMAL(12,2),
        manager_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Employees table (Child of Departments)
    await db.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        salary DECIMAL(10,2),
        hire_date DATE DEFAULT CURRENT_DATE,
        position VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Projects table (Child of Employees - Many to Many relationship)
    await db.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE,
        end_date DATE,
        budget DECIMAL(12,2),
        status VARCHAR(50) DEFAULT 'planning',
        assigned_employee_id INTEGER REFERENCES employees(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert sample data
    console.log('Inserting sample data...');

    // Insert companies
    const companyResult = await db.query(`
      INSERT INTO companies (name, email, address, phone) VALUES
      ('Tech Corp', 'info@techcorp.com', '123 Tech Street, Silicon Valley', '+1-555-0101'),
      ('Innovation Ltd', 'contact@innovation.com', '456 Innovation Ave, New York', '+1-555-0102')
      RETURNING id
    `);

    // Insert departments
    await db.query(`
      INSERT INTO departments (company_id, name, budget, manager_name) VALUES
      (1, 'Engineering', 500000.00, 'John Smith'),
      (1, 'Marketing', 200000.00, 'Jane Doe'),
      (2, 'Research', 300000.00, 'Bob Johnson'),
      (2, 'Sales', 150000.00, 'Alice Brown')
    `);

    // Insert employees
    await db.query(`
      INSERT INTO employees (department_id, first_name, last_name, email, phone, salary, position) VALUES
      (1, 'Mike', 'Wilson', 'mike.wilson@techcorp.com', '+1-555-1001', 75000.00, 'Software Engineer'),
      (1, 'Sarah', 'Davis', 'sarah.davis@techcorp.com', '+1-555-1002', 85000.00, 'Senior Developer'),
      (2, 'Tom', 'Anderson', 'tom.anderson@techcorp.com', '+1-555-1003', 60000.00, 'Marketing Specialist'),
      (3, 'Lisa', 'Garcia', 'lisa.garcia@innovation.com', '+1-555-1004', 90000.00, 'Research Scientist'),
      (4, 'David', 'Martinez', 'david.martinez@innovation.com', '+1-555-1005', 65000.00, 'Sales Representative')
    `);

    // Insert projects
    await db.query(`
      INSERT INTO projects (name, description, start_date, end_date, budget, status, assigned_employee_id) VALUES
      ('Mobile App Development', 'Develop a new mobile application', '2024-01-15', '2024-06-15', 100000.00, 'in_progress', 1),
      ('Website Redesign', 'Redesign company website', '2024-02-01', '2024-04-30', 50000.00, 'completed', 2),
      ('Market Research', 'Conduct market analysis', '2024-03-01', '2024-05-31', 25000.00, 'planning', 3),
      ('AI Research Project', 'Research AI applications', '2024-01-01', '2024-12-31', 200000.00, 'in_progress', 4),
      ('Sales Campaign', 'Q2 sales campaign', '2024-04-01', '2024-06-30', 30000.00, 'planning', 5)
    `);

    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
