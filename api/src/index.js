require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const applicationsRouter = require('./routes/applications');
const contactsRouter = require('./routes/contacts');
const volunteersRouter = require('./routes/volunteers');
const donationsRouter = require('./routes/donations');
const shopRouter = require('./routes/shop');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000', 'exp://localhost:8081'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stripe webhook needs raw body — mount BEFORE json parser
app.post('/api/donations/webhook', express.raw({ type: 'application/json' }), require('./routes/donations').webhookHandler);
app.post('/api/shop/webhook', express.raw({ type: 'application/json' }), require('./routes/shop').webhookHandler);

// JSON body parser for all other routes
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Routes
app.use('/api/applications', applicationsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/volunteers', volunteersRouter);
app.use('/api/donations', donationsRouter);
app.use('/api/shop', shopRouter);
app.use('/api/admin', adminRouter);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Jacks API running on port ${PORT}`);
});

module.exports = app;
