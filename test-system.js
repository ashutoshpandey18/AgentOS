/* eslint-disable no-console */

const BASE_URL = 'http://localhost:3000';

async function requestJson(method, path, body) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const text = await response.text();

    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      data: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function printTestOutput(name, statusCode, responseBody, logs) {
  console.log(`\n--- ${name} ---`);
  console.log(`Status Code: ${statusCode ?? 'N/A'}`);
  console.log('Response:');
  console.log(JSON.stringify(responseBody, null, 2));
  console.log('Logs:');
  console.log(logs.length ? logs.join('\n') : '(none)');
}

function hasLog(logs, text) {
  return Array.isArray(logs) && logs.some((log) => String(log).toLowerCase().includes(text));
}

async function ensureAgent() {
  const getAgents = await requestJson('GET', '/agents');

  if (!Array.isArray(getAgents.data)) {
    printTestOutput('GET /agents FAILED', getAgents.status, getAgents.data, [
      'Could not fetch agents. Is server running on http://localhost:3000?',
    ]);
    return null;
  }

  if (getAgents.data.length > 0) {
    const existing = getAgents.data[0];
    if (existing && existing.id) {
      return existing.id;
    }
  }

  const createAgentPayload = {
    name: 'Test Agent',
    tools: ['send_email', 'search_db'],
    mode: 'LLM',
  };

  const created = await requestJson('POST', '/agents', createAgentPayload);

  if (!created.ok || !created.data || !created.data.id) {
    printTestOutput('POST /agents FAILED', created.status, created.data, [
      'Failed to create test agent.',
    ]);
    return null;
  }

  return created.data.id;
}

async function runValidTaskTest(agentId) {
  const payload = {
    task: 'Send email to John',
    agentId,
  };

  const res = await requestJson('POST', '/agent/run', payload);
  const logs = Array.isArray(res.data?.logs) ? res.data.logs : [];

  const checks = [];
  checks.push(String(res.data?.result || '').toLowerCase().includes('email sent'));
  checks.push(hasLog(logs, 'intent detected'));

  printTestOutput('VALID TASK', res.status, res.data, logs);
  console.log(`PASS: ${checks.every(Boolean)}`);
}

async function runSmartTaskLlmTest(agentId) {
  const payload = {
    task: 'Notify John about tomorrow meeting',
    agentId,
  };

  const res = await requestJson('POST', '/agent/run', payload);
  const logs = Array.isArray(res.data?.logs) ? res.data.logs : [];

  const checks = [];
  checks.push(hasLog(logs, 'intent detection method: llm'));
  checks.push(hasLog(logs, 'intent detected'));

  printTestOutput('SMART TASK (LLM CASE)', res.status, res.data, logs);
  console.log(`PASS: ${checks.every(Boolean)}`);
}

async function runUnknownIntentTest(agentId) {
  const payload = {
    task: 'Play music',
    agentId,
  };

  const res = await requestJson('POST', '/agent/run', payload);
  const logs = Array.isArray(res.data?.logs) ? res.data.logs : [];

  const checks = [];
  checks.push(res.data?.result === 'Unknown intent');
  checks.push(hasLog(logs, 'no tool executed'));

  printTestOutput('UNKNOWN INTENT', res.status, res.data, logs);
  console.log(`PASS: ${checks.every(Boolean)}`);
}

async function runInvalidAgentTest() {
  const payload = {
    task: 'Send email',
    agentId: 'invalid-id-123',
  };

  const res = await requestJson('POST', '/agent/run', payload);

  printTestOutput('INVALID AGENT', res.status, res.data, []);
  console.log(`PASS: ${res.status === 404}`);
}

async function verifyDatabaseRuns(agentId) {
  console.log('\n--- OPTIONAL DB VERIFICATION ---');

  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const runs = await prisma.agentRun.findMany({
        where: { agentId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      console.log(`AgentRun entries found for agent ${agentId}: ${runs.length}`);
      if (runs.length > 0) {
        console.log('Latest run snapshot:');
        console.log(
          JSON.stringify(
            {
              id: runs[0].id,
              task: runs[0].task,
              status: runs[0].status,
              result: runs[0].result,
              createdAt: runs[0].createdAt,
            },
            null,
            2,
          ),
        );
      }
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.log('DB verification skipped or failed:');
    console.log(error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  console.log('Starting AI Agent Backend verification...');
  console.log(`Base URL: ${BASE_URL}`);

  const agentId = await ensureAgent();

  if (!agentId) {
    console.log('\nCannot continue tests without a valid agent.');
    return;
  }

  console.log(`Using agentId: ${agentId}`);

  try {
    await runValidTaskTest(agentId);
  } catch (error) {
    console.log('\nVALID TASK test failed unexpectedly:');
    console.log(error instanceof Error ? error.message : String(error));
  }

  try {
    await runSmartTaskLlmTest(agentId);
  } catch (error) {
    console.log('\nSMART TASK (LLM CASE) test failed unexpectedly:');
    console.log(error instanceof Error ? error.message : String(error));
  }

  try {
    await runUnknownIntentTest(agentId);
  } catch (error) {
    console.log('\nUNKNOWN INTENT test failed unexpectedly:');
    console.log(error instanceof Error ? error.message : String(error));
  }

  try {
    await runInvalidAgentTest();
  } catch (error) {
    console.log('\nINVALID AGENT test failed unexpectedly:');
    console.log(error instanceof Error ? error.message : String(error));
  }

  await verifyDatabaseRuns(agentId);

  console.log('\nVerification script completed.');
}

main().catch((error) => {
  console.log('Unexpected top-level error:');
  console.log(error instanceof Error ? error.message : String(error));
});
