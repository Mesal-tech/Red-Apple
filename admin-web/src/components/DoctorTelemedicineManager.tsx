import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Clock,
  Plus,
  ShieldCheck,
  Star,
  MapPin,
  X,
} from 'lucide-react';

interface Doctor {
  doctor_id: string;
  name: string;
  credentials: string;
  specialty: string;
  hospital_affiliation: string;
  fee_ngn: number;
  fee_usd: number;
  rating: number;
  reviews_count: number;
  spoken_languages: string[];
  slots?: any[];
}

export const DoctorTelemedicineManager: React.FC = () => {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState<boolean>(false);

  // New Slot Form State
  const [slotDate, setSlotDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('10:30');
  const [submittingSlot, setSubmittingSlot] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchDoctorData();
  }, []);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/telemedicine/doctors');
      if (res.ok) {
        const data = await res.json();
        const mainDoc = data.doctors?.[0];
        if (mainDoc) {
          setDoctor(mainDoc);
          // fetch slots
          const slotRes = await fetch(
            `http://localhost:5000/api/telemedicine/doctors/${mainDoc.doctor_id}/slots`
          );
          if (slotRes.ok) {
            const slotData = await slotRes.json();
            setSlots(slotData.slots || []);
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching doctor data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor) return;

    try {
      setSubmittingSlot(true);
      const res = await fetch('http://localhost:5000/api/telemedicine/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doctor.doctor_id,
          date: slotDate,
          startTime,
          endTime,
          formattedTime: `${slotDate}, ${startTime}`,
        }),
      });

      if (res.ok) {
        setIsSlotModalOpen(false);
        fetchDoctorData();
      }
    } catch (err) {
      console.error('Add slot error:', err);
    } finally {
      setSubmittingSlot(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2.5">
            <UserCheck className="h-6 w-6 text-emerald-600" />
            Telemedicine Specialist & Clinic Operations
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Manage certified medical consultant profiles, consultation calendar slots, and video rooms.{loading ? ' (Syncing...)' : ''}
          </p>
        </div>
        <button
          onClick={() => setIsSlotModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Consultation Slot</span>
        </button>
      </div>

      {/* Doctor Profile Spotlight Card */}
      {doctor && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 text-xl font-black ring-2 ring-emerald-200 shrink-0">
                MO
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-zinc-900">{doctor.name}</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="h-3 w-3" />
                    Verified MD
                  </span>
                </div>
                <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                  {doctor.credentials} • {doctor.specialty}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                    {doctor.hospital_affiliation}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {doctor.rating} ({doctor.reviews_count || 14} patient reviews)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-4 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
              <span className="text-xs text-zinc-500">Consultation Fee</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-zinc-900">
                  ₦{doctor.fee_ngn?.toLocaleString() || '15,000'}
                </span>
                <span className="text-xs font-bold text-zinc-500">NGN / session</span>
              </div>
              <span className="text-[11px] text-zinc-500">($20 USD Diaspora)</span>
            </div>
          </div>
        </div>
      )}

      {/* Availability Slots Grid */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Active Consultation Slots</h2>
            <p className="text-xs text-zinc-500">
              Slots displayed to mobile patients on the booking calendar
            </p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
            {slots.length} Slots
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {slots.map((slot) => (
            <div
              key={slot.slot_id}
              className={`rounded-xl border p-4 transition-all ${
                slot.is_booked
                  ? 'border-amber-200 bg-amber-50/50'
                  : 'border-zinc-200 bg-zinc-50/70 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900">{slot.date}</span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    slot.is_booked
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {slot.is_booked ? 'Booked' : 'Available'}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-600">
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                <span className="font-semibold">{slot.start_time} - {slot.end_time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Slot Modal */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <h2 className="text-base font-bold text-zinc-900">Add Doctor Availability Slot</h2>
              <button
                onClick={() => setIsSlotModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-zinc-900 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSlot}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 font-bold text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submittingSlot ? 'Opening...' : 'Open Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
