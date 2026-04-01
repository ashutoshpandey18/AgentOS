/**
 * WebSocket Real-time Events Tests
 * Tests WebSocket connectivity and runId scoping
 *
 * Requirements:
 * - npm install socket.io-client (for this test only)
 *
 * Run: node test-websocket.js
 */

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'http://localhost:3000';

// Test utilities
function printTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (details) console.log(`   ${details}`);
}

function printSection(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(title);
  console.log('='.repeat(60));
}

async function request(method, path, body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();

    return {
      status: response.status,
      data,
      ok: response.ok,
    };
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message },
      ok: false,
    };
  }
}

let testsPassed = 0;
let testsFailed = 0;
let io;
let testAgentId;

async function setupTestAgent() {
  const response = await request('POST', '/agents', {
    name: 'WebSocket Test Agent',
    tools: ['send_email', 'search_db'],
    mode: 'RULE_BASED',
  });

  if (response.status === 201) {
    testAgentId = response.data.data.id;
    console.log(`✓ Setup: Created test agent ${testAgentId}\n`);
    return true;
  }

  console.error('✗ Setup failed: Could not create test agent');
  return false;
}

async function test1_WebSocketConnection() {
  printSection('TEST 1: WebSocket Connection');

  try {
    // Dynamically import socket.io-client
    const { io: socketIO } = await import('socket.io-client');
    io = socketIO(WS_URL, {
      transports: ['websocket'],
      reconnection: false,
    });

    return new Promise((resolve) => {
      io.on('connect', () => {
        printTest('WebSocket connection', true, 'Connected successfully');
        testsPassed++;
        resolve(true);
      });

      io.on('connect_error', (error) => {
        printTest('WebSocket connection', false, `Error: ${error.message}`);
        testsFailed++;
        resolve(false);
      });

      setTimeout(() => {
        if (!io.connected) {
          printTest('WebSocket connection', false, 'Connection timeout');
          testsFailed++;
          resolve(false);
        }
      }, 5000);
    });
  } catch (error) {
    printTest('WebSocket connection', false, `socket.io-client not installed: ${error.message}`);
    console.log('\n   To run WebSocket tests, install socket.io-client:');
    console.log('   npm install socket.io-client\n');
    testsFailed++;
    return false;
  }
}

async function test2_LogEventsWithRunId() {
  printSection('TEST 2: Log Events Include runId');

  if (!io || !io.connected) {
    printTest('Log events with runId', false, 'WebSocket not connected');
    testsFailed++;
    return false;
  }

  return new Promise(async (resolve) => {
    const receivedLogs = [];
    let completionReceived = false;
    let expectedRunId = null;

    // Listen for log events
    io.on('log', (data) => {
      receivedLogs.push(data);
    });

    // Listen for complete event
    io.on('complete', (data) => {
      completionReceived = true;

      // Check if complete event has runId
      if (data.runId && data.result) {
        printTest('Complete event structure', true, `{ runId: "${data.runId.substring(0, 8)}...", result: "..." }`);
        testsPassed++;
      } else {
        printTest('Complete event structure', false, `Missing runId or result: ${JSON.stringify(data)}`);
        testsFailed++;
      }
    });

    // Trigger agent run
    const runResponse = await request('POST', '/agent/run', {
      agentId: testAgentId,
      task: 'Send email to test@example.com',
    });

    if (runResponse.status !== 201) {
      printTest('Trigger agent run', false, 'Failed to start agent');
      testsFailed++;
      resolve(false);
      return;
    }

    // Wait for events
    setTimeout(() => {
      if (receivedLogs.length > 0) {
        const allHaveRunId = receivedLogs.every(log => log.runId && log.message);
        const allHaveSameRunId = receivedLogs.every(log => log.runId === receivedLogs[0].runId);

        if (allHaveRunId && allHaveSameRunId) {
          printTest('Log events include runId', true, `Received ${receivedLogs.length} logs, all with runId: "${receivedLogs[0].runId.substring(0, 8)}..."`);
          testsPassed++;
        } else if (!allHaveRunId) {
          printTest('Log events include runId', false, 'Some logs missing runId');
          testsFailed++;
        } else {
          printTest('Log events include runId', false, 'Logs have inconsistent runIds');
          testsFailed++;
        }

        // Verify log messages are strings
        const allMessagesValid = receivedLogs.every(log => typeof log.message === 'string');
        if (allMessagesValid) {
          printTest('Log message format', true, 'All messages are strings');
          testsPassed++;
        } else {
          printTest('Log message format', false, 'Some messages are not strings');
          testsFailed++;
        }
      } else {
        printTest('Log events received', false, 'No logs received via WebSocket');
        testsFailed += 2;
      }

      if (!completionReceived) {
        printTest('Complete event received', false, 'No completion event');
        testsFailed++;
      }

      resolve(true);
    }, 3000);
  });
}

async function test3_MultipleRunsDistinguishable() {
  printSection('TEST 3: Multiple Concurrent Runs - runId Isolation');

  if (!io || !io.connected) {
    printTest('Multiple runs isolation', false, 'WebSocket not connected');
    testsFailed++;
    return false;
  }

  return new Promise(async (resolve) => {
    const run1Logs = [];
    const run2Logs = [];
    const runIds = new Set();

    io.on('log', (data) => {
      if (data.runId) {
        runIds.add(data.runId);

        // Track which run this log belongs to
        if (run1Logs.length === 0 || data.runId === run1Logs[0]?.runId) {
          run1Logs.push(data);
        } else {
          run2Logs.push(data);
        }
      }
    });

    // Trigger two runs rapidly
    const [resp1, resp2] = await Promise.all([
      request('POST', '/agent/run', {
        agentId: testAgentId,
        task: 'Send email to user1@example.com',
      }),
      request('POST', '/agent/run', {
        agentId: testAgentId,
        task: 'Search for customers',
      }),
    ]);

    if (resp1.status !== 201 || resp2.status !== 201) {
      printTest('Trigger concurrent runs', false, 'Failed to start both runs');
      testsFailed++;
      resolve(false);
      return;
    }

    // Wait for events
    setTimeout(() => {
      const uniqueRunIds = runIds.size;

      if (uniqueRunIds >= 2) {
        printTest('Concurrent runs have unique runIds', true, `Detected ${uniqueRunIds} unique runIds`);
        testsPassed++;
      } else {
        printTest('Concurrent runs have unique runIds', false, `Only ${uniqueRunIds} unique runId(s) detected`);
        testsFailed++;
      }

      // Verify logs can be grouped by runId
      if (run1Logs.length > 0 && run2Logs.length > 0) {
        printTest('Logs grouped by runId', true, `Run 1: ${run1Logs.length} logs, Run 2: ${run2Logs.length} logs`);
        testsPassed++;
      } else {
        printTest('Logs grouped by runId', false, 'Could not separate logs by runId');
        testsFailed++;
      }

      resolve(true);
    }, 4000);
  });
}

async function test4_RealTimeStreaming() {
  printSection('TEST 4: Real-time Log Streaming');

  if (!io || !io.connected) {
    printTest('Real-time streaming', false, 'WebSocket not connected');
    testsFailed++;
    return false;
  }

  return new Promise(async (resolve) => {
    const timestamps = [];

    io.on('log', (data) => {
      timestamps.push(Date.now());
    });

    const startTime = Date.now();

    await request('POST', '/agent/run', {
      agentId: testAgentId,
      task: 'Send email for streaming test',
    });

    setTimeout(() => {
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      if (timestamps.length > 0) {
        const firstLogDelay = timestamps[0] - startTime;
        const isRealTime = firstLogDelay < 1000; // First log within 1 second

        if (isRealTime) {
          printTest('Real-time streaming', true, `First log arrived in ${firstLogDelay}ms`);
          testsPassed++;
        } else {
          printTest('Real-time streaming', false, `First log took ${firstLogDelay}ms (> 1s)`);
          testsFailed++;
        }

        // Check if logs were streamed progressively
        if (timestamps.length >= 3) {
          const logInterval = (timestamps[timestamps.length - 1] - timestamps[0]) / timestamps.length;
          printTest('Progressive log streaming', true, `${timestamps.length} logs over ${totalDuration}ms`);
          testsPassed++;
        } else {
          printTest('Progressive log streaming', false, `Only ${timestamps.length} logs received`);
          testsFailed++;
        }
      } else {
        printTest('Real-time streaming', false, 'No logs received');
        testsFailed += 2;
      }

      resolve(true);
    }, 3000);
  });
}

async function cleanup() {
  if (io && io.connected) {
    io.disconnect();
    console.log('\n✓ WebSocket disconnected');
  }
}

// Main execution
async function runTests() {
  console.log('\n🧪 AI AGENT BACKEND - WEBSOCKET TESTS');
  console.log('Testing against:', WS_URL);
  console.log('');

  const setupOk = await setupTestAgent();
  if (!setupOk) {
    console.error('Cannot proceed without test agent');
    process.exit(1);
  }

  const wsConnected = await test1_WebSocketConnection();

  if (wsConnected) {
    await test2_LogEventsWithRunId();
    await test3_MultipleRunsDistinguishable();
    await test4_RealTimeStreaming();
  } else {
    console.log('\n⚠️  Skipping remaining tests (no WebSocket connection)\n');
    testsFailed += 3;
  }

  await cleanup();

  // Summary
  printSection('TEST SUMMARY');
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log('');

  if (testsFailed === 0) {
    console.log('🎉 ALL WEBSOCKET TESTS PASSED!');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review output above');
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('💥 Test suite crashed:', error.message);
  cleanup();
  process.exit(1);
});
