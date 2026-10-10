import { createExpressApp } from '../server';
import http from 'http';
import { AddressInfo } from 'net';

async function runTests() {
  console.log('🔔 Starting Red Apple Notification Test Suite...');

  const app = createExpressApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://localhost:${port}/api`;

  let passed = 0;
  let failed = 0;

  async function assert(desc: string, condition: boolean, details?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`, details || '');
      failed++;
    }
  }

  try {
    // 1. Zero Bypass Check: GET /notifications/reminders without token returns 401
    {
      const res = await fetch(`${baseUrl}/notifications/reminders`);
      await assert('GET /notifications/reminders without auth returns 401', res.status === 401);
    }

    // 2. Login as Amara
    let token = '';
    {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'amara@redapple.health',
          password: 'Amara@2026',
        }),
      });
      const data = await res.json();
      token = data.tokens?.accessToken;
      await assert('Login for Amara succeeds', res.status === 200 && !!token);
    }

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // 3. Register Push Token
    {
      const res = await fetch(`${baseUrl}/notifications/register-token`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ token: 'ExponentPushToken[TestDeviceToken12345]' }),
      });
      const data = await res.json();
      await assert(
        'POST /notifications/register-token registers push token',
        res.status === 200 && data.success === true
      );
    }

    // 4. Update Notification Settings
    {
      const res = await fetch(`${baseUrl}/notifications/settings`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          periodAlerts: true,
          fertileWindowAlerts: true,
          appointmentAlerts: true,
          discreetTitles: true,
          dailyLogReminder: true,
          medicationAlerts: true,
          hydrationAlerts: true,
        }),
      });
      const data = await res.json();
      await assert(
        'POST /notifications/settings updates notification preferences',
        res.status === 200 && data.settings?.discreetTitles === true && data.settings?.hydrationAlerts === true
      );
    }

    // 5. Fetch Reminders (With Discreet Mode & Hydration active)
    let reminderIds: string[] = [];
    {
      const res = await fetch(`${baseUrl}/notifications/reminders`, {
        headers: authHeaders,
      });
      const data = await res.json();
      reminderIds = (data.reminders || []).map((r: any) => r.id);
      await assert(
        'GET /notifications/reminders returns reminders list and unreadCount',
        res.status === 200 &&
          data.success === true &&
          Array.isArray(data.reminders) &&
          typeof data.unreadCount === 'number'
      );
    }

    // 6. Mark single reminder as read
    if (reminderIds.length > 0) {
      const targetId = reminderIds[0];
      const res = await fetch(`${baseUrl}/notifications/read`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ reminderId: targetId }),
      });
      const data = await res.json();
      await assert(
        'POST /notifications/read marks a single reminder as read',
        res.status === 200 && data.success === true && data.reminderId === targetId
      );

      // Verify that reminder is marked isRead in subsequent fetch
      const verifyRes = await fetch(`${baseUrl}/notifications/reminders`, {
        headers: authHeaders,
      });
      const verifyData = await verifyRes.json();
      const readReminder = verifyData.reminders.find((r: any) => r.id === targetId);
      await assert('Verified reminder has isRead: true', readReminder?.isRead === true);
    }

    // 7. Mark all reminders as read
    {
      const res = await fetch(`${baseUrl}/notifications/read-all`, {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await res.json();
      await assert('POST /notifications/read-all succeeds', res.status === 200 && data.success === true);

      // Verify unreadCount is 0
      const verifyRes = await fetch(`${baseUrl}/notifications/reminders`, {
        headers: authHeaders,
      });
      const verifyData = await verifyRes.json();
      await assert('Verified unreadCount is 0 after mark-all-read', verifyData.unreadCount === 0);
    }

    // 8. Test notification endpoint
    {
      const res = await fetch(`${baseUrl}/notifications/test`, {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await res.json();
      await assert(
        'POST /notifications/test returns test notification response',
        res.status === 200 && data.success === true && !!data.testPayload
      );
    }

    console.log('\n========================================');
    console.log(`Total tests passed: ${passed}`);
    console.log(`Total tests failed: ${failed}`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

runTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
