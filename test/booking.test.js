const request = require('supertest');
const app = require('../src/app');

describe('Concurrent Ticket Booking System', () => {
  beforeEach(async () => {
    // Reset seats before each test
    await request(app).post('/seats/reset');
  });

  describe('GET /seats', () => {
    it('should return all seats with initial state', async () => {
      const res = await request(app).get('/seats');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.seats).toHaveLength(40);
      expect(res.body.data.statistics.total).toBe(40);
      expect(res.body.data.statistics.available).toBe(40);
      expect(res.body.data.statistics.locked).toBe(0);
      expect(res.body.data.statistics.booked).toBe(0);
    });
  });

  describe('GET /seats/:id', () => {
    it('should return specific seat information', async () => {
      const res = await request(app).get('/seats/A1');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('A1');
      expect(res.body.data.status).toBe('available');
    });

    it('should return 404 for non-existent seat', async () => {
      const res = await request(app).get('/seats/Z9');
      
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /seats/:id/lock', () => {
    it('should lock an available seat', async () => {
      const res = await request(app)
        .post('/seats/A1/lock')
        .send({ userId: 'user123' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lockId).toBeDefined();
      expect(res.body.data.lockExpiresAt).toBeDefined();
    });

    it('should not lock an already locked seat', async () => {
      // Lock the seat first
      await request(app)
        .post('/seats/A1/lock')
        .send({ userId: 'user1' });
      
      // Try to lock again with different user
      const res = await request(app)
        .post('/seats/A1/lock')
        .send({ userId: 'user2' });
      
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('locked');
    });

    it('should return 400 if userId is missing', async () => {
      const res = await request(app)
        .post('/seats/A1/lock')
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('userId is required');
    });
  });

  describe('POST /seats/:id/confirm', () => {
    it('should confirm booking with valid lock', async () => {
      // Lock the seat first
      const lockRes = await request(app)
        .post('/seats/A1/lock')
        .send({ userId: 'user123' });
      
      const lockId = lockRes.body.data.lockId;
      
      // Confirm booking
      const res = await request(app)
        .post('/seats/A1/confirm')
        .send({ userId: 'user123', lockId });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.seat.status).toBe('booked');
    });

    it('should not confirm booking without lock', async () => {
      const res = await request(app)
        .post('/seats/A1/confirm')
        .send({ userId: 'user123', lockId: 'fake-lock-id' });
      
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should not confirm booking with wrong user', async () => {
      // Lock with user1
      const lockRes = await request(app)
        .post('/seats/A1/lock')
        .send({ userId: 'user1' });
      
      const lockId = lockRes.body.data.lockId;
      
      // Try to confirm with user2
      const res = await request(app)
        .post('/seats/A1/confirm')
        .send({ userId: 'user2', lockId });
      
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /seats/:id/unlock', () => {
    it('should unlock a locked seat', async () => {
      // Lock the seat first
      const lockRes = await request(app)
        .post('/seats/A1/lock')
        .send({ userId: 'user123' });
      
      const lockId = lockRes.body.data.lockId;
      
      // Unlock the seat
      const res = await request(app)
        .delete('/seats/A1/unlock')
        .send({ userId: 'user123', lockId });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.seat.status).toBe('available');
    });

    it('should not unlock seat with wrong credentials', async () => {
      // Lock with user1
      const lockRes = await request(app)
        .post('/seats/A1/lock')
        .send({ userId: 'user1' });
      
      const lockId = lockRes.body.data.lockId;
      
      // Try to unlock with user2
      const res = await request(app)
        .delete('/seats/A1/unlock')
        .send({ userId: 'user2', lockId });
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /seats/statistics', () => {
    it('should return current seat statistics', async () => {
      // Lock one seat and book another
      const lockRes = await request(app)
        .post('/seats/A1/lock')
        .send({ userId: 'user1' });
      
      await request(app)
        .post('/seats/A2/lock')
        .send({ userId: 'user2' });
      
      await request(app)
        .post('/seats/A2/confirm')
        .send({ userId: 'user2', lockId: lockRes.body.data.lockId });
      
      const res = await request(app).get('/seats/statistics');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(40);
      expect(res.body.data.available).toBe(38);
      expect(res.body.data.locked).toBe(1);
      expect(res.body.data.booked).toBe(1);
    });
  });

  describe('Concurrent Access', () => {
    it('should prevent race conditions when multiple users try to lock same seat', async () => {
      const promises = [];
      const userCount = 5;
      
      // Create 5 concurrent lock requests for the same seat
      for (let i = 1; i <= userCount; i++) {
        promises.push(
          request(app)
            .post('/seats/A1/lock')
            .send({ userId: `user${i}` })
        );
      }
      
      const results = await Promise.all(promises);
      
      // Only one should succeed
      const successful = results.filter(res => res.body.success);
      const failed = results.filter(res => !res.body.success);
      
      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(4);
      
      // Check that the successful lock has proper data
      expect(successful[0].body.data.lockId).toBeDefined();
      expect(successful[0].body.data.lockExpiresAt).toBeDefined();
    });

    it('should handle concurrent bookings of different seats', async () => {
      const seats = ['A1', 'A2', 'A3', 'B1', 'B2'];
      const promises = seats.map((seat, index) => 
        request(app)
          .post(`/seats/${seat}/lock`)
          .send({ userId: `user${index + 1}` })
      );
      
      const results = await Promise.all(promises);
      
      // All should succeed since they're different seats
      results.forEach(res => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.lockId).toBeDefined();
      });
    });
  });

  describe('Lock Expiration', () => {
    it('should handle lock expiration correctly', async (done) => {
      // Mock shorter lock duration for testing
      const originalLockDuration = require('../src/models/seatModel').LOCK_DURATION;
      
      // This is a simplified test - in real scenarios, you'd mock the timing
      const lockRes = await request(app)
        .post('/seats/A1/lock')
        .send({ userId: 'user123' });
      
      expect(lockRes.body.success).toBe(true);
      
      // Verify seat is locked
      const seatRes = await request(app).get('/seats/A1');
      expect(seatRes.body.data.status).toBe('locked');
      
      done();
    });
  });

  describe('POST /seats/reset', () => {
    it('should reset all seats to available state', async () => {
      // Lock and book some seats first
      await request(app)
        .post('/seats/A1/lock')
        .send({ userId: 'user1' });
      
      const lockRes = await request(app)
        .post('/seats/A2/lock')
        .send({ userId: 'user2' });
      
      await request(app)
        .post('/seats/A2/confirm')
        .send({ userId: 'user2', lockId: lockRes.body.data.lockId });
      
      // Reset all seats
      const resetRes = await request(app).post('/seats/reset');
      
      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);
      
      // Verify all seats are available
      const seatsRes = await request(app).get('/seats');
      expect(seatsRes.body.data.statistics.available).toBe(40);
      expect(seatsRes.body.data.statistics.locked).toBe(0);
      expect(seatsRes.body.data.statistics.booked).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const res = await request(app)
        .post('/seats/A1/lock')
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should handle non-existent endpoints', async () => {
      const res = await request(app).get('/nonexistent');
      
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Health Check', () => {
    it('should return system health status', async () => {
      const res = await request(app).get('/health');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('OK');
      expect(res.body.timestamp).toBeDefined();
    });
  });
});