/**
 * API Endpoint Tests
 * Tests all REST endpoints for functional correctness
 *
 * Run: node test-api.js
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

// Test Suite
let testsPassed = 0;
let testsFailed = 0;
let createdAgentId = null;
let createdRunId = null;

async function test1_CreateAgent() {
  printSection('TEST 1: Create Agent');

  const response = await request('POST', '/agents', {
    name: 'Test Agent',
    description: 'Agent for automated testing',
    tools: ['send_email', 'search_db'],
    mode: 'RULE_BASED',
  });

  const passed = response.status === 201 &&
                 response.data.status === 'success' &&
                 response.data.data.id;

  if (passed) {
    createdAgentId = response.data.data.id;
    printTest('Create agent', true, `Agent ID: ${createdAgentId}`);
    testsPassed++;
  } else {
    printTest('Create agent', false, `Status: ${response.status}, Response: ${JSON.stringify(response.data)}`);
    testsFailed++;
  }

  return passed;
}

async function test2_GetAllAgents() {
  printSection('TEST 2: Get All Agents');

  const response = await request('GET', '/agents');

  const passed = response.status === 200 &&
                 response.data.status === 'success' &&
                 Array.isArray(response.data.data) &&
                 response.data.data.length > 0;

  if (passed) {
    printTest('Get all agents', true, `Found ${response.data.data.length} agent(s)`);
    testsPassed++;
  } else {
    printTest('Get all agents', false, JSON.stringify(response.data));
    testsFailed++;
  }

  return passed;
}

async function test3_GetSingleAgent() {
  printSection('TEST 3: Get Single Agent');

  if (!createdAgentId) {
    printTest('Get single agent', false, 'No agent ID available');
    testsFailed++;
    return false;
  }

  const response = await request('GET', `/agents/${createdAgentId}`);

  const passed = response.status === 200 &&
                 response.data.status === 'success' &&
                 response.data.data.id === createdAgentId;

  if (passed) {
    printTest('Get single agent', true, `Name: ${response.data.data.name}`);
    testsPassed++;
  } else {
    printTest('Get single agent', false, JSON.stringify(response.data));
    testsFailed++;
  }

  return passed;
}

async function test4_RunAgentWithEmail() {
  printSection('TEST 4: Run Agent - Email Task');

  if (!createdAgentId) {
    printTest('Run agent (email)', false, 'No agent ID available');
    testsFailed++;
    return false;
  }

  const response = await request('POST', '/agent/run', {
    agentId: createdAgentId,
    task: 'Send an email to john@example.com about the meeting',
  });

  const passed = response.status === 201 &&
                 response.data.status === 'success' &&
                 response.data.data.result.includes('Email sent');

  if (passed) {
    printTest('Run agent (email intent)', true, `Result: ${response.data.data.result}`);
    testsPassed++;
  } else {
    printTest('Run agent (email intent)', false, JSON.stringify(response.data));
    testsFailed++;
  }

  return passed;
}

async function test5_RunAgentWithSearch() {
  printSection('TEST 5: Run Agent - Search Task');

  if (!createdAgentId) {
    printTest('Run agent (search)', false, 'No agent ID available');
    testsFailed++;
    return false;
  }

  const response = await request('POST', '/agent/run', {
    agentId: createdAgentId,
    task: 'Search for all customers in California',
  });

  const passed = response.status === 201 &&
                 response.data.status === 'success' &&
                 response.data.data.result.includes('Found');

  if (passed) {
    // Don't store result here - will get run ID from test7
    printTest('Run agent (search intent)', true, `Result: ${response.data.data.result}`);
    testsPassed++;
  } else {
    printTest('Run agent (search intent)', false, JSON.stringify(response.data));
    testsFailed++;
  }

  return passed;
}

async function test6_RunAgentUnknownIntent() {
  printSection('TEST 6: Run Agent - Unknown Intent');

  if (!createdAgentId) {
    printTest('Run agent (unknown)', false, 'No agent ID available');
    testsFailed++;
    return false;
  }

  const response = await request('POST', '/agent/run', {
    agentId: createdAgentId,
    task: 'Calculate the square root of 144',
  });

  const passed = response.status === 201 &&
                 response.data.status === 'success' &&
                 response.data.data.result === 'Unknown intent';

  if (passed) {
    printTest('Unknown intent handling', true, 'Returns "Unknown intent" as expected');
    testsPassed++;
  } else {
    printTest('Unknown intent handling', false, `Expected "Unknown intent", got: ${response.data.data?.result}`);
    testsFailed++;
  }

  return passed;
}

async function test7_GetAgentRuns() {
  printSection('TEST 7: Get Agent Run History');

  if (!createdAgentId) {
    printTest('Get agent runs', false, 'No agent ID available');
    testsFailed++;
    return false;
  }

  // Wait a moment for DB writes
  await new Promise(resolve => setTimeout(resolve, 500));

  const response = await request('GET', `/agents/${createdAgentId}/runs?limit=10&offset=0`);

  const passed = response.status === 200 &&
                 response.data.status === 'success' &&
                 Array.isArray(response.data.data) &&
                 response.data.data.length >= 3; // We ran 3 tasks

  if (passed) {
    const runs = response.data.data;
    createdRunId = runs[0].id; // Store most recent run ID
    printTest('Get agent runs', true, `Found ${runs.length} run(s)`);

    // Validate run structure
    const firstRun = runs[0];
    const hasRequiredFields = firstRun.id && firstRun.task && firstRun.result &&
                               firstRun.status && firstRun.createdAt;

    if (hasRequiredFields) {
      printTest('Run record structure', true, `Status: ${firstRun.status}`);
      testsPassed++;
    } else {
      printTest('Run record structure', false, 'Missing required fields');
      testsFailed++;
    }

    testsPassed++;
  } else {
    printTest('Get agent runs', false, JSON.stringify(response.data));
    testsFailed += 2;
  }

  return passed;
}

async function test8_GetRunById() {
  printSection('TEST 8: Get Specific Run by ID');

  if (!createdRunId) {
    printTest('Get run by ID', false, 'No run ID available');
    testsFailed++;
    return false;
  }

  const response = await request('GET', `/runs/${createdRunId}`);

  const passed = response.status === 200 &&
                 response.data.status === 'success' &&
                 response.data.data.id === createdRunId;

  if (passed) {
    const run = response.data.data;
    printTest('Get run by ID', true, `Task: "${run.task.substring(0, 40)}..."`);

    // Validate logs are included
    if (run.logs && Array.isArray(run.logs)) {
      printTest('Run includes logs', true, `Log entries: ${run.logs.length}`);
      testsPassed++;
    } else {
      printTest('Run includes logs', false, 'Logs missing or invalid');
      testsFailed++;
    }

    testsPassed++;
  } else {
    printTest('Get run by ID', false, JSON.stringify(response.data));
    testsFailed += 2;
  }

  return passed;
}

async function test9_InvalidAgentId() {
  printSection('TEST 9: Invalid Agent ID (404)');

  const fakeId = '00000000-0000-0000-0000-000000000000';
  const response = await request('POST', '/agent/run', {
    agentId: fakeId,
    task: 'Test task',
  });

  const passed = response.status === 404 &&
                 response.data.status === 'error';

  if (passed) {
    printTest('Invalid agent → 404', true, response.data.message);
    testsPassed++;
  } else {
    printTest('Invalid agent → 404', false, `Expected 404, got ${response.status}`);
    testsFailed++;
  }

  return passed;
}

async function test10_ResponseFormat() {
  printSection('TEST 10: Response Format Consistency');

  // Test success format
  const successResponse = await request('GET', '/agents');
  const successPassed = successResponse.data.status === 'success' &&
                        successResponse.data.data !== undefined;

  if (successPassed) {
    printTest('Success response format', true, '{ status: "success", data: {...} }');
    testsPassed++;
  } else {
    printTest('Success response format', false, JSON.stringify(successResponse.data));
    testsFailed++;
  }

  // Test error format
  const errorResponse = await request('GET', '/agents/invalid-uuid');
  const errorPassed = errorResponse.data.status === 'error' &&
                      errorResponse.data.message !== undefined &&
                      errorResponse.data.statusCode !== undefined;

  if (errorPassed) {
    printTest('Error response format', true, '{ status: "error", message: "...", statusCode: 400 }');
    testsPassed++;
  } else {
    printTest('Error response format', false, JSON.stringify(errorResponse.data));
    testsFailed++;
  }

  return successPassed && errorPassed;
}

// Main execution
async function runTests() {
  console.log('\n🧪 AI AGENT BACKEND - API ENDPOINT TESTS');
  console.log('Testing against:', BASE_URL);
  console.log('');

  await test1_CreateAgent();
  await test2_GetAllAgents();
  await test3_GetSingleAgent();
  await test4_RunAgentWithEmail();
  await test5_RunAgentWithSearch();
  await test6_RunAgentUnknownIntent();
  await test7_GetAgentRuns();
  await test8_GetRunById();
  await test9_InvalidAgentId();
  await test10_ResponseFormat();

  // Summary
  printSection('TEST SUMMARY');
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log('');

  if (testsFailed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review output above');
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('💥 Test suite crashed:', error.message);
  process.exit(1);
});
