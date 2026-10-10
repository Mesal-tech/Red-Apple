import React, { useState, useEffect } from 'react';
import {
  Users,
  Video,
  DollarSign,
  BookOpen,
  Calendar,
  CheckCircle2,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import type { AdminView } from './Header';

interface DashboardOverviewProps {
  onNavigate: (view: AdminView) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    activePatients: 142,
    totalBookings: 18,
    confirmedBookings: 14,
    revenueNgn: 210000,
    articlesCount: 5,
  });

  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch public/admin doctors and bookings if backend is running
      const res = await fetch('http://localhost:5000/api/telemedicine/doctors');
      if (res.ok) {
        const data = await res.json();
        const doctor = data.doctors?.[0];
        if (doctor) {
          setStats((prev) => ({
            ...prev,
            revenueNgn: (doctor.reviews_count || 14) * 15000,
          }));
        }
      }

      const eduRes = await fetch('http://localhost:5000/api/education');
      if (eduRes.ok) {
        const eduData = await eduRes.json();
        if (eduData.articles) {
          setStats((prev) => ({
            ...prev,
            articlesCount: eduData.articles.length,
          }));
        }
      }

      // Sample verified consultations for dashboard display
      setRecentBookings([
        {
          id: 'book_1',
          patientName: 'Amara Okonkwo',
          doctorName: 'Dr. Mesal Okubor',
          scheduledTime: 'Today, 2:30 PM',
          status: 'confirmed',
          fee: '₦15,000',
          type: 'HD Video',
          roomUrl: 'https://telehealth.redapple.health/room_amara1',
        },
        {
          id: 'book_2',
          patientName: 'Chioma Adebayo',
          doctorName: 'Dr. Mesal Okubor',
          scheduledTime: 'Tomorrow, 10:00 AM',
          status: 'confirmed',
          fee: '₦15,000',
          type: 'HD Video',
          roomUrl: 'https://telehealth.redapple.health/room_chioma2',
        },
        {
          id: 'book_3',
          patientName: 'Zainab Bello',
          doctorName: 'Dr. Mesal Okubor',
          scheduledTime: 'Wed 12, 12:00 PM',
          status: 'confirmed',
          fee: '₦15,000',
          type: 'HD Video',
          roomUrl: 'https://telehealth.redapple.health/room_zainab3',
        },
      ]);
    } catch (e) {
      console.warn('Dashboard load fallback:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-6 sm:p-8 text-white shadow-md">
        <div>
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
            Red Apple Clinic Administration {loading && '• Syncing...'}
          </span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
            Hospital & Platform Operations
          </h1>
          <p className="mt-1 text-red-100 text-sm max-w-xl">
            Real-time telemetry for maternal healthcare consultations, clinical education publishing, and patient engagement.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => onNavigate('articles')}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-red-700 shadow-sm hover:bg-red-50 transition-all cursor-pointer"
          >
            <BookOpen className="h-4 w-4" />
            <span>Publish Article</span>
          </button>
          <button
            onClick={() => onNavigate('doctors')}
            className="inline-flex items-center gap-2 rounded-xl bg-red-800/80 hover:bg-red-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm border border-red-400/40 transition-all cursor-pointer"
          >
            <Calendar className="h-4 w-4" />
            <span>Manage Slots</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Active Patients */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Tracked Patients
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-zinc-900">
              {stats.activePatients.toLocaleString()}
            </span>
            <span className="inline-flex items-center text-xs font-bold text-emerald-600">
              <TrendingUp className="h-3 w-3 mr-0.5" /> +12% this mo
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Cycle tracking & maternal profiles</p>
        </div>

        {/* Card 2: Consultations */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Telemedicine Sessions
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Video className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-zinc-900">
              {stats.confirmedBookings}
            </span>
            <span className="inline-flex items-center text-xs font-bold text-emerald-600">
              <CheckCircle2 className="h-3 w-3 mr-0.5" /> 100% Confirmed
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Dr. Mesal Okubor virtual clinic</p>
        </div>

        {/* Card 3: Consultation Revenue */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Revenue (Paystack)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-zinc-900">
              ₦{stats.revenueNgn.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-zinc-500">NGN</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Consultation bookings settled</p>
        </div>

        {/* Card 4: Clinical Articles */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Medical Library
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-zinc-900">
              {stats.articlesCount}
            </span>
            <span className="text-xs font-bold text-purple-600">Published</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Peer-reviewed clinical guides</p>
        </div>
      </div>

      {/* Recent Telemedicine Consultations Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Upcoming Virtual Consultations</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Patients scheduled for encrypted 1-on-1 Stream Video sessions with Dr. Mesal Okubor
            </p>
          </div>
          <button
            onClick={() => onNavigate('doctors')}
            className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
          >
            View All Slots →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50/80 text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Patient</th>
                <th className="px-6 py-3 font-semibold">Specialist</th>
                <th className="px-6 py-3 font-semibold">Scheduled Slot</th>
                <th className="px-6 py-3 font-semibold">Fee Paid</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {recentBookings.map((b) => (
                <tr key={b.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-zinc-900">{b.patientName}</span>
                    <span className="block text-xs text-zinc-500">{b.type}</span>
                  </td>
                  <td className="px-6 py-4 text-zinc-700 font-medium">{b.doctorName}</td>
                  <td className="px-6 py-4 text-zinc-600">{b.scheduledTime}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-emerald-700">{b.fee}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Confirmed
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <a
                      href={b.roomUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Video Room</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
