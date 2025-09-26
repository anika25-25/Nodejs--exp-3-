const { SeatModel, SEAT_STATUS } = require('../models/seatModel');
const { v4: uuidv4 } = require('uuid');

class SeatController {
  // GET /seats - List all seats
  static async getAllSeats(req, res) {
    try {
      const seats = SeatModel.getAllSeats();
      const stats = SeatModel.getStatistics();
      
      res.status(200).json({
        success: true,
        data: {
          seats: seats,
          statistics: stats,
          layout: {
            rows: ['A', 'B', 'C', 'D', 'E'],
            seatsPerRow: 8,
            total: 40
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve seats',
        details: error.message
      });
    }
  }

  // GET /seats/:id - Get specific seat
  static async getSeat(req, res) {
    try {
      const { id } = req.params;
      const seat = SeatModel.getSeatById(id.toUpperCase());
      
      if (!seat) {
        return res.status(404).json({
          success: false,
          error: `Seat ${id} not found`
        });
      }
      
      res.status(200).json({
        success: true,
        data: seat
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve seat',
        details: error.message
      });
    }
  }

  // POST /seats/:id/lock - Lock a seat
  static async lockSeat(req, res) {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required',
          required: ['userId']
        });
      }
      
      const seatId = id.toUpperCase();
      const result = await SeatModel.lockSeat(seatId, userId);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            seatId: seatId,
            lockId: result.lockId,
            lockExpiresAt: result.lockExpiresAt,
            seat: result.seat,
            lockDurationMinutes: 1
          }
        });
      } else {
        const statusCode = result.error.includes('not found') ? 404 : 409;
        res.status(statusCode).json({
          success: false,
          error: result.error,
          currentStatus: result.currentStatus
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to lock seat',
        details: error.message
      });
    }
  }

  // POST /seats/:id/confirm - Confirm booking
  static async confirmBooking(req, res) {
    try {
      const { id } = req.params;
      const { userId, lockId } = req.body;
      
      if (!userId || !lockId) {
        return res.status(400).json({
          success: false,
          error: 'userId and lockId are required',
          required: ['userId', 'lockId']
        });
      }
      
      const seatId = id.toUpperCase();
      const result = await SeatModel.confirmBooking(seatId, userId, lockId);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: {
            seatId: seatId,
            seat: result.seat,
            bookedAt: result.seat.bookedAt
          }
        });
      } else {
        const statusCode = result.error.includes('not found') ? 404 : 
                          result.error.includes('expired') ? 410 : 409;
        res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to confirm booking',
        details: error.message
      });
    }
  }

  // DELETE /seats/:id/unlock - Unlock a seat manually
  static async unlockSeat(req, res) {
    try {
      const { id } = req.params;
      const { userId, lockId } = req.body;
      
      if (!userId || !lockId) {
        return res.status(400).json({
          success: false,
          error: 'userId and lockId are required',
          required: ['userId', 'lockId']
        });
      }
      
      const seatId = id.toUpperCase();
      const result = await SeatModel.unlockSeat(seatId, userId, lockId);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            seatId: seatId,
            seat: result.seat
          }
        });
      } else {
        const statusCode = result.error.includes('not found') ? 404 : 403;
        res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to unlock seat',
        details: error.message
      });
    }
  }

  // GET /seats/statistics - Get seat statistics
  static async getStatistics(req, res) {
    try {
      const stats = SeatModel.getStatistics();
      
      res.status(200).json({
        success: true,
        data: {
          ...stats,
          occupancyRate: `${((stats.booked / stats.total) * 100).toFixed(1)}%`,
          lockRate: `${((stats.locked / stats.total) * 100).toFixed(1)}%`,
          availabilityRate: `${((stats.available / stats.total) * 100).toFixed(1)}%`
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve statistics',
        details: error.message
      });
    }
  }

  // POST /seats/reset - Reset all seats (for testing)
  static async resetSeats(req, res) {
    try {
      const result = SeatModel.resetSeats();
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          resetAt: new Date().toISOString(),
          totalSeats: 40
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to reset seats',
        details: error.message
      });
    }
  }
}

module.exports = SeatController;