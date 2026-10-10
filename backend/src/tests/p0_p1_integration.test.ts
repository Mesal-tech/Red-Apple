import { createExpressApp } from '../server';
import http from 'http';
import { AddressInfo } from 'net';
import { userStore } from '../data/user.store';
import { telemedicineStore } from '../data/telemedicine.store';
import { paymentStore } from '../data/payment.store';
import { pregnancyStore } from '../data/pregnancy.store';
import { educationStore } from '../data/education.store';

async function runIntegrationSuite() {
  console.log('🚀 Starting Red Apple P0 & P1 End-to-End Integration Suite...');

  await userStore.init();
  await telemedicineStore.init();
  await paymentStore.init();
  await pregnancyStore.init();
  await educationStore.init();

  const app = createExpressApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://localhost:${port}/api`;

  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, details?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`, details || '');
      failed++;
    }
  }

  try {
    // 0. Login as Amara
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
      const body = await res.json();
      token = body.tokens?.accessToken;
      assert('Auth login for Amara succeeds and returns token', res.status === 200 && Boolean(token));
    }

    // ==========================================
    // P0: PAYMENTS & CONSULTATION BOOKING
    // ==========================================
    let bookingId = '';
    {
      const res = await fetch(`${baseUrl}/telemedicine/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doctorId: 'doc_mesal_okubor',
          scheduledTime: 'Fri 14, 12:00',
          reason: 'Reproductive Endocrinology Check',
        }),
      });
      const body = await res.json();
      bookingId = body.booking?.booking_id;
      assert('Book consultation with Lead Specialist', res.status === 201 && Boolean(bookingId));
    }

    let payRef = '';
    {
      const res = await fetch(`${baseUrl}/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId,
          channels: ['card', 'bank_transfer', 'apple_pay'],
        }),
      });
      const body = await res.json();
      payRef = body.payment?.reference;
      assert(
        'Initialize Paystack payment for consultation',
        res.status === 201 && Boolean(payRef) && body.payment?.amount === 15000
      );
    }

    {
      const res = await fetch(`${baseUrl}/payments/verify/${payRef}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      assert(
        'Verify Paystack payment and mark consultation confirmed',
        res.status === 200 && body.verified === true && body.booking?.status === 'confirmed'
      );
    }

    // ==========================================
    // P1: PUSH NOTIFICATIONS & DYNAMIC REMINDERS
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/notifications/register-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          token: 'ExponentPushToken[mock_patient_device_token]',
        }),
      });
      const body = await res.json();
      assert('Register device Expo push notification token', res.status === 200 && body.success === true);
    }

    {
      const res = await fetch(`${baseUrl}/notifications/reminders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      assert(
        'Fetch calculated dynamic cycle & appointment reminders',
        res.status === 200 && Array.isArray(body.reminders) && body.reminders.length >= 1
      );
    }

    // ==========================================
    // P1: DYNAMIC PREGNANCY TRACKING
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/pregnancy/lmp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lmpDate: '2026-06-01' }),
      });
      const body = await res.json();
      assert(
        'Update pregnancy LMP & compute gestational age',
        res.status === 200 && body.pregnancy?.current_week >= 1 && Boolean(body.pregnancy?.estimated_due_date)
      );
    }

    {
      const res = await fetch(`${baseUrl}/pregnancy/kicks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kickCount: 10, durationMinutes: 12, notes: 'Morning kicks' }),
      });
      const body = await res.json();
      assert('Log fetal kick counter session', res.status === 201 && body.session?.kick_count === 10);
    }

    {
      const res = await fetch(`${baseUrl}/pregnancy/contractions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ durationSeconds: 45, frequencyMinutes: 5, intensity: 'moderate' }),
      });
      const body = await res.json();
      assert('Log labor contraction interval', res.status === 201 && body.log?.duration_seconds === 45);
    }

    // ==========================================
    // P1: DYNAMIC EDUCATIONAL CONTENT
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/education`);
      const body = await res.json();
      assert(
        'Fetch clinical articles library',
        res.status === 200 && Array.isArray(body.articles) && body.articles.length >= 5
      );
    }

    {
      const res = await fetch(`${baseUrl}/education?category=FERTILITY`);
      const body = await res.json();
      assert(
        'Filter articles by FERTILITY category',
        res.status === 200 && body.articles.every((a: any) => a.category === 'FERTILITY')
      );
    }

    console.log('\n========================================');
    console.log(`Total tests passed: ${passed}`);
    console.log(`Total tests failed: ${failed}`);
    console.log('========================================\n');

    if (failed === 0) {
      console.log('🎉 ALL P0 & P1 END-TO-END INTEGRATION TESTS PASSED WITH 100% SUCCESS!\n');
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runIntegrationSuite();
