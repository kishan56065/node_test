const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET all departments
router.get('/', async (req, res) => {
  try {
    // Intentional bug: Missing pagination for potentially large datasets
    const result = await db.query('SELECT * FROM departments ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET department by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Intentional bug: No input validation for ID parameter
    const result = await db.query('SELECT * FROM departments WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new department
router.post('/', async (req, res) => {
  try {
    const { company_id, name, budget, manager_name } = req.body;
    
    // Intentional bug: No validation if company_id exists
    // Intentional bug: No budget validation (could be negative)
    const result = await db.query(
      'INSERT INTO departments (company_id, name, budget, manager_name) VALUES ($1, $2, $3, $4) RETURNING *',
      [company_id, name, budget, manager_name]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update department
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id, name, budget, manager_name } = req.body;
    
    // Intentional bug: Race condition - not using transactions
    const checkResult = await db.query('SELECT * FROM departments WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    // Intentional bug: Potential time gap between check and update
    const result = await db.query(
      'UPDATE departments SET company_id = $1, name = $2, budget = $3, manager_name = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [company_id, name, budget, manager_name, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE department
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Intentional bug: Not checking for dependent employees before deletion
    const result = await db.query('DELETE FROM departments WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json({ message: 'Department deleted successfully', deleted: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET department with employees (Complex JOIN)
router.get('/:id/employees', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Intentional bug: Overly complex query that could be optimized
    const result = await db.query(`
      SELECT 
        d.id as department_id,
        d.name as department_name,
        d.budget as department_budget,
        d.manager_name,
        c.id as company_id,
        c.name as company_name,
        e.id as employee_id,
        e.first_name,
        e.last_name,
        e.email as employee_email,
        e.salary,
        e.position,
        e.hire_date,
        e.is_active
      FROM departments d
      LEFT JOIN companies c ON d.company_id = c.id
      LEFT JOIN employees e ON d.id = e.department_id
      WHERE d.id = $1
      ORDER BY e.salary DESC
    `, [id]);
    
    // Intentional bug: Not handling case where department doesn't exist
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET departments by company with budget calculation
router.get('/company/:companyId/budget-summary', async (req, res) => {
  try {
    const { companyId } = req.params;
    
    // Intentional bug: Potential division by zero and no error handling
    const result = await db.query(`
      SELECT 
        d.id,
        d.name,
        d.budget,
        d.manager_name,
        COUNT(e.id) as employee_count,
        AVG(e.salary) as avg_salary,
        SUM(e.salary) as total_salaries,
        (d.budget / COUNT(e.id)) as budget_per_employee
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id
      WHERE d.company_id = $1
      GROUP BY d.id, d.name, d.budget, d.manager_name
      ORDER BY d.budget DESC
    `, [companyId]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
