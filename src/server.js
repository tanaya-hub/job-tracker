require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/mysql');
const connectMongo = require('./config/mongo');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const companyRoutes = require('./routes/companyRoutes');
app.use('/api/companies', companyRoutes);

const applicationRoutes = require('./routes/applicationRoutes');
app.use('/api/applications', applicationRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Job Tracker API is running' });
});

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('MySQL connected');

    await connectMongo();

    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Startup failed:', err.message);
    process.exit(1);
  }
}

start();