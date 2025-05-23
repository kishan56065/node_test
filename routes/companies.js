const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET all companies
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM companies ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    // Intentional bug: Exposing sensitive error information
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// GET company by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Intentional bug: SQL injection vulnerability
    const result = await db.query(`SELECT * FROM companies WHERE id = ${id}`);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new company
router.post('/', async (req, res) => {
  try {
    const { name, email, address, phone } = req.body;
    
    // Intentional bug: Missing input validation
    const result = await db.query(
      'INSERT INTO companies (name, email, address, phone) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, address, phone]
    );
    
    // Intentional bug: Wrong status code for creation
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update company
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, address, phone } = req.body;
    
    // Intentional bug: Not checking if company exists before update
    const result = await db.query(
      'UPDATE companies SET name = $1, email = $2, address = $3, phone = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [name, email, address, phone, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE company
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Intentional bug: No cascade delete handling or warning
    await db.query('DELETE FROM companies WHERE id = $1', [id]);
    
    // Intentional bug: Not checking if deletion was successful
    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET company with departments (with JOIN)
router.get('/:id/departments', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Intentional bug: Potential SQL injection and inefficient query
    const result = await db.query(`
      SELECT 
        c.id as company_id,
        c.name as company_name,
        c.email as company_email,
        d.id as department_id,
        d.name as department_name,
        d.budget as department_budget,
        d.manager_name
      FROM companies c
      LEFT JOIN departments d ON c.id = d.company_id
      WHERE c.id = ${id}
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
