# 🎫 Concurrent Ticket Booking System

Advanced Node.js/Express system demonstrating **seat locking**, **concurrency control**, and **race condition prevention**.

## 🎯 Features

- **Seat Management**: View available seats, lock temporarily, confirm booking
- **Concurrency Safety**: Prevents double-booking with mutex-like locking
- **Auto-Expiration**: Locks expire automatically after 1 minute
- **Race Condition Prevention**: Thread-safe operations with atomic updates
- **Visual Interface**: Interactive seat map for testing
- **Comprehensive Testing**: Concurrent request simulation

## 🏗️ Architecture

```
EXP 3/
├── src/
│   ├── models/seatModel.js      # Seat data & locking logic
│   ├── controllers/seatController.js # Business logic
│   ├── routes/seats.js          # API routes
│   ├── middleware/errorHandler.js # Error handling
│   ├── app.js                   # Express app
│   └── server.js               # Server entry point
├── public/index.html           # Interactive interface
├── test/                       # Unit & concurrent tests
└── README.md
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/seats` | View all seats with status |
| POST | `/seats/:id/lock` | Lock seat temporarily (1 min) |
| POST | `/seats/:id/confirm` | Confirm booking (requires lock) |
| DELETE | `/seats/:id/unlock` | Release lock manually |
| GET | `/health` | System health check |

## 🎭 Seat States

- **`available`** - Free to book
- **`locked`** - Temporarily reserved (expires in 1 min)
- **`booked`** - Permanently reserved

## 🚀 Quick Start

```bash
cd "EXP 3"
npm install
npm run dev
```

Open: http://localhost:4000

## 🧪 Testing Concurrency

```bash
# Simulate concurrent bookings
npm run test:concurrent

# Run unit tests
npm test
```

## 💡 Key Concepts Demonstrated

- **Atomic Operations**: Thread-safe seat state changes
- **Mutex Pattern**: Preventing concurrent access to same seat
- **Timeout Handling**: Auto-expiring locks
- **Race Condition Prevention**: Safe concurrent request handling
- **State Management**: In-memory seat tracking

## 🎨 Interactive Features

- Visual seat map (theater-style layout)
- Real-time lock status updates
- Concurrent user simulation
- Lock expiration countdown
- Booking confirmation workflow

## 📊 Example Usage

```javascript
// Lock a seat
POST /seats/A5/lock
{
  "success": true,
  "message": "Seat A5 locked successfully",
  "lockExpiresAt": "2025-09-24T21:30:45.123Z",
  "lockId": "uuid-here"
}

// Confirm booking
POST /seats/A5/confirm
{
  "success": true,
  "message": "Seat A5 booked successfully",
  "seat": { "id": "A5", "status": "booked", "userId": "user-123" }
}
```