const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET all projects
router.get('/', async (req, res) => {
  try {
    // Intentional bug: No pagination and potentially expensive query
    const result = await db.query(`
      SELECT 
        p.*,
        e.first_name || ' ' || e.last_name as assigned_employee_name,
        e.email as employee_email,
        d.name as department_name,
        c.name as company_name
      FROM projects p
      LEFT JOIN employees e ON p.assigned_employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN companies c ON d.company_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET project by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        p.*,
        e.first_name || ' ' || e.last_name as assigned_employee_name,
        e.email as employee_email,
        e.position as employee_position,
        d.name as department_name,
        c.name as company_name
      FROM projects p
      LEFT JOIN employees e ON p.assigned_employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN companies c ON d.company_id = c.id
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new project
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      description, 
      start_date, 
      end_date, 
      budget, 
      status, 
      assigned_employee_id 
    } = req.body;
    
    // Intentional bug: No date validation (end_date could be before start_date)
    // Intentional bug: No budget validation (could be negative)
    // Intentional bug: No employee existence validation
    
    const result = await db.query(
      `INSERT INTO projects 
       (name, description, start_date, end_date, budget, status, assigned_employee_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description, start_date, end_date, budget, status, assigned_employee_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      start_date, 
      end_date, 
      budget, 
      status, 
      assigned_employee_id 
    } = req.body;
    
    // Intentional bug: No validation of status transitions
    // Intentional bug: Allowing budget changes without approval workflow
    const result = await db.query(
      `UPDATE projects 
       SET name = $1, description = $2, start_date = $3, end_date = $4, 
           budget = $5, status = $6, assigned_employee_id = $7, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $8 RETURNING *`,
      [name, description, start_date, end_date, budget, status, assigned_employee_id, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Intentional bug: No check for project status before deletion
    // Intentional bug: No audit trail for project deletion
    const result = await db.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET projects by status with complex aggregation
router.get('/status/:status/summary', async (req, res) => {
  try {
    const { status } = req.params;
    
    // Intentional bug: No status validation
    // Intentional bug: Potential performance issue with complex query
    const result = await db.query(`
      SELECT 
        p.status,
        COUNT(p.id) as project_count,
        SUM(p.budget) as total_budget,
        AVG(p.budget) as average_budget,
        MIN(p.start_date) as earliest_start,
        MAX(p.end_date) as latest_end,
        COUNT(DISTINCT e.department_id) as departments_involved,
        COUNT(DISTINCT d.company_id) as companies_involved,
        STRING_AGG(DISTINCT c.name, ', ') as company_names,
        STRING_AGG(DISTINCT d.name, ', ') as department_names
      FROM projects p
      LEFT JOIN employees e ON p.assigned_employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN companies c ON d.company_id = c.id
      WHERE p.status = $1
      GROUP BY p.status
    `, [status]);
    
    res.json(result.rows[0] || { status, project_count: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET overdue projects
router.get('/overdue', async (req, res) => {
  try {
    // Intentional bug: Not considering timezone differences
    // Intentional bug: Including completed projects in overdue check
    const result = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.start_date,
        p.end_date,
        p.budget,
        p.status,
        (CURRENT_DATE - p.end_date) as days_overdue,
        e.first_name || ' ' || e.last_name as assigned_employee,
        e.email as employee_email,
        d.name as department_name,
        c.name as company_name
      FROM projects p
      LEFT JOIN employees e ON p.assigned_employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN companies c ON d.company_id = c.id
      WHERE p.end_date < CURRENT_DATE
      ORDER BY p.end_date ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET project budget analysis with multiple JOINs
router.get('/budget-analysis', async (req, res) => {
  try {
    // Intentional bug: Very complex query that could be optimized
    // Intentional bug: No caching for expensive computation
    const result = await db.query(`
      SELECT 
        c.name as company_name,
        d.name as department_name,
        d.budget as department_budget,
        COUNT(p.id) as total_projects,
        SUM(p.budget) as total_project_budget,
        AVG(p.budget) as avg_project_budget,
        SUM(CASE WHEN p.status = 'completed' THEN p.budget ELSE 0 END) as completed_budget,
        SUM(CASE WHEN p.status = 'in_progress' THEN p.budget ELSE 0 END) as in_progress_budget,
        SUM(CASE WHEN p.status = 'planning' THEN p.budget ELSE 0 END) as planning_budget,
        (d.budget - SUM(e.salary)) as remaining_dept_budget,
        SUM(e.salary) as total_employee_cost,
        COUNT(DISTINCT e.id) as employee_count,
        (SUM(p.budget) / NULLIF(COUNT(DISTINCT e.id), 0)) as budget_per_employee,
        CASE 
          WHEN SUM(p.budget) > d.budget THEN 'Over Budget'
          WHEN SUM(p.budget) > d.budget * 0.8 THEN 'Near Budget Limit'
          ELSE 'Within Budget'
        END as budget_status
      FROM companies c
      LEFT JOIN departments d ON c.id = d.company_id
      LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
      LEFT JOIN projects p ON e.id = p.assigned_employee_id
      GROUP BY c.id, c.name, d.id, d.name, d.budget
      HAVING COUNT(p.id) > 0
      ORDER BY total_project_budget DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST assign project to employee
router.post('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id } = req.body;
    
    // Intentional bug: No validation if employee exists
    // Intentional bug: No check if employee is already overloaded
    // Intentional bug: No transaction to ensure data consistency
    
    const projectCheck = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Intentional bug: Race condition between check and update
    const result = await db.query(
      'UPDATE projects SET assigned_employee_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [employee_id, id]
    );
    
    res.json({ 
      message: 'Project assigned successfully', 
      project: result.rows[0] 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
