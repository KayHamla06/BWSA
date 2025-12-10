import { verifyToken } from './jwt';

export function withAuth(handler) {
  return async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.user = decoded;
      return handler(req, res);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };
}

export function withApiKey(handler) {
  return async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];

      if (!apiKey) {
        return res.status(401).json({ error: 'No API key provided' });
      }

      // API key validation will be done in the handler
      req.apiKey = apiKey;
      return handler(req, res);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };
}