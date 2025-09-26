const express = require('express');
const path = require('path');
const seatsRouter = require('./routes/seats');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Middleware for parsing JSON and setting headers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS and security headers
app.use((req, res, next) => {
  res.header('Content-Type', 'application/json');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/seats', seatsRouter);

// Root endpoint - serve HTML interface or API info
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.status(200).json({ 
      success: true,
      message: 'Concurrent Ticket Booking System',
      version: '1.0.0',
      features: [
        'Seat locking with auto-expiration',
        'Concurrency-safe operations', 
        'Race condition prevention',
        'Real-time seat status'
      ],
      endpoints: {
        'GET /seats': 'List all seats with status',
        'GET /seats/:id': 'Get specific seat details',
        'POST /seats/:id/lock': 'Lock seat temporarily (1 min)',
        'POST /seats/:id/confirm': 'Confirm booking (requires lock)',
        'DELETE /seats/:id/unlock': 'Release lock manually',
        'GET /seats/statistics': 'Get seat statistics',
        'POST /seats/reset': 'Reset all seats (testing)'
      },
      interface: 'Visit http://localhost:4000 in browser for visual interface'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: ['/seats', '/health']
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;