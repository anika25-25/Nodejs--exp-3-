// Concurrent testing script for manual testing
const http = require('http');

const API_BASE = 'http://localhost:4000';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsedData });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test concurrent seat locking
async function testConcurrentLocking() {
  console.log('🚀 Starting Concurrent Seat Locking Test\n');
  
  const seatId = 'A5';
  const userCount = 10;
  
  console.log(`Testing ${userCount} users trying to lock seat ${seatId} simultaneously...`);
  
  // Reset seats first
  await makeRequest('POST', '/seats/reset');
  
  // Create concurrent lock requests
  const promises = [];
  const startTime = Date.now();
  
  for (let i = 1; i <= userCount; i++) {
    const userId = `concurrentUser${i}`;
    promises.push(
      makeRequest('POST', `/seats/${seatId}/lock`, { userId })
        .then(result => ({ userId, ...result }))
        .catch(error => ({ userId, error: error.message }))
    );
  }
  
  try {
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    console.log(`\n⏱️  Test completed in ${endTime - startTime}ms\n`);
    
    // Analyze results
    const successful = results.filter(r => r.data && r.data.success);
    const failed = results.filter(r => !r.data || !r.data.success);
    
    console.log('📊 Results Summary:');
    console.log(`✅ Successful locks: ${successful.length}`);
    console.log(`❌ Failed attempts: ${failed.length}`);
    console.log(`🎯 Race condition prevention: ${failed.length === userCount - 1 ? 'PASSED' : 'FAILED'}\n`);
    
    if (successful.length === 1) {
      console.log('🏆 CONCURRENT TEST PASSED! Only one user successfully locked the seat.');
      console.log(`Winner: ${successful[0].userId}`);
      console.log(`Lock ID: ${successful[0].data.data.lockId}`);
      console.log(`Lock expires: ${successful[0].data.data.lockExpiresAt}\n`);
    } else {
      console.log('❌ CONCURRENT TEST FAILED! Multiple users locked the same seat.');
      successful.forEach(s => {
        console.log(`- ${s.userId} got lock ID: ${s.data.data.lockId}`);
      });
      console.log('');
    }
    
    console.log('📝 Detailed Results:');
    results.forEach((result, index) => {
      const status = result.data && result.data.success ? '✅' : '❌';
      const message = result.data ? (result.data.message || result.data.error) : result.error;
      console.log(`${status} ${result.userId}: ${message}`);
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Test lock expiration
async function testLockExpiration() {
  console.log('\n🕐 Starting Lock Expiration Test\n');
  
  const seatId = 'B3';
  const userId = 'expirationTestUser';
  
  // Reset seats
  await makeRequest('POST', '/seats/reset');
  
  // Lock a seat
  console.log('Locking seat B3...');
  const lockResult = await makeRequest('POST', `/seats/${seatId}/lock`, { userId });
  
  if (lockResult.data.success) {
    console.log(`✅ Seat locked successfully!`);
    console.log(`Lock ID: ${lockResult.data.data.lockId}`);
    console.log(`Expires at: ${lockResult.data.data.lockExpiresAt}`);
    
    // Check seat status
    console.log('\n🔍 Checking seat status every 10 seconds...');
    const checkInterval = setInterval(async () => {
      const seatStatus = await makeRequest('GET', `/seats/${seatId}`);
      console.log(`Seat ${seatId} status: ${seatStatus.data.data.status}`);
      
      if (seatStatus.data.data.status === 'available') {
        console.log('🎉 Lock expired successfully! Seat is now available.');
        clearInterval(checkInterval);
      }
    }, 10000);
    
    // Stop checking after 2 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      console.log('🔚 Lock expiration test completed.');
    }, 120000);
    
  } else {
    console.log('❌ Failed to lock seat:', lockResult.data.error);
  }
}

// Test booking workflow
async function testBookingWorkflow() {
  console.log('\n🎫 Starting Complete Booking Workflow Test\n');
  
  const seatId = 'C7';
  const userId = 'workflowTestUser';
  
  try {
    // Reset seats
    await makeRequest('POST', '/seats/reset');
    console.log('✅ Seats reset');
    
    // Step 1: Check seat is available
    let seatStatus = await makeRequest('GET', `/seats/${seatId}`);
    console.log(`1️⃣ Initial seat status: ${seatStatus.data.data.status}`);
    
    if (seatStatus.data.data.status !== 'available') {
      throw new Error('Seat should be available initially');
    }
    
    // Step 2: Lock the seat
    console.log('2️⃣ Locking seat...');
    const lockResult = await makeRequest('POST', `/seats/${seatId}/lock`, { userId });
    
    if (!lockResult.data.success) {
      throw new Error('Failed to lock seat: ' + lockResult.data.error);
    }
    
    console.log(`✅ Seat locked with ID: ${lockResult.data.data.lockId}`);
    
    // Step 3: Verify seat is locked
    seatStatus = await makeRequest('GET', `/seats/${seatId}`);
    console.log(`3️⃣ Seat status after lock: ${seatStatus.data.data.status}`);
    
    if (seatStatus.data.data.status !== 'locked') {
      throw new Error('Seat should be locked');
    }
    
    // Step 4: Try to lock again (should fail)
    console.log('4️⃣ Attempting to lock same seat with different user...');
    const doubleLockResult = await makeRequest('POST', `/seats/${seatId}/lock`, { userId: 'anotherUser' });
    
    if (doubleLockResult.data.success) {
      throw new Error('Double locking should have failed');
    }
    
    console.log(`✅ Double locking prevented: ${doubleLockResult.data.error}`);
    
    // Step 5: Confirm booking
    console.log('5️⃣ Confirming booking...');
    const confirmResult = await makeRequest('POST', `/seats/${seatId}/confirm`, {
      userId,
      lockId: lockResult.data.data.lockId
    });
    
    if (!confirmResult.data.success) {
      throw new Error('Failed to confirm booking: ' + confirmResult.data.error);
    }
    
    console.log('✅ Booking confirmed successfully!');
    
    // Step 6: Verify seat is booked
    seatStatus = await makeRequest('GET', `/seats/${seatId}`);
    console.log(`6️⃣ Final seat status: ${seatStatus.data.data.status}`);
    
    if (seatStatus.data.data.status !== 'booked') {
      throw new Error('Seat should be booked');
    }
    
    // Step 7: Try to lock booked seat (should fail)
    console.log('7️⃣ Attempting to lock booked seat...');
    const lockBookedResult = await makeRequest('POST', `/seats/${seatId}/lock`, { userId: 'newUser' });
    
    if (lockBookedResult.data.success) {
      throw new Error('Locking booked seat should have failed');
    }
    
    console.log(`✅ Locking booked seat prevented: ${lockBookedResult.data.error}`);
    
    console.log('\n🎉 Complete Booking Workflow Test PASSED!\n');
    
  } catch (error) {
    console.log(`❌ Booking Workflow Test FAILED: ${error.message}\n`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🎯 Concurrent Ticket Booking System - Integration Tests');
  console.log('=====================================================\n');
  
  try {
    await testConcurrentLocking();
    await testBookingWorkflow();
    await testLockExpiration();
    
    console.log('\n✨ All tests completed!');
    console.log('\n💡 Tip: Check the visual interface at http://localhost:4000 to see the results!');
    
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

// Check if server is running and start tests
async function main() {
  try {
    console.log('🔍 Checking if server is running...');
    const healthCheck = await makeRequest('GET', '/health');
    
    if (healthCheck.data.success) {
      console.log('✅ Server is running!\n');
      await runAllTests();
    } else {
      console.log('❌ Server health check failed');
    }
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('   cd "EXP 3" && npm start');
    console.log('   Then run: npm run test:concurrent\n');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  testConcurrentLocking,
  testLockExpiration,
  testBookingWorkflow
};