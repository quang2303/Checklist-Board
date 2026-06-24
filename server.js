const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { migrateDataFromJSON } = require('./utils/migration');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static views (View Layer)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/form', express.static(path.join(__dirname, 'form')));

// Initialize DB and Run Migration
connectDB().then(() => {
  migrateDataFromJSON();
});

// Routes
app.use(routes);

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access locally: http://localhost:${PORT}`);
  console.log(`Or share with your team: http://<YOUR_IP>:${PORT}`);
});
