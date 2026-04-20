// SSE (Server-Sent Events) notification service for real-time dashboard updates
const clients = new Map(); // sellerId -> Set of response objects

export function addClient(sellerId, res) {
  if (!clients.has(sellerId)) clients.set(sellerId, new Set());
  clients.get(sellerId).add(res);

  res.on('close', () => {
    clients.get(sellerId)?.delete(res);
    if (clients.get(sellerId)?.size === 0) clients.delete(sellerId);
  });
}

export function broadcast(sellerId, event, data) {
  const subs = clients.get(sellerId);
  if (!subs) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of subs) {
    res.write(payload);
  }
}
