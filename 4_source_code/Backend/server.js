const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const { testDbConnection } = require('./src/config/db');
const { notFound, errorHandler } = require('./src/middlewares/error.Middleware');

// Route imports
const authRoutes = require('./src/routes/auth.Routes');
const contentRoutes = require('./src/routes/content.Routes');
const feedRoutes = require('./src/routes/feed.Routes');
const analyticsRoutes = require('./src/routes/analytics.Routes');
const searchRoutes = require('./src/routes/search.Routes');

const app = express();
const port = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically for local development
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/status', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Illusion Gallery Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/search', searchRoutes);

// Error Handling Middlewares (Must be registered after all routes)
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(port, async () => {
  console.log(` Server is running on port ${port}`);
  await testDbConnection();
});

module.exports = app;
