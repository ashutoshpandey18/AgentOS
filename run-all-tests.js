/**
 * Test Runner - Executes all test suites
 * Run: node run-all-tests.js
 */

const { spawn } = require('child_process');

function printBanner(text) {
  const line = '='.repeat(70);
  console.log(`\n${line}`);
  console.log(`  ${text}`);
  console.log(line);
}

function runTest(scriptName) {
  return new Promise((resolve) => {
    console.log(`\n▶️  Running ${scriptName}...\n`);

    const child = spawn('node', [scriptName], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      resolve({ script: scriptName, exitCode: code });
    });

    child.on('error', (error) => {
      console.error(`Error running ${scriptName}:`, error.message);
      resolve({ script: scriptName, exitCode: 1, error: error.message });
    });
  });
}

async function runAllTests() {
  printBanner('AI AGENT BACKEND - COMPREHENSIVE TEST SUITE');

  console.log('📋 Test Plan:');
  console.log('   1. API Endpoint Tests (test-api.js)');
  console.log('   2. Edge Case Tests (test-edge-cases.js)');
  console.log('   3. WebSocket Tests (test-websocket.js)');
  console.log('');
  console.log('⚠️  Make sure the backend server is running on http://localhost:3000');
  console.log('');

  const testScripts = [
    'test-api.js',
    'test-edge-cases.js',
    'test-websocket.js',
  ];

  const results = [];

  for (const script of testScripts) {
    const result = await runTest(script);
    results.push(result);
  }

  // Summary Report
  printBanner('FINAL TEST REPORT');

  console.log('\n📊 Test Suite Results:\n');

  let allPassed = true;
  results.forEach(({ script, exitCode, error }) => {
    const status = exitCode === 0 ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${status}  ${script}`);
    if (error) {
      console.log(`          Error: ${error}`);
    }
    if (exitCode !== 0) {
      allPassed = false;
    }
  });

  console.log('');

  if (allPassed) {
    console.log('🎉 ALL TEST SUITES PASSED!');
    console.log('✓ System is production-ready');
    process.exit(0);
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log('   Review individual test outputs above for details');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('\n💥 Test runner crashed:', error.message);
  process.exit(1);
});
