const { spawn } = require('child_process');
const path = require('path');

const API_BASE_URL = process.env.SMOKE_API_BASE_URL || '';
const PORT = Number(process.env.SMOKE_PORT || 5050);
const STARTUP_TIMEOUT_MS = 20000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson({ method, url, token, body, expectedStatuses = [200] }) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  if (!expectedStatuses.includes(response.status)) {
    const err = new Error(
      `Unexpected status ${response.status} for ${method} ${url}. Body: ${JSON.stringify(data)}`
    );
    err.status = response.status;
    err.body = data;
    throw err;
  }

  return { status: response.status, data };
}

async function waitForServer(baseUrl) {
  const start = Date.now();
  while (Date.now() - start < STARTUP_TIMEOUT_MS) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) return true;
    } catch (_) {
      // retry
    }
    await sleep(500);
  }
  throw new Error(`Server did not become ready within ${STARTUP_TIMEOUT_MS}ms`);
}

async function login(baseUrl, username, password) {
  const { data } = await requestJson({
    method: 'POST',
    url: `${baseUrl}/api/auth/login`,
    body: { username, password },
    expectedStatuses: [200],
  });

  if (!data?.token) {
    throw new Error(`Login token missing for user ${username}`);
  }

  return data;
}

function buildDate(daysFromNow = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function runSmoke(baseUrl) {
  const marker = `SMOKE_${Date.now()}`;
  const results = [];

  const step = async (name, fn) => {
    try {
      const value = await fn();
      results.push({ name, ok: true });
      return value;
    } catch (error) {
      results.push({ name, ok: false, error: error.message });
      throw error;
    }
  };

  const superAdmin = await step('auth.login.super_admin', async () => login(baseUrl, 'Super_Admin', '1234'));
  const manager = await step('auth.login.manager_it', async () => login(baseUrl, 'manager_it', '1234'));
  const employee = await step('auth.login.emp_somchai', async () => login(baseUrl, 'emp_somchai', '1234'));

  await step('auth.me.super_admin', async () => {
    await requestJson({ method: 'GET', url: `${baseUrl}/api/auth/me`, token: superAdmin.token, expectedStatuses: [200] });
  });

  await step('employees.list.super_admin', async () => {
    await requestJson({ method: 'GET', url: `${baseUrl}/api/employees`, token: superAdmin.token, expectedStatuses: [200] });
  });

  const leaveTypes = await step('leave.types.employee', async () => {
    const response = await requestJson({ method: 'GET', url: `${baseUrl}/api/leaves/types`, token: employee.token, expectedStatuses: [200] });
    return Array.isArray(response?.data?.data) ? response.data.data : [];
  });

  await step('leave.balances.employee', async () => {
    await requestJson({ method: 'GET', url: `${baseUrl}/api/leaves/balances`, token: employee.token, expectedStatuses: [200] });
  });

  if (!leaveTypes.length) {
    throw new Error('No leave types returned; cannot continue leave create flow');
  }

  const leaveTypeId = Number(leaveTypes[0].id);
  const leaveStart = buildDate(7);

  await step('leave.request.create.employee', async () => {
    await requestJson({
      method: 'POST',
      url: `${baseUrl}/api/leaves/request`,
      token: employee.token,
      body: {
        leave_type_id: leaveTypeId,
        start_date: leaveStart,
        end_date: leaveStart,
        total_days: 1,
        reason: `${marker}_LEAVE`,
      },
      expectedStatuses: [201],
    });
  });

  const leaveRequestId = await step('leave.request.find.manager', async () => {
    const response = await requestJson({ method: 'GET', url: `${baseUrl}/api/leaves/requests`, token: manager.token, expectedStatuses: [200] });
    const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
    const found = rows.find((row) => String(row.reason || '').includes(`${marker}_LEAVE`));
    if (!found?.id) {
      throw new Error('Created leave request not found in manager queue');
    }
    return Number(found.id);
  });

  await step('leave.request.approve.manager', async () => {
    await requestJson({
      method: 'PUT',
      url: `${baseUrl}/api/leaves/${leaveRequestId}/status`,
      token: manager.token,
      body: { status: 'approved' },
      expectedStatuses: [200],
    });
  });

  await step('ot.request.create.employee', async () => {
    await requestJson({
      method: 'POST',
      url: `${baseUrl}/api/ot/request`,
      token: employee.token,
      body: {
        request_date: buildDate(0),
        start_time: '18:00',
        end_time: '20:00',
        reason: `${marker}_OT`,
      },
      expectedStatuses: [201],
    });
  });

  const otRequestId = await step('ot.request.find.manager', async () => {
    const response = await requestJson({ method: 'GET', url: `${baseUrl}/api/ot/requests`, token: manager.token, expectedStatuses: [200] });
    const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
    const found = rows.find((row) => String(row.reason || '').includes(`${marker}_OT`));
    if (!found?.id) {
      throw new Error('Created OT request not found in manager queue');
    }
    return Number(found.id);
  });

  await step('ot.request.approve.manager', async () => {
    await requestJson({
      method: 'PUT',
      url: `${baseUrl}/api/ot/${otRequestId}/status`,
      token: manager.token,
      body: { status: 'approved' },
      expectedStatuses: [200],
    });
  });

  await step('ot.summary.manager', async () => {
    await requestJson({ method: 'GET', url: `${baseUrl}/api/ot/summary`, token: manager.token, expectedStatuses: [200] });
  });

  const approvalFlows = await step('admin.approval_flows.get.super_admin', async () => {
    const response = await requestJson({
      method: 'GET',
      url: `${baseUrl}/api/admin/approval-flows`,
      token: superAdmin.token,
      expectedStatuses: [200],
    });
    if (!response?.data?.data || typeof response.data.data !== 'object') {
      throw new Error('Approval flows payload missing');
    }
    return response.data.data;
  });

  await step('admin.approval_flows.put.super_admin', async () => {
    await requestJson({
      method: 'PUT',
      url: `${baseUrl}/api/admin/approval-flows`,
      token: superAdmin.token,
      body: { flowMap: approvalFlows },
      expectedStatuses: [200],
    });
  });

  await step('admin.permission_matrix.get.super_admin', async () => {
    await requestJson({
      method: 'GET',
      url: `${baseUrl}/api/admin/permission-matrix?role=Manager`,
      token: superAdmin.token,
      expectedStatuses: [200],
    });
  });

  const systemSettings = await step('admin.system_settings.get.super_admin', async () => {
    const response = await requestJson({
      method: 'GET',
      url: `${baseUrl}/api/admin/system-settings`,
      token: superAdmin.token,
      expectedStatuses: [200],
    });
    return response?.data?.data || {};
  });

  await step('admin.system_settings.put.super_admin', async () => {
    await requestJson({
      method: 'PUT',
      url: `${baseUrl}/api/admin/system-settings`,
      token: superAdmin.token,
      body: {
        settings: {
          ...systemSettings,
          smokeLastRunAt: new Date().toISOString(),
        },
      },
      expectedStatuses: [200],
    });
  });

  return results;
}

async function main() {
  const externalBase = API_BASE_URL.trim();
  let serverProcess = null;
  let baseUrl = externalBase;

  if (!baseUrl) {
    baseUrl = `http://127.0.0.1:${PORT}`;
    serverProcess = spawn('node', [path.join(__dirname, '..', 'server.js')], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      env: {
        ...process.env,
        PORT: String(PORT),
      },
      shell: process.platform === 'win32',
    });

    serverProcess.stdout.on('data', (chunk) => {
      process.stdout.write(`[server] ${chunk}`);
    });
    serverProcess.stderr.on('data', (chunk) => {
      process.stderr.write(`[server] ${chunk}`);
    });

    await waitForServer(baseUrl);
  }

  let exitCode = 0;
  try {
    const results = await runSmoke(baseUrl);
    console.log('\\nSmoke test summary');
    for (const row of results) {
      console.log(`PASS ${row.name}`);
    }
    console.log(`Total: ${results.length} passed`);
  } catch (error) {
    exitCode = 1;
    console.error('\\nSmoke test failed:', error.message);
  } finally {
    if (serverProcess) {
      serverProcess.kill();
      await sleep(300);
    }
  }

  process.exit(exitCode);
}

main().catch((error) => {
  console.error('Smoke runner crashed:', error.message);
  process.exit(1);
});
