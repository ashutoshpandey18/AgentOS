/**
 * Edge Case & Validation Tests
 * Tests input validation, error handling, and boundary conditions
 *
 * Run: node test-edge-cases.js
 */

const BASE_URL = 'http://localhost:3000';

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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test Suite
let testsPassed = 0;
let testsFailed = 0;
let testAgentId = null;

async function setupTestAgent() {
  const response = await request('POST', '/agents', {
    name: 'Edge Case Test Agent',
    description: 'For boundary testing',
    tools: ['send_email'], // Only email tool allowed
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

async function test1_EmptyTask() {
  printSection('TEST 1: Empty Task (Validation)');

  const response = await request('POST', '/agent/run', {
    agentId: testAgentId,
    task: '',
  });

  const passed = response.status === 400 &&
                 response.data.status === 'error';

  if (passed) {
    printTest('Empty task → 400', true, response.data.message);
    testsPassed++;
  } else {
    printTest('Empty task → 400', false, `Expected 400, got ${response.status}`);
    testsFailed++;
  }
}

async function test2_TaskTooLong() {
  printSection('TEST 2: Task Exceeds Max Length (2000 chars)');

  const longTask = 'A'.repeat(2001);
  const response = await request('POST', '/agent/run', {
    agentId: testAgentId,
    task: longTask,
  });

  const passed = response.status === 400 &&
                 response.data.status === 'error';

  if (passed) {
    printTest('Task > 2000 chars → 400', true, response.data.message);
    testsPassed++;
  } else {
    printTest('Task > 2000 chars → 400', false, `Expected 400, got ${response.status}`);
    testsFailed++;
  }
}

async function test3_TaskExactly2000() {
  printSection('TEST 3: Task Exactly 2000 chars (Boundary)');

  const exactTask = 'B'.repeat(2000);
  const response = await request('POST', '/agent/run', {
    agentId: testAgentId,
    task: exactTask,
  });

  const passed = response.status === 201 &&
                 response.data.status === 'success';

  if (passed) {
    printTest('Task = 2000 chars → Success', true, 'Boundary accepted');
    testsPassed++;
  } else {
    printTest('Task = 2000 chars → Success', false, `Expected 201, got ${response.status}`);
    testsFailed++;
  }
}

async function test4_InvalidUUID() {
  printSection('TEST 4: Invalid UUID Format');

  const response = await request('POST', '/agent/run', {
    agentId: 'not-a-valid-uuid',
    task: 'Test task',
  });

  const passed = response.status === 400 &&
                 response.data.status === 'error';

  if (passed) {
    printTest('Invalid UUID → 400', true, response.data.message);
    testsPassed++;
  } else {
    printTest('Invalid UUID → 400', false, `Expected 400, got ${response.status}`);
    testsFailed++;
  }
}

async function test5_MalformedAgentId() {
  printSection('TEST 5: Malformed Agent ID');

  const response = await request('POST', '/agent/run', {
    agentId: '12345',
    task: 'Test task',
  });

  const passed = response.status === 400 &&
                 response.data.status === 'error';

  if (passed) {
    printTest('Malformed ID → 400', true, 'Validation caught before DB query');
    testsPassed++;
  } else {
    printTest('Malformed ID → 400', false, `Expected 400, got ${response.status}`);
    testsFailed++;
  }
}

async function test6_NonExistentAgent() {
  printSection('TEST 6: Non-existent Agent (Valid UUID)');

  const fakeId = '00000000-0000-0000-0000-000000000000';
  const response = await request('POST', '/agent/run', {
    agentId: fakeId,
    task: 'Test task',
  });

  const passed = response.status === 404 &&
                 response.data.status === 'error';

  if (passed) {
    printTest('Non-existent agent → 404', true, response.data.message);
    testsPassed++;
  } else {
    printTest('Non-existent agent → 404', false, `Expected 404, got ${response.status}`);
    testsFailed++;
  }
}

async function test7_UnauthorizedTool() {
  printSection('TEST 7: Tool Not in Agent Permissions');

  // Test agent only has 'send_email', trying to use 'search_db'
  const response = await request('POST', '/agent/run', {
    agentId: testAgentId,
    task: 'Search for all users in the database',
  });

  const passed = response.status === 403 &&
                 response.data.status === 'error' &&
                 response.data.message.includes('not authorized');

  if (passed) {
    printTest('Unauthorized tool → 403', true, 'Security check enforced');
    testsPassed++;
  } else {
    printTest('Unauthorized tool → 403', false, `Expected 403, got ${response.status}: ${JSON.stringify(response.data)}`);
    testsFailed++;
  }
}

async function test8_MissingFields() {
  printSection('TEST 8: Missing Required Fields');

  // Missing task
  const resp1 = await request('POST', '/agent/run', {
    agentId: testAgentId,
  });

  const passed1 = resp1.status === 400 &&
                  resp1.data.status === 'error';

  if (passed1) {
    printTest('Missing "task" field → 400', true, resp1.data.message);
    testsPassed++;
  } else {
    printTest('Missing "task" field → 400', false, `Expected 400, got ${resp1.status}`);
    testsFailed++;
  }

  // Missing agentId
  const resp2 = await request('POST', '/agent/run', {
    task: 'Test task',
  });

  const passed2 = resp2.status === 400 &&
                  resp2.data.status === 'error';

  if (passed2) {
    printTest('Missing "agentId" field → 400', true, resp2.data.message);
    testsPassed++;
  } else {
    printTest('Missing "agentId" field → 400', false, `Expected 400, got ${resp2.status}`);
    testsFailed++;
  }
}

async function test9_InvalidAgentMode() {
  printSection('TEST 9: Invalid Agent Mode');

  const response = await request('POST', '/agents', {
    name: 'Invalid Mode Agent',
    tools: ['send_email'],
    mode: 'INVALID_MODE',
  });

  const passed = response.status === 400 &&
                 response.data.status === 'error';

  if (passed) {
    printTest('Invalid mode → 400', true, 'Mode validation enforced');
    testsPassed++;
  } else {
    printTest('Invalid mode → 400', false, `Expected 400, got ${response.status}`);
    testsFailed++;
  }
}

async function test10_EmptyToolsArray() {
  printSection('TEST 10: Agent with Empty Tools Array');

  const response = await request('POST', '/agents', {
    name: 'No Tools Agent',
    tools: [],
    mode: 'RULE_BASED',
  });

  // Should allow creation (valid case - agent with no tools)
  const passed = response.status === 201 &&
                 response.data.status === 'success';

  if (passed) {
    printTest('Empty tools array → Success', true, 'Valid edge case handled');
    testsPassed++;
  } else {
    printTest('Empty tools array → Success', false, `Expected 201, got ${response.status}`);
    testsFailed++;
  }
}

async function test11_RateLimiting() {
  printSection('TEST 11: Rate Limiting (10 req/min)');

  console.log('   Sending 12 rapid requests...');

  let rateLimitHit = false;
  let successCount = 0;

  for (let i = 0; i < 12; i++) {
    const response = await request('POST', '/agent/run', {
      agentId: testAgentId,
      task: `Rate limit test ${i}`,
    });

    if (response.status === 429) {
      rateLimitHit = true;
      break;
    } else if (response.status === 201) {
      successCount++;
    }

    await sleep(100); // Small delay between requests
  }

  if (rateLimitHit) {
    printTest('Rate limiting → 429', true, `Kicked in after ${successCount} requests`);
    testsPassed++;
  } else {
    printTest('Rate limiting → 429', false, 'No rate limit encountered (may need more requests)');
    testsFailed++;
  }

  // Wait for rate limit window to reset
  console.log('   Waiting 5 seconds for rate limit reset...');
  await sleep(5000);
}

async function test12_SpecialCharactersInTask() {
  printSection('TEST 12: Special Characters in Task');

  const response = await request('POST', '/agent/run', {
    agentId: testAgentId,
    task: 'Send email to user@example.com with subject: "Test & Review" <urgent>',
  });

  const passed = response.status === 201 &&
                 response.data.status === 'success';

  if (passed) {
    printTest('Special chars in task → Success', true, 'Handled correctly');
    testsPassed++;
  } else {
    printTest('Special chars in task → Success', false, `Expected 201, got ${response.status}`);
    testsFailed++;
  }
}

async function test13_NullValues() {
  printSection('TEST 13: Null Values in Request');

  const response = await request('POST', '/agent/run', {
    agentId: testAgentId,
    task: null,
  });

  const passed = response.status === 400 &&
                 response.data.status === 'error';

  if (passed) {
    printTest('Null task → 400', true, 'Validation rejects null');
    testsPassed++;
  } else {
    printTest('Null task → 400', false, `Expected 400, got ${response.status}`);
    testsFailed++;
  }
}

async function test14_ExtraFields() {
  printSection('TEST 14: Extra Unexpected Fields');

  const response = await request('POST', '/agent/run', {
    agentId: testAgentId,
    task: 'Email test',
    extraField: 'should be ignored',
    anotherField: 123,
  });

  const passed = response.status === 400 &&
                 response.data.status === 'error';

  if (passed) {
    printTest('Extra fields → Rejected', true, 'forbidNonWhitelisted working');
    testsPassed++;
  } else {
    printTest('Extra fields → Rejected', false, `Expected 400, got ${response.status}`);
    testsFailed++;
  }
}

async function test15_PaginationEdgeCases() {
  printSection('TEST 15: Pagination Edge Cases');

  // Negative offset
  const resp1 = await request('GET', `/agents/${testAgentId}/runs?limit=10&offset=-1`);
  const passed1 = resp1.status === 400;

  if (passed1) {
    printTest('Negative offset → 400', true, 'Validation enforced');
    testsPassed++;
  } else {
    printTest('Negative offset → 400', false, `Expected 400, got ${resp1.status}`);
    testsFailed++;
  }

  // Zero limit (should use default)
  const resp2 = await request('GET', `/agents/${testAgentId}/runs?limit=0`);
  const passed2 = resp2.status === 200;

  if (passed2) {
    printTest('Zero limit → Uses default', true, 'Handled gracefully');
    testsPassed++;
  } else {
    printTest('Zero limit → Uses default', false, `Expected 200, got ${resp2.status}`);
    testsFailed++;
  }
}

// Main execution
async function runTests() {
  console.log('\n🧪 AI AGENT BACKEND - EDGE CASE TESTS');
  console.log('Testing against:', BASE_URL);
  console.log('');

  const setupOk = await setupTestAgent();
  if (!setupOk) {
    console.error('Cannot proceed without test agent');
    process.exit(1);
  }

  await test1_EmptyTask();
  await test2_TaskTooLong();
  await test3_TaskExactly2000();
  await test4_InvalidUUID();
  await test5_MalformedAgentId();
  await test6_NonExistentAgent();
  await test7_UnauthorizedTool();
  await test8_MissingFields();
  await test9_InvalidAgentMode();
  await test10_EmptyToolsArray();
  await test11_RateLimiting();
  await test12_SpecialCharactersInTask();
  await test13_NullValues();
  await test14_ExtraFields();
  await test15_PaginationEdgeCases();

  // Summary
  printSection('TEST SUMMARY');
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log('');

  if (testsFailed === 0) {
    console.log('🎉 ALL EDGE CASE TESTS PASSED!');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review output above');
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('💥 Test suite crashed:', error.message);
  process.exit(1);
});
