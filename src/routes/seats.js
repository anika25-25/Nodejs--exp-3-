const express = require('express');
const router = express.Router();
const SeatController = require('../controllers/seatController');

// GET /seats - List all seats with status
router.get('/', SeatController.getAllSeats);

// GET /seats/statistics - Get seat statistics
router.get('/statistics', SeatController.getStatistics);

// GET /seats/:id - Get specific seat
router.get('/:id', SeatController.getSeat);

// POST /seats/:id/lock - Lock a seat temporarily
router.post('/:id/lock', SeatController.lockSeat);

// POST /seats/:id/confirm - Confirm booking (requires lock)
router.post('/:id/confirm', SeatController.confirmBooking);

// DELETE /seats/:id/unlock - Release lock manually
router.delete('/:id/unlock', SeatController.unlockSeat);

// POST /seats/reset - Reset all seats (for testing)
router.post('/reset', SeatController.resetSeats);

module.exports = router;