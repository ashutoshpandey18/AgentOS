const BASE_URL = 'http://localhost:3000';

const printCaseResult = (caseName, status, body) => {
  console.log(`\n=== ${caseName} ===`);
  console.log(`Status code: ${status}`);
  console.log('Response body:');
  console.log(JSON.stringify(body, null, 2));
};

const parseJsonSafe = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const getErrorMessage = (error) => {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = error.cause;
  const causeCode = cause && typeof cause === 'object' && 'code' in cause ? cause.code : null;

  return causeCode ? `${error.message} (${causeCode})` : error.message;
};

const ensureServerReachable = async () => {
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Cannot reach API at ${BASE_URL}. Start Nest server first (pnpm start or pnpm start:dev). Root cause: ${getErrorMessage(error)}`,
    );
  }
};

const postRun = async (payload) => {
  let response;

  try {
    response = await fetch(`${BASE_URL}/agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    throw new Error(`POST /agent/run failed: ${getErrorMessage(error)}`);
  }

  const body = await parseJsonSafe(response);
  return { status: response.status, body };
};

const createAgent = async () => {
  let response;

  try {
    response = await fetch(`${BASE_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Agent',
        description: 'Auto-created by test.js',
        tools: ['send_email', 'search_db'],
        mode: 'rule-based',
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    throw new Error(`POST /agents failed: ${getErrorMessage(error)}`);
  }

  const body = await parseJsonSafe(response);

  if (!response.ok || !body?.id) {
    throw new Error(`Failed to create test agent. Status: ${response.status}`);
  }

  return body.id;
};

const getValidAgentId = async () => {
  let response;

  try {
    response = await fetch(`${BASE_URL}/agents`, {
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    throw new Error(`GET /agents failed: ${getErrorMessage(error)}`);
  }

  const body = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(`GET /agents failed with status ${response.status}`);
  }

  if (!Array.isArray(body)) {
    throw new Error('Unexpected response from GET /agents.');
  }

  if (body.length === 0 || !body[0]?.id) {
    console.log('No agents found. Creating one test agent...');
    return createAgent();
  }

  return body[0].id;
};

const run = async () => {
  try {
    await ensureServerReachable();

    const validAgentId = await getValidAgentId();

    const case1 = await postRun({
      task: 'Send email to John',
      agentId: validAgentId,
    });
    printCaseResult('CASE 1: Valid request', case1.status, case1.body);

    const case2 = await postRun({
      task: 'Play music',
      agentId: validAgentId,
    });
    printCaseResult('CASE 2: Unknown intent', case2.status, case2.body);

    const case3 = await postRun({
      task: 'Send email',
      agentId: 'invalid-id-123',
    });
    printCaseResult('CASE 3: Invalid agentId', case3.status, case3.body);
  } catch (error) {
    console.error('\n=== TEST SCRIPT ERROR ===');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
};

run();
