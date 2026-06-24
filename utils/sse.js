let sseClients = [];

function addClient(client) {
  sseClients.push(client);
}

function removeClient(clientId) {
  sseClients = sseClients.filter(client => client.id !== clientId);
}

function notifyClients(type, payload) {
  const message = `event: update\ndata: ${JSON.stringify({ type, payload })}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(message);
    } catch (err) {
      console.error(`Error sending SSE notification to client ${client.id}:`, err);
    }
  });
}

module.exports = {
  addClient,
  removeClient,
  notifyClients,
  getClientsCount: () => sseClients.length
};
