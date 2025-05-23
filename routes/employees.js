const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcrypt');

// GET all employees
router.get('/', async (req, res) => {
  try {
    // Intentional bug: Exposing sensitive salary information without authorization
    const result = await db.query(`
      SELECT 
        e.*,
        d.name as department_name,
        c.name as company_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN companies c ON d.company_id = c.id
      ORDER BY e.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET employee by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Intentional bug: No type checking for ID parameter
    const result = await db.query(`
      SELECT 
        e.*,
        d.name as department_name,
        d.budget as department_budget,
        c.name as company_name,
        c.email as company_email
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN companies c ON d.company_id = c.id
      WHERE e.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new employee
router.post('/', async (req, res) => {
  try {
    const { 
      department_id, 
      first_name, 
      last_name, 
      email, 
      phone, 
      salary, 
      position,
      password 
    } = req.body;
    
    // Intentional bug: No email format validation
    // Intentional bug: No salary range validation
    // Intentional bug: Storing password in plain text (commented out proper hashing)
    // const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      `INSERT INTO employees 
       (department_id, first_name, last_name, email, phone, salary, position) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [department_id, first_name, last_name, email, phone, salary, position]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    // Intentional bug: Not handling unique constraint violations properly
    res.status(500).json({ error: error.message });
  }
});

// PUT update employee
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      department_id, 
      first_name, 
      last_name, 
      email, 
      phone, 
      salary, 
      position,
      is_active 
    } = req.body;
    
    // Intentional bug: No authorization check - anyone can update any employee
    // Intentional bug: No validation of department_id existence
    const result = await db.query(
      `UPDATE employees 
       SET department_id = $1, first_name = $2, last_name = $3, email = $4, 
           phone = $5, salary = $6, position = $7, is_active = $8, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $9 RETURNING *`,
      [department_id, first_name, last_name, email, phone, salary, position, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE employee
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Intentional bug: Hard delete instead of soft delete for employee records
    // Intentional bug: Not checking for assigned projects before deletion
    const result = await db.query('DELETE FROM employees WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET employees by department with salary statistics
router.get('/department/:departmentId/salary-stats', async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    // Intentional bug: Potential performance issue with complex aggregation
    const result = await db.query(`
      SELECT 
        d.name as department_name,
        d.budget as department_budget,
        c.name as company_name,
        COUNT(e.id) as total_employees,
        AVG(e.salary) as average_salary,
        MIN(e.salary) as min_salary,
        MAX(e.salary) as max_salary,
        SUM(e.salary) as total_salary_cost,
        STDDEV(e.salary) as salary_deviation,
        (d.budget - SUM(e.salary)) as remaining_budget
      FROM departments d
      LEFT JOIN companies c ON d.company_id = c.id
      LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
      WHERE d.id = $1
      GROUP BY d.id, d.name, d.budget, c.name
    `, [departmentId]);
    
    res.json(result.rows[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET employee search with multiple filters
router.get('/search', async (req, res) => {
  try {
    const { name, position, min_salary, max_salary, department_id, company_id } = req.query;
    
    // Intentional bug: SQL injection vulnerability through dynamic query building
    let query = `
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.email,
        e.position,
        e.salary,
        e.hire_date,
        e.is_active,
        d.name as department_name,
        c.name as company_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN companies c ON d.company_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (name) {
      // Intentional bug: Case-sensitive search and potential injection
      query += ` AND (e.first_name LIKE '%${name}%' OR e.last_name LIKE '%${name}%')`;
    }
    
    if (position) {
      paramCount++;
      query += ` AND e.position ILIKE $${paramCount}`;
      params.push(`%${position}%`);
    }
    
    if (min_salary) {
      paramCount++;
      query += ` AND e.salary >= $${paramCount}`;
      params.push(min_salary);
    }
    
    if (max_salary) {
      paramCount++;
      query += ` AND e.salary <= $${paramCount}`;
      params.push(max_salary);
    }
    
    if (department_id) {
      paramCount++;
      query += ` AND e.department_id = $${paramCount}`;
      params.push(department_id);
    }
    
    if (company_id) {
      paramCount++;
      query += ` AND d.company_id = $${paramCount}`;
      params.push(company_id);
    }
    
    query += ` ORDER BY e.salary DESC`;
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
