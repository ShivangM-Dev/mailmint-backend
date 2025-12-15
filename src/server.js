require('dotenv').config();
const PORT = process.env.PORT || 8000;
const app = require('./app');

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Set a generous server timeout; per-request timeouts are handled in app.js.
server.setTimeout(Number(process.env.SERVER_TIMEOUT_MS || 15000));