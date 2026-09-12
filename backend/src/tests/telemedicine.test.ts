import { createExpressApp } from '../server';
import http from 'http';
import { AddressInfo } from 'net';

async function runTelemedicineTests() {
  console.log('🚀 Starting Red Apple Telemedicine Test Suite...');

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
    // 0. Login as Amara to get auth token
    let userToken = '';
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
      userToken = body.tokens?.accessToken;
      await assert('Auth login for Amara succeeds', res.status === 200 && !!userToken);
    }

    // 1. GET /api/telemedicine/doctors
    let firstDoctorId = '';
    {
      const res = await fetch(`${baseUrl}/telemedicine/doctors`);
      const body = await res.json();
      await assert(
        'GET /telemedicine/doctors returns list of verified doctors',
        res.status === 200 &&
          body.success === true &&
          Array.isArray(body.doctors) &&
          body.doctors.length >= 1 &&
          body.doctors[0].doctor_id === 'doc_mesal_okubor'
      );
      firstDoctorId = body.doctors[0].doctor_id;
    }

    // 2. GET /api/telemedicine/doctors?specialty=Obstetrician
    {
      const res = await fetch(`${baseUrl}/telemedicine/doctors?specialty=Obstetrician`);
      const body = await res.json();
      await assert(
        'GET /telemedicine/doctors?specialty=Obstetrician filters specialists',
        res.status === 200 &&
          body.success === true &&
          body.doctors.length >= 1 &&
          body.doctors.every((d: any) => d.specialty.includes('Obstetrician'))
      );
    }

    // 3. GET /api/telemedicine/doctors?search=Clinic
    {
      const res = await fetch(`${baseUrl}/telemedicine/doctors?search=Clinic`);
      const body = await res.json();
      await assert(
        'GET /telemedicine/doctors?search=Clinic searches hospital affiliation',
        res.status === 200 &&
          body.success === true &&
          body.doctors.some((d: any) => d.hospital_affiliation.includes('Clinic'))
      );
    }

    // 4. GET /api/telemedicine/doctors/:id
    {
      const res = await fetch(`${baseUrl}/telemedicine/doctors/${firstDoctorId}`);
      const body = await res.json();
      await assert(
        'GET /telemedicine/doctors/:id returns doctor profile with slots and reviews',
        res.status === 200 &&
          body.success === true &&
          body.doctor.doctor_id === firstDoctorId &&
          Array.isArray(body.doctor.slots) &&
          Array.isArray(body.doctor.reviews)
      );
    }

    // 5. GET /api/telemedicine/doctors/:id/slots
    let testSlotId = '';
    {
      const res = await fetch(`${baseUrl}/telemedicine/doctors/${firstDoctorId}/slots`);
      const body = await res.json();
      await assert(
        'GET /telemedicine/doctors/:id/slots returns available slots',
        res.status === 200 &&
          body.success === true &&
          Array.isArray(body.slots) &&
          body.slots.length > 0
      );
      const availableSlot = body.slots.find((s: any) => !s.is_booked);
      testSlotId = availableSlot?.slot_id || '';
    }

    // 6. POST /api/telemedicine/book without auth returns 401
    {
      const res = await fetch(`${baseUrl}/telemedicine/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: firstDoctorId }),
      });
      const body = await res.json();
      await assert(
        'POST /telemedicine/book without auth returns 401 Unauthorized',
        res.status === 401 && body.success === false
      );
    }

    // 7. POST /api/telemedicine/book with auth books consultation
    let createdBookingId = '';
    {
      const res = await fetch(`${baseUrl}/telemedicine/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          doctorId: firstDoctorId,
          slotId: testSlotId,
          reason: 'Fertility guidance and hormone test review',
          symptomsNotes: 'Irregular cycles for 3 months.',
          consultationType: 'video',
        }),
      });
      const body = await res.json();
      await assert(
        'POST /telemedicine/book with auth creates booking with encrypted video room URL',
        res.status === 201 &&
          body.success === true &&
          body.booking.status === 'confirmed' &&
          body.booking.doctor_id === firstDoctorId &&
          body.booking.video_room_url.includes('https://telehealth.redapple.health/room_')
      );
      createdBookingId = body.booking.booking_id;
    }

    // 8. POST /api/telemedicine/book with same slot fails
    {
      const res = await fetch(`${baseUrl}/telemedicine/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          doctorId: firstDoctorId,
          slotId: testSlotId,
          reason: 'Duplicate slot test',
        }),
      });
      const body = await res.json();
      await assert(
        'POST /telemedicine/book rejects already booked slot with 400',
        res.status === 400 &&
          body.success === false &&
          body.message.includes('already been booked')
      );
    }

    // 9. GET /api/telemedicine/bookings
    {
      const res = await fetch(`${baseUrl}/telemedicine/bookings`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const body = await res.json();
      await assert(
        'GET /telemedicine/bookings returns user bookings list',
        res.status === 200 &&
          body.success === true &&
          Array.isArray(body.bookings) &&
          body.bookings.some((b: any) => b.booking_id === createdBookingId)
      );
    }

    // 10. GET /api/telemedicine/bookings/:id
    {
      const res = await fetch(`${baseUrl}/telemedicine/bookings/${createdBookingId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const body = await res.json();
      await assert(
        'GET /telemedicine/bookings/:id returns single booking details',
        res.status === 200 &&
          body.success === true &&
          body.booking.booking_id === createdBookingId
      );
    }

    // 11. POST /api/telemedicine/bookings/:id/review
    {
      const res = await fetch(`${baseUrl}/telemedicine/bookings/${createdBookingId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          rating: 5,
          comment: 'Outstanding session, doctor was patient and clear.',
        }),
      });
      const body = await res.json();
      await assert(
        'POST /telemedicine/bookings/:id/review records patient review',
        res.status === 201 &&
          body.success === true &&
          body.review.rating === 5
      );
    }

    // 12. PATCH /api/telemedicine/bookings/:id/cancel
    {
      const res = await fetch(`${baseUrl}/telemedicine/bookings/${createdBookingId}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const body = await res.json();
      await assert(
        'PATCH /telemedicine/bookings/:id/cancel cancels appointment and frees slot',
        res.status === 200 &&
          body.success === true &&
          body.booking.status === 'cancelled'
      );
    }

    // 13. GET /api/telemedicine/stream-token
    {
      const res = await fetch(`${baseUrl}/telemedicine/stream-token`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const body = await res.json();
      await assert(
        'GET /telemedicine/stream-token returns Stream Video apiKey, token, and user profile',
        res.status === 200 &&
          body.success === true &&
          typeof body.apiKey === 'string' &&
          body.apiKey.length > 0 &&
          typeof body.token === 'string' &&
          body.token.length > 0 &&
          body.user?.id?.length > 0
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
    console.log('🎉 All backend telemedicine tests PASSED with 100% SUCCESS!');
  }
}

runTelemedicineTests().catch((err) => {
  console.error('Telemedicine test execution error:', err);
  process.exit(1);
});
