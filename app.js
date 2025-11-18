const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// Metrics
let requestCount = 0;
let healthCheckCount = 0;
const startTime = Date.now();

// Middleware for request count
app.use((req, res, next) => {
  requestCount++;
  next();
});

// Home route
app.get('/', (req, res) => {
  res.send(`
    <h1>🚀 My DevOps Web App</h1>
    <p>This app was deployed automatically via CI/CD!</p>
    <p>Current time: ${new Date().toLocaleString()}</p>
    <p>Total requests: ${requestCount}</p>
  `);
});

// Health check route
app.get('/health', (req, res) => {
  healthCheckCount++;
  res.json({
    status: 'healthy',
    time: new Date(),
    uptime: process.uptime(),
    requests: requestCount
  });
});

// Metrics route (for Prometheus)
app.get('/metrics', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP webapp_requests_total Total number of requests
# TYPE webapp_requests_total counter
webapp_requests_total ${requestCount}

# HELP webapp_health_checks_total Total number of health checks
# TYPE webapp_health_checks_total counter
webapp_health_checks_total ${healthCheckCount}

# HELP webapp_uptime_seconds Application uptime in seconds
# TYPE webapp_uptime_seconds gauge
webapp_uptime_seconds ${uptimeSeconds}

# HELP webapp_process_uptime_seconds Process uptime in seconds
# TYPE webapp_process_uptime_seconds gauge
webapp_process_uptime_seconds ${process.uptime()}

# HELP webapp_memory_usage_bytes Memory usage in bytes
# TYPE webapp_memory_usage_bytes gauge
webapp_memory_usage_bytes ${process.memoryUsage().heapUsed}

# HELP webapp_up Application is running
# TYPE webapp_up gauge
webapp_up 1
  `);
});

app.listen(PORT, () => {
  console.log(`✅ App running on port ${PORT}`);
  console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
});
