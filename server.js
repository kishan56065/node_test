const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const companyRoutes = require('./routes/companies');
const departmentRoutes = require('./routes/departments');
const employeeRoutes = require('./routes/employees');
const projectRoutes = require('./routes/projects');
const reportRoutes = require('./routes/reports');

// Routes
app.use('/api/companies', companyRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/reports', reportRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Node Test API Server',
    version: '1.0.0',
    endpoints: [
      '/api/companies',
      '/api/departments', 
      '/api/employees',
      '/api/projects',
      '/api/reports'
    ]
  });
});

// Intentional bug: Missing error handling middleware
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Intentional bug: No graceful shutdown handling
