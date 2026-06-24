const sse = require('../utils/sse');

const connectEvents = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  
  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sse.addClient(newClient);
  
  // Keep connection alive with a ping every 30 seconds
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (err) {
      console.error(`Error sending ping to SSE client ${clientId}:`, err);
    }
  }, 30000);
  
  req.on('close', () => {
    clearInterval(pingInterval);
    sse.removeClient(clientId);
  });
};

module.exports = {
  connectEvents
};
