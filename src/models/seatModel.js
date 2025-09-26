const { v4: uuidv4 } = require('uuid');

// Seat states
const SEAT_STATUS = {
  AVAILABLE: 'available',
  LOCKED: 'locked', 
  BOOKED: 'booked'
};

// Lock duration in milliseconds (1 minute)
const LOCK_DURATION = 60 * 1000;

// Initialize theater with seat layout (5 rows, 8 seats each)
const initializeSeats = () => {
  const seats = {};
  const rows = ['A', 'B', 'C', 'D', 'E'];
  const seatsPerRow = 8;
  
  rows.forEach(row => {
    for (let i = 1; i <= seatsPerRow; i++) {
      const seatId = `${row}${i}`;
      seats[seatId] = {
        id: seatId,
        row: row,
        number: i,
        status: SEAT_STATUS.AVAILABLE,
        userId: null,
        lockId: null,
        lockedAt: null,
        lockExpiresAt: null,
        bookedAt: null
      };
    }
  });
  
  return seats;
};

// In-memory seat storage
let seats = initializeSeats();

// Mutex for preventing race conditions during seat operations
const seatMutex = new Map();

// Helper function to acquire mutex for a seat
const acquireMutex = (seatId) => {
  return new Promise((resolve) => {
    const checkMutex = () => {
      if (!seatMutex.has(seatId)) {
        seatMutex.set(seatId, true);
        resolve();
      } else {
        // Wait a bit and try again (simple spin lock)
        setTimeout(checkMutex, 1);
      }
    };
    checkMutex();
  });
};

// Helper function to release mutex for a seat
const releaseMutex = (seatId) => {
  seatMutex.delete(seatId);
};

// Clean up expired locks periodically
const cleanupExpiredLocks = () => {
  const now = new Date();
  Object.keys(seats).forEach(seatId => {
    const seat = seats[seatId];
    if (seat.status === SEAT_STATUS.LOCKED && seat.lockExpiresAt && now > seat.lockExpiresAt) {
      seat.status = SEAT_STATUS.AVAILABLE;
      seat.userId = null;
      seat.lockId = null;
      seat.lockedAt = null;
      seat.lockExpiresAt = null;
      console.log(`Lock expired for seat ${seatId}`);
    }
  });
};

// Run cleanup every 10 seconds
setInterval(cleanupExpiredLocks, 10000);

class SeatModel {
  // Get all seats with current status
  static getAllSeats() {
    cleanupExpiredLocks();
    return Object.values(seats);
  }

  // Get seat by ID
  static getSeatById(seatId) {
    cleanupExpiredLocks();
    return seats[seatId] || null;
  }

  // Lock a seat (thread-safe)
  static async lockSeat(seatId, userId) {
    await acquireMutex(seatId);
    
    try {
      cleanupExpiredLocks();
      const seat = seats[seatId];
      
      if (!seat) {
        return { success: false, error: 'Seat not found' };
      }
      
      if (seat.status !== SEAT_STATUS.AVAILABLE) {
        return { 
          success: false, 
          error: `Seat ${seatId} is ${seat.status}`,
          currentStatus: seat.status 
        };
      }
      
      // Create lock
      const lockId = uuidv4();
      const lockedAt = new Date();
      const lockExpiresAt = new Date(lockedAt.getTime() + LOCK_DURATION);
      
      seat.status = SEAT_STATUS.LOCKED;
      seat.userId = userId;
      seat.lockId = lockId;
      seat.lockedAt = lockedAt;
      seat.lockExpiresAt = lockExpiresAt;
      
      return {
        success: true,
        message: `Seat ${seatId} locked successfully`,
        lockId: lockId,
        lockExpiresAt: lockExpiresAt,
        seat: { ...seat }
      };
    } finally {
      releaseMutex(seatId);
    }
  }

  // Confirm booking (thread-safe)
  static async confirmBooking(seatId, userId, lockId) {
    await acquireMutex(seatId);
    
    try {
      cleanupExpiredLocks();
      const seat = seats[seatId];
      
      if (!seat) {
        return { success: false, error: 'Seat not found' };
      }
      
      if (seat.status !== SEAT_STATUS.LOCKED) {
        return { 
          success: false, 
          error: `Seat ${seatId} is not locked. Current status: ${seat.status}` 
        };
      }
      
      if (seat.userId !== userId) {
        return { 
          success: false, 
          error: `Seat ${seatId} is locked by another user` 
        };
      }
      
      if (seat.lockId !== lockId) {
        return { 
          success: false, 
          error: `Invalid lock ID for seat ${seatId}` 
        };
      }
      
      // Check if lock has expired
      if (new Date() > seat.lockExpiresAt) {
        seat.status = SEAT_STATUS.AVAILABLE;
        seat.userId = null;
        seat.lockId = null;
        seat.lockedAt = null;
        seat.lockExpiresAt = null;
        return { 
          success: false, 
          error: `Lock for seat ${seatId} has expired` 
        };
      }
      
      // Confirm booking
      seat.status = SEAT_STATUS.BOOKED;
      seat.bookedAt = new Date();
      seat.lockId = null;
      seat.lockedAt = null;
      seat.lockExpiresAt = null;
      
      return {
        success: true,
        message: `Seat ${seatId} booked successfully`,
        seat: { ...seat }
      };
    } finally {
      releaseMutex(seatId);
    }
  }

  // Unlock a seat manually (thread-safe)
  static async unlockSeat(seatId, userId, lockId) {
    await acquireMutex(seatId);
    
    try {
      const seat = seats[seatId];
      
      if (!seat) {
        return { success: false, error: 'Seat not found' };
      }
      
      if (seat.status !== SEAT_STATUS.LOCKED) {
        return { 
          success: false, 
          error: `Seat ${seatId} is not locked. Current status: ${seat.status}` 
        };
      }
      
      if (seat.userId !== userId || seat.lockId !== lockId) {
        return { 
          success: false, 
          error: `Cannot unlock seat ${seatId}. Invalid user or lock ID` 
        };
      }
      
      // Release lock
      seat.status = SEAT_STATUS.AVAILABLE;
      seat.userId = null;
      seat.lockId = null;
      seat.lockedAt = null;
      seat.lockExpiresAt = null;
      
      return {
        success: true,
        message: `Seat ${seatId} unlocked successfully`,
        seat: { ...seat }
      };
    } finally {
      releaseMutex(seatId);
    }
  }

  // Get seat statistics
  static getStatistics() {
    cleanupExpiredLocks();
    const stats = {
      total: 0,
      available: 0,
      locked: 0,
      booked: 0
    };
    
    Object.values(seats).forEach(seat => {
      stats.total++;
      stats[seat.status]++;
    });
    
    return stats;
  }

  // Reset all seats (for testing)
  static resetSeats() {
    seats = initializeSeats();
    seatMutex.clear();
    return { success: true, message: 'All seats reset to available' };
  }
}

module.exports = {
  SeatModel,
  SEAT_STATUS,
  LOCK_DURATION
};