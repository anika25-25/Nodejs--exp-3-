const app = require('./app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🎫 Concurrent Ticket Booking System listening on http://localhost:${PORT}`);
  console.log(`📊 Interactive interface: http://localhost:${PORT}`);
  console.log(`🔧 API endpoints: http://localhost:${PORT}/seats`);
  console.log('💡 Features: Seat locking, Concurrency control, Auto-expiration');
});