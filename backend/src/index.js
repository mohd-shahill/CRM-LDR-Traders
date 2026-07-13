import dotenv from 'dotenv';
import { createServer } from 'http';
import app, { allowedOrigins } from './app.js';
import { initSocket } from './services/socket.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

// Initialize socket.io with the HTTP server
initSocket(httpServer, allowedOrigins);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} with WebSockets enabled.`);
});
