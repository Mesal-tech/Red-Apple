import { createExpressApp } from '../server';
import http from 'http';
import { AddressInfo } from 'net';

async function runTests() {
  console.log('🚀 Starting Red Apple Authentication Test Suite (Zero Bypass)...');

  const app = createExpressApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://localhost:${port}/api/auth`;

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
    // TEST 1: Protected /me without token MUST fail with 401 (Zero Bypass check)
    {
      const res = await fetch(`${baseUrl}/me`);
      const body = await res.json();
      await assert(
        'GET /me without authorization header returns 401 Unauthorized (Zero Bypass)',
        res.status === 401 && body.success === false
      );
    }

    // TEST 2: Protected /me with invalid token MUST fail with 401
    {
      const res = await fetch(`${baseUrl}/me`, {
        headers: { Authorization: 'Bearer fake_invalid_jwt_token_123' },
      });
      const body = await res.json();
      await assert(
        'GET /me with invalid token returns 401 Unauthorized',
        res.status === 401 && body.success === false
      );
    }

    // TEST 3: Login with seeded user (Amara) with correct password
    let amaraAccessToken = '';
    let amaraRefreshToken = '';
    {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'amara@redapple.health',
          password: 'Amara@2026',
        }),
      });
      const body = await res.json();
      await assert(
        'POST /login with valid credentials returns 200 OK + JWT tokens',
        res.status === 200 &&
          body.success === true &&
          body.user.email === 'amara@redapple.health' &&
          !!body.tokens.accessToken &&
          !!body.tokens.refreshToken
      );
      amaraAccessToken = body.tokens.accessToken;
      amaraRefreshToken = body.tokens.refreshToken;
    }

    // TEST 4: Login with wrong password MUST fail with 401
    {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'amara@redapple.health',
          password: 'WrongPassword!',
        }),
      });
      const body = await res.json();
      await assert(
        'POST /login with invalid password returns 401 Unauthorized',
        res.status === 401 && body.success === false
      );
    }

    // TEST 5: Access protected /me with valid JWT token
    {
      const res = await fetch(`${baseUrl}/me`, {
        headers: { Authorization: `Bearer ${amaraAccessToken}` },
      });
      const body = await res.json();
      await assert(
        'GET /me with valid token returns user profile',
        res.status === 200 &&
          body.success === true &&
          body.user.email === 'amara@redapple.health' &&
          body.user.name === 'Amara Okonkwo'
      );
    }

    // TEST 6: Register new user
    const testEmail = `testuser_${Date.now()}@redapple.health`;
    let newAccessToken = '';
    let newRefreshToken = '';
    {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ngozi Eze',
          email: testEmail,
          password: 'Password123!',
          phone: '+2348098765432',
        }),
      });
      const body = await res.json();
      await assert(
        'POST /register creates user and returns 201 + tokens',
        res.status === 201 &&
          body.success === true &&
          body.user.email === testEmail &&
          body.user.name === 'Ngozi Eze' &&
          !body.user.password_hash // ensure password_hash is stripped
      );
      await assert(
        'POST /register new user does not have pre-completed health profile (ensuring onboarding wizard displays)',
        !body.user.health_profile?.stage && !body.user.health_profile?.completedAt
      );
      newAccessToken = body.tokens?.accessToken;
      newRefreshToken = body.tokens?.refreshToken;
    }

    // TEST 7: Duplicate registration MUST fail with 409 Conflict
    {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ngozi Eze Duplicate',
          email: testEmail,
          password: 'Password123!',
        }),
      });
      const body = await res.json();
      await assert(
        'POST /register with duplicate email returns 409 Conflict',
        res.status === 409 && body.success === false
      );
    }

    // TEST 8: Refresh token rotation
    {
      const res = await fetch(`${baseUrl}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: newRefreshToken }),
      });
      const body = await res.json();
      await assert(
        'POST /refresh with valid refresh token issues fresh access and refresh tokens',
        res.status === 200 &&
          body.success === true &&
          !!body.tokens.accessToken &&
          !!body.tokens.refreshToken &&
          body.tokens.refreshToken !== newRefreshToken // rotated!
      );
    }

    // TEST 9: Forgot Password OTP & Reset Password Flow
    {
      const forgotRes = await fetch(`${baseUrl}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });
      const forgotBody = await forgotRes.json();
      await assert(
        'POST /forgot-password generates 6-digit OTP',
        forgotRes.status === 200 && forgotBody.success === true && !!forgotBody.devOtpCode
      );

      // Now reset password using the generated OTP
      const resetRes = await fetch(`${baseUrl}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          otpCode: forgotBody.devOtpCode,
          newPassword: 'BrandNewPassword2026!',
        }),
      });
      const resetBody = await resetRes.json();
      await assert(
        'POST /reset-password successfully resets password and authenticates',
        resetRes.status === 200 && resetBody.success === true && !!resetBody.tokens
      );

      // Verify login with new password succeeds
      const loginRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'BrandNewPassword2026!',
        }),
      });
      await assert(
        'POST /login with newly reset password succeeds',
        loginRes.status === 200
      );
    }

    // TEST 10: Update Profile
    {
      const res = await fetch(`${baseUrl}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${amaraAccessToken}`,
        },
        body: JSON.stringify({
          pregnancy_mode: true,
          health_profile: {
            cycleLength: 30,
            periodDuration: 6,
            reproductiveGoal: 'track_pregnancy',
          },
        }),
      });
      const body = await res.json();
      await assert(
        'PUT /profile updates user details and returns updated profile',
        res.status === 200 &&
          body.success === true &&
          body.user.pregnancy_mode === true &&
          body.user.health_profile.cycleLength === 30
      );
    }
  } finally {
    server.close();
  }

  console.log('\n========================================');
  console.log(`Total tests passed: ${passed}`);
  console.log(`Total tests failed: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All backend authentication tests PASSED with ZERO BYPASS!');
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
