import http from 'http';
import { createExpressApp } from '../server';
import { userStore } from '../data/user.store';
import { telemedicineStore } from '../data/telemedicine.store';
import { paymentStore } from '../data/payment.store';

async function makeRequest(
  server: http.Server,
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as any;
    const port = addr.port;
    const payload = body ? JSON.stringify(body) : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode || 500,
              body: data ? JSON.parse(data) : {},
            });
          } catch (e) {
            resolve({ status: res.statusCode || 500, body: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runPaymentTests() {
  console.log('\n💳 Starting Red Apple Payment (Paystack) Test Suite...\n');

  await userStore.init();
  await telemedicineStore.init();
  await paymentStore.init();

  const app = createExpressApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate user
    const loginRes = await makeRequest(server, 'POST', '/api/auth/login', {
      email: 'amara@redapple.health',
      password: 'Amara@2026',
    });
    const token = loginRes.body.tokens?.accessToken;
    const userId = loginRes.body.user?.user_id;

    assert(Boolean(token), 'Patient login succeeds and returns JWT token');

    // 2. Book a consultation appointment
    const bookRes = await makeRequest(
      server,
      'POST',
      '/api/telemedicine/book',
      {
        doctorId: 'doc_mesal_okubor',
        scheduledTime: 'Tomorrow, 11:00 AM',
        reason: 'Fertility Assessment',
      },
      token
    );
    const booking = bookRes.body.booking;
    assert(bookRes.status === 201 && Boolean(booking?.booking_id), 'Consultation booking created');

    // 3. Test POST /api/payments/initialize without token
    const unauthInit = await makeRequest(server, 'POST', '/api/payments/initialize', {
      bookingId: booking.booking_id,
    });
    assert(unauthInit.status === 401, 'POST /api/payments/initialize without auth returns 401');

    // 4. Test POST /api/payments/initialize with token
    const initRes = await makeRequest(
      server,
      'POST',
      '/api/payments/initialize',
      {
        bookingId: booking.booking_id,
        channels: ['card', 'bank_transfer', 'ussd', 'apple_pay'],
      },
      token
    );
    assert(initRes.status === 201, 'POST /api/payments/initialize returns 201');
    assert(Boolean(initRes.body.payment?.reference), 'Payment reference generated');
    assert(initRes.body.payment?.amount === 15000, 'Payment amount matches doctor fee (15,000 NGN)');
    assert(Boolean(initRes.body.payment?.authorization_url), 'Paystack authorization URL generated');

    const paymentRef = initRes.body.payment.reference;

    // 5. Test GET /api/payments/verify/:reference
    const verifyRes = await makeRequest(
      server,
      'GET',
      `/api/payments/verify/${paymentRef}`,
      null,
      token
    );
    assert(verifyRes.status === 200, 'GET /api/payments/verify/:reference returns 200');
    assert(verifyRes.body.verified === true, 'Payment verified successfully');
    assert(verifyRes.body.booking?.status === 'confirmed', 'Booking confirmed after payment');

    // 6. Test GET /api/payments/history
    const historyRes = await makeRequest(server, 'GET', '/api/payments/history', null, token);
    assert(historyRes.status === 200, 'GET /api/payments/history returns 200');
    assert(historyRes.body.count >= 1, 'Payment history includes the newly verified transaction');

    // 7. Test POST /api/payments/webhook
    const webhookRes = await makeRequest(server, 'POST', '/api/payments/webhook', {
      event: 'charge.success',
      data: {
        reference: paymentRef,
        amount: 1500000,
        channel: 'bank_transfer',
        paid_at: new Date().toISOString(),
        gateway_response: 'Successful',
      },
    });
    assert(webhookRes.status === 200, 'POST /api/payments/webhook accepts charge.success event');

    console.log('\n========================================');
    console.log(`Total tests passed: ${passed}`);
    console.log(`Total tests failed: ${failed}`);
    console.log('========================================\n');

    if (failed === 0) {
      console.log('🎉 All Paystack Payment integration tests PASSED successfully!\n');
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runPaymentTests();
