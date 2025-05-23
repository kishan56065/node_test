const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET comprehensive company report with multiple JOINs
router.get('/company-overview', async (req, res) => {
  try {
    // Intentional bug: Extremely complex query without proper indexing considerations
    // Intentional bug: No query timeout handling
    const result = await db.query(`
      SELECT 
        c.id as company_id,
        c.name as company_name,
        c.email as company_email,
        c.address as company_address,
        c.phone as company_phone,
        COUNT(DISTINCT d.id) as total_departments,
        COUNT(DISTINCT e.id) as total_employees,
        COUNT(DISTINCT p.id) as total_projects,
        SUM(d.budget) as total_department_budgets,
        SUM(e.salary) as total_employee_salaries,
        SUM(p.budget) as total_project_budgets,
        AVG(e.salary) as avg_employee_salary,
        AVG(p.budget) as avg_project_budget,
        COUNT(DISTINCT CASE WHEN e.is_active = true THEN e.id END) as active_employees,
        COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'in_progress' THEN p.id END) as in_progress_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'planning' THEN p.id END) as planning_projects,
        (SUM(d.budget) - SUM(e.salary)) as budget_vs_salary_diff,
        CASE 
          WHEN SUM(e.salary) > SUM(d.budget) THEN 'Over Budget'
          WHEN SUM(e.salary) > SUM(d.budget) * 0.9 THEN 'Near Budget Limit'
          ELSE 'Within Budget'
        END as budget_status,
        STRING_AGG(DISTINCT d.name, ', ' ORDER BY d.name) as department_names,
        STRING_AGG(DISTINCT e.position, ', ') as employee_positions
      FROM companies c
      LEFT JOIN departments d ON c.id = d.company_id
      LEFT JOIN employees e ON d.id = e.department_id
      LEFT JOIN projects p ON e.id = p.assigned_employee_id
      GROUP BY c.id, c.name, c.email, c.address, c.phone
      ORDER BY total_employees DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET employee performance report with complex calculations
router.get('/employee-performance', async (req, res) => {
  try {
    // Intentional bug: Performance issues with complex subqueries
    // Intentional bug: No data privacy considerations for salary information
    const result = await db.query(`
      SELECT 
        e.id as employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        e.email,
        e.position,
        e.salary,
        e.hire_date,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date)) as years_of_service,
        d.name as department_name,
        d.budget as department_budget,
        c.name as company_name,
        COUNT(p.id) as total_projects_assigned,
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_projects,
        COUNT(CASE WHEN p.status = 'in_progress' THEN 1 END) as in_progress_projects,
        SUM(p.budget) as total_project_value,
        AVG(p.budget) as avg_project_value,
        (COUNT(CASE WHEN p.status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(p.id), 0)) as completion_rate,
        (e.salary / NULLIF(d.budget, 0) * 100) as salary_percentage_of_dept_budget,
        (SUM(p.budget) / NULLIF(e.salary, 0)) as project_value_to_salary_ratio,
        CASE 
          WHEN COUNT(p.id) = 0 THEN 'No Projects'
          WHEN COUNT(p.id) > 5 THEN 'Overloaded'
          WHEN COUNT(p.id) > 3 THEN 'High Load'
          WHEN COUNT(p.id) > 1 THEN 'Normal Load'
          ELSE 'Light Load'
        END as workload_status,
        (
          SELECT AVG(salary) 
          FROM employees e2 
          WHERE e2.department_id = e.department_id AND e2.position = e.position
        ) as avg_position_salary_in_dept,
        (e.salary - (
          SELECT AVG(salary) 
          FROM employees e3 
          WHERE e3.department_id = e.department_id AND e3.position = e.position
        )) as salary_diff_from_avg
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN companies c ON d.company_id = c.id
      LEFT JOIN projects p ON e.id = p.assigned_employee_id
      WHERE e.is_active = true
      GROUP BY e.id, e.first_name, e.last_name, e.email, e.position, e.salary, 
               e.hire_date, d.id, d.name, d.budget, c.name
      ORDER BY total_project_value DESC, completion_rate DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET project timeline analysis with multiple JOINs
router.get('/project-timeline', async (req, res) => {
  try {
    // Intentional bug: No date range filtering, could return massive datasets
    // Intentional bug: Complex date calculations without timezone handling
    const result = await db.query(`
      SELECT 
        p.id as project_id,
        p.name as project_name,
        p.description,
        p.start_date,
        p.end_date,
        p.budget,
        p.status,
        (p.end_date - p.start_date) as planned_duration_days,
        CASE 
          WHEN p.status = 'completed' AND p.end_date < CURRENT_DATE THEN 'Completed Early'
          WHEN p.status = 'completed' AND p.end_date >= CURRENT_DATE THEN 'Completed On Time'
          WHEN p.status != 'completed' AND p.end_date < CURRENT_DATE THEN 'Overdue'
          WHEN p.status != 'completed' AND p.end_date >= CURRENT_DATE THEN 'On Track'
          ELSE 'Unknown'
        END as timeline_status,
        (CURRENT_DATE - p.end_date) as days_overdue,
        e.first_name || ' ' || e.last_name as assigned_employee,
        e.position as employee_position,
        e.salary as employee_salary,
        d.name as department_name,
        d.budget as department_budget,
        d.manager_name,
        c.name as company_name,
        c.email as company_email,
        (p.budget / NULLIF((p.end_date - p.start_date), 0)) as daily_budget_burn,
        (e.salary / 365.0) as daily_employee_cost,
        ((p.budget / NULLIF((p.end_date - p.start_date), 0)) - (e.salary / 365.0)) as daily_profit_margin,
        EXTRACT(MONTH FROM p.start_date) as start_month,
        EXTRACT(YEAR FROM p.start_date) as start_year,
        EXTRACT(QUARTER FROM p.start_date) as start_quarter
      FROM projects p
      LEFT JOIN employees e ON p.assigned_employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN companies c ON d.company_id = c.id
      ORDER BY p.start_date DESC, p.budget DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET financial summary with complex aggregations
router.get('/financial-summary', async (req, res) => {
  try {
    // Intentional bug: Potential division by zero errors
    // Intentional bug: No financial data access controls
    const result = await db.query(`
      SELECT 
        c.name as company_name,
        SUM(d.budget) as total_department_budget,
        SUM(e.salary) as total_employee_costs,
        SUM(p.budget) as total_project_budgets,
        COUNT(DISTINCT d.id) as department_count,
        COUNT(DISTINCT e.id) as employee_count,
        COUNT(DISTINCT p.id) as project_count,
        (SUM(d.budget) / COUNT(DISTINCT d.id)) as avg_department_budget,
        (SUM(e.salary) / COUNT(DISTINCT e.id)) as avg_employee_salary,
        (SUM(p.budget) / COUNT(DISTINCT p.id)) as avg_project_budget,
        (SUM(d.budget) - SUM(e.salary)) as budget_surplus_deficit,
        ((SUM(d.budget) - SUM(e.salary)) / SUM(d.budget) * 100) as budget_efficiency_percentage,
        (SUM(p.budget) / SUM(e.salary)) as project_to_salary_ratio,
        SUM(CASE WHEN p.status = 'completed' THEN p.budget ELSE 0 END) as completed_project_value,
        SUM(CASE WHEN p.status = 'in_progress' THEN p.budget ELSE 0 END) as in_progress_project_value,
        SUM(CASE WHEN p.status = 'planning' THEN p.budget ELSE 0 END) as planning_project_value,
        (SUM(CASE WHEN p.status = 'completed' THEN p.budget ELSE 0 END) / 
         NULLIF(SUM(p.budget), 0) * 100) as completion_value_percentage,
        CASE 
          WHEN (SUM(d.budget) - SUM(e.salary)) < 0 THEN 'Over Budget'
          WHEN (SUM(d.budget) - SUM(e.salary)) / SUM(d.budget) < 0.1 THEN 'Tight Budget'
          WHEN (SUM(d.budget) - SUM(e.salary)) / SUM(d.budget) < 0.2 THEN 'Moderate Budget'
          ELSE 'Healthy Budget'
        END as financial_health_status
      FROM companies c
      LEFT JOIN departments d ON c.id = d.company_id
      LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
      LEFT JOIN projects p ON e.id = p.assigned_employee_id
      GROUP BY c.id, c.name
      HAVING COUNT(DISTINCT d.id) > 0
      ORDER BY total_department_budget DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET department efficiency report
router.get('/department-efficiency', async (req, res) => {
  try {
    // Intentional bug: Very expensive query with multiple subqueries
    // Intentional bug: No result caching for frequently accessed data
    const result = await db.query(`
      SELECT 
        d.id as department_id,
        d.name as department_name,
        d.budget as department_budget,
        d.manager_name,
        c.name as company_name,
        COUNT(DISTINCT e.id) as total_employees,
        COUNT(DISTINCT CASE WHEN e.is_active = true THEN e.id END) as active_employees,
        COUNT(DISTINCT p.id) as total_projects,
        SUM(e.salary) as total_salary_cost,
        SUM(p.budget) as total_project_value,
        AVG(e.salary) as avg_employee_salary,
        AVG(p.budget) as avg_project_budget,
        (d.budget - SUM(e.salary)) as remaining_budget,
        (SUM(e.salary) / d.budget * 100) as budget_utilization_percentage,
        (COUNT(DISTINCT p.id) / NULLIF(COUNT(DISTINCT e.id), 0)) as projects_per_employee,
        (SUM(p.budget) / NULLIF(SUM(e.salary), 0)) as project_value_per_salary_dollar,
        COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'in_progress' THEN p.id END) as in_progress_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'planning' THEN p.id END) as planning_projects,
        (COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) * 100.0 / 
         NULLIF(COUNT(DISTINCT p.id), 0)) as project_completion_rate,
        (
          SELECT COUNT(*) 
          FROM projects p2 
          JOIN employees e2 ON p2.assigned_employee_id = e2.id 
          WHERE e2.department_id = d.id AND p2.end_date < CURRENT_DATE AND p2.status != 'completed'
        ) as overdue_projects,
        CASE 
          WHEN (SUM(e.salary) / d.budget) > 1 THEN 'Over Budget'
          WHEN (SUM(e.salary) / d.budget) > 0.9 THEN 'Near Budget Limit'
          WHEN (SUM(e.salary) / d.budget) > 0.7 THEN 'High Utilization'
          WHEN (SUM(e.salary) / d.budget) > 0.5 THEN 'Moderate Utilization'
          ELSE 'Low Utilization'
        END as budget_utilization_status,
        CASE 
          WHEN COUNT(DISTINCT p.id) = 0 THEN 'No Projects'
          WHEN (COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) * 100.0 / 
                NULLIF(COUNT(DISTINCT p.id), 0)) > 80 THEN 'High Performance'
          WHEN (COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) * 100.0 / 
                NULLIF(COUNT(DISTINCT p.id), 0)) > 60 THEN 'Good Performance'
          WHEN (COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) * 100.0 / 
                NULLIF(COUNT(DISTINCT p.id), 0)) > 40 THEN 'Average Performance'
          ELSE 'Poor Performance'
        END as performance_rating
      FROM departments d
      LEFT JOIN companies c ON d.company_id = c.id
      LEFT JOIN employees e ON d.id = e.department_id
      LEFT JOIN projects p ON e.id = p.assigned_employee_id
      GROUP BY d.id, d.name, d.budget, d.manager_name, c.name
      ORDER BY project_completion_rate DESC, budget_utilization_percentage DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET cross-company comparison (if multiple companies exist)
router.get('/cross-company-analysis', async (req, res) => {
  try {
    // Intentional bug: No access control for sensitive competitive data
    // Intentional bug: Potential memory issues with large result sets
    const result = await db.query(`
      WITH company_metrics AS (
        SELECT 
          c.id,
          c.name,
          COUNT(DISTINCT d.id) as dept_count,
          COUNT(DISTINCT e.id) as emp_count,
          COUNT(DISTINCT p.id) as project_count,
          SUM(d.budget) as total_budget,
          SUM(e.salary) as total_salaries,
          SUM(p.budget) as total_project_value,
          AVG(e.salary) as avg_salary,
          COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_projects
        FROM companies c
        LEFT JOIN departments d ON c.id = d.company_id
        LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
        LEFT JOIN projects p ON e.id = p.assigned_employee_id
        GROUP BY c.id, c.name
      ),
      industry_averages AS (
        SELECT 
          AVG(dept_count) as avg_dept_count,
          AVG(emp_count) as avg_emp_count,
          AVG(project_count) as avg_project_count,
          AVG(total_budget) as avg_total_budget,
          AVG(total_salaries) as avg_total_salaries,
          AVG(avg_salary) as industry_avg_salary
        FROM company_metrics
      )
      SELECT 
        cm.*,
        ia.avg_dept_count,
        ia.avg_emp_count,
        ia.avg_project_count,
        ia.avg_total_budget,
        ia.avg_total_salaries,
        ia.industry_avg_salary,
        (cm.dept_count - ia.avg_dept_count) as dept_count_vs_avg,
        (cm.emp_count - ia.avg_emp_count) as emp_count_vs_avg,
        (cm.avg_salary - ia.industry_avg_salary) as salary_vs_industry_avg,
        (cm.total_budget / NULLIF(cm.emp_count, 0)) as budget_per_employee,
        (cm.total_project_value / NULLIF(cm.emp_count, 0)) as project_value_per_employee,
        (cm.completed_projects * 100.0 / NULLIF(cm.project_count, 0)) as completion_rate,
        CASE 
          WHEN cm.avg_salary > ia.industry_avg_salary * 1.2 THEN 'Above Market'
          WHEN cm.avg_salary > ia.industry_avg_salary * 0.8 THEN 'Market Rate'
          ELSE 'Below Market'
        END as salary_competitiveness,
        RANK() OVER (ORDER BY cm.total_project_value DESC) as project_value_rank,
        RANK() OVER (ORDER BY cm.avg_salary DESC) as avg_salary_rank,
        RANK() OVER (ORDER BY (cm.completed_projects * 100.0 / NULLIF(cm.project_count, 0)) DESC) as completion_rate_rank
      FROM company_metrics cm
      CROSS JOIN industry_averages ia
      ORDER BY cm.total_project_value DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
