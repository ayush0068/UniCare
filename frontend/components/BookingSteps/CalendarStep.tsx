import { convertTo24Hour, startOfDay, toLocalYMD } from '@/lib/dateUtils';
import React, { useMemo, useState } from 'react';
import { Calendar } from '../ui/calendar';
import { CalendarIcon, Clock, ChevronRight, Sun, Sunset, Moon } from 'lucide-react';

interface CalendarStepProps {
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  selectedSlot: string;
  setSelectedSlot: (slot: string) => void;
  availableSlots: string[];
  availableDates: string[];
  excludedWeekdays: number[];
  onContinue: () => void;
  bookedSlots: string[];
}

/* ─── Group slots into Morning / Afternoon / Evening ─── */
const groupSlots = (slots: string[]) => {
  const morning: string[] = [];
  const afternoon: string[] = [];
  const evening: string[] = [];
  slots.forEach((slot) => {
    const [timePart, modifier] = slot.split(' ');
    const hour = parseInt(timePart.split(':')[0], 10);
    const h24 = modifier === 'PM' && hour !== 12 ? hour + 12 : modifier === 'AM' && hour === 12 ? 0 : hour;
    if (h24 < 12) morning.push(slot);
    else if (h24 < 17) afternoon.push(slot);
    else evening.push(slot);
  });
  return { morning, afternoon, evening };
};

const CalendarStep = ({
  selectedDate, setSelectedDate,
  selectedSlot, setSelectedSlot,
  availableSlots, availableDates, excludedWeekdays,
  onContinue, bookedSlots,
}: CalendarStepProps) => {
  const [showAll, setShowAll] = useState(false);

  /* ── Slot helpers ── */
  const isSlotBooked = (slot: string): boolean => {
    if (!selectedDate) return false;
    const dateString = toLocalYMD(selectedDate);
    const slotDateTime = new Date(`${dateString}T${convertTo24Hour(slot)}`);
    return bookedSlots.some((b) => new Date(b).getTime() === slotDateTime.getTime());
  };

  const isSlotInPast = (slot: string): boolean => {
    if (!selectedDate) return false;
    const now = new Date();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const selDay = new Date(selectedDate); selDay.setHours(0, 0, 0, 0);
    if (selDay.getTime() !== today.getTime()) return false;
    const [time, modifier] = slot.split(' ');
    let [hour, minutes] = time.split(':');
    if (hour === '12') hour = '00';
    if (modifier === 'PM') hour = String(parseInt(hour, 10) + 12);
    const slotDT = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), parseInt(hour, 10), parseInt(minutes, 10), 0);
    return slotDT.getTime() <= new Date(now.getTime() + 5 * 60 * 1000).getTime();
  };

  const isDateDisabled = (date: Date): boolean => {
    const today = startOfDay(new Date());
    if (startOfDay(date) < today) return true;
    if (!availableDates.includes(toLocalYMD(date))) return true;
    return excludedWeekdays.includes(date.getDay());
  };

  const grouped = useMemo(() => groupSlots(availableSlots), [availableSlots]);
  const SLOT_GROUPS = [
    { label: 'Morning', icon: Sun, slots: grouped.morning, color: 'text-amber-500' },
    { label: 'Afternoon', icon: Sunset, slots: grouped.afternoon, color: 'text-orange-500' },
    { label: 'Evening', icon: Moon, slots: grouped.evening, color: 'text-indigo-500' },
  ].filter((g) => g.slots.length > 0);

  const SLOTS_PER_GROUP = 6;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,600&display=swap');
        .uc-font  { font-family: 'DM Sans', system-ui, sans-serif; }
        .uc-serif { font-family: 'Fraunces', Georgia, serif; }

        @keyframes step-in {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .step-animate { animation: step-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }

        /* Override shadcn calendar colors */
        .uc-cal [aria-selected="true"]:not([aria-disabled="true"]) {
          background-color: #0ea5e9 !important;
          color: white !important;
          border-radius: 10px !important;
        }
        .uc-cal [data-today="true"]:not([aria-selected="true"]) {
          background-color: #e0f2fe !important;
          color: #0284c7 !important;
          font-weight: 700;
          border-radius: 10px !important;
        }
        .uc-cal button:not([aria-disabled="true"]):hover {
          background-color: #f0f9ff !important;
          border-radius: 10px !important;
        }

        .slot-btn {
          transition: all 0.18s cubic-bezier(0.16,1,0.3,1);
        }
        .slot-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(14,165,233,0.18);
        }
        .slot-btn:not(:disabled):active {
          transform: translateY(0);
        }

        @keyframes slot-select {
          0%   { transform: scale(0.95); }
          60%  { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        .slot-selected { animation: slot-select 0.25s cubic-bezier(0.16,1,0.3,1); }

        .continue-btn {
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .continue-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(14,165,233,0.30);
        }
        .continue-btn:not(:disabled):active { transform: translateY(0); }
      `}</style>

      <div className='uc-font step-animate'>

        {/* ─── Header ──────────────────────────────────── */}
        <div className='mb-8'>
          <p className='text-[11px] font-semibold uppercase tracking-widest text-sky-500 mb-2'>Step 2 of 3</p>
          <h3 className='uc-serif text-3xl font-bold text-slate-900 leading-tight'>
            Pick a Date &<br />
            <em className='not-italic text-sky-500'>Time Slot</em>
          </h3>
        </div>

        {/* ─── Two-column grid ─────────────────────────── */}
        <div className='grid md:grid-cols-[320px_1fr] gap-6 items-start'>

          {/* ── Calendar Column ── */}
          <div className='bg-[#F8F7F4] rounded-3xl p-5 border border-slate-100'>
            <div className='flex items-center gap-2 mb-4'>
              <div className='w-7 h-7 bg-sky-100 rounded-lg flex items-center justify-center'>
                <CalendarIcon className='w-3.5 h-3.5 text-sky-600' />
              </div>
              <span className='text-sm font-semibold text-slate-700'>Choose a Date</span>
            </div>
            <div className='uc-cal'>
              <Calendar
                mode='single'
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isDateDisabled}
                className='w-full'
                classNames={{
                  months: 'w-full',
                  month: 'w-full',
                  table: 'w-full',
                  head_cell: 'text-slate-400 text-[11px] font-semibold uppercase tracking-wide',
                  cell: 'text-center',
                  day: 'h-9 w-9 text-sm font-medium text-slate-700 rounded-xl',
                  day_selected: 'bg-sky-500 text-white hover:bg-sky-500 hover:text-white',
                  day_today: 'bg-sky-50 text-sky-600 font-bold',
                  day_disabled: 'text-slate-300 opacity-40 cursor-not-allowed',
                  day_outside: 'text-slate-300',
                  nav_button: 'h-8 w-8 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors',
                  caption: 'flex justify-between items-center mb-4 px-1',
                  caption_label: 'text-sm font-bold text-slate-900',
                }}
              />
            </div>

            {/* Selected date display */}
            {selectedDate && (
              <div className='mt-4 pt-4 border-t border-slate-200/60'>
                <p className='text-xs text-slate-400 font-medium'>Selected</p>
                <p className='text-sm font-bold text-slate-900 mt-0.5'>
                  {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            )}
          </div>

          {/* ── Time Slots Column ── */}
          <div className='min-h-[360px]'>
            {!selectedDate ? (
              /* Empty: no date */
              <div className='h-full flex flex-col items-center justify-center bg-[#F8F7F4] rounded-3xl border border-dashed border-slate-200 py-16 px-8 text-center'>
                <div className='w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4'>
                  <CalendarIcon className='w-7 h-7 text-slate-300' />
                </div>
                <p className='text-slate-400 text-sm font-medium'>Select a date on the left to see available time slots</p>
              </div>
            ) : availableSlots.length === 0 ? (
              /* Empty: no slots */
              <div className='h-full flex flex-col items-center justify-center bg-[#F8F7F4] rounded-3xl border border-dashed border-slate-200 py-16 px-8 text-center'>
                <div className='w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4'>
                  <Clock className='w-7 h-7 text-slate-300' />
                </div>
                <p className='text-slate-800 text-sm font-semibold mb-1'>No Slots Available</p>
                <p className='text-slate-400 text-xs'>Please choose a different date.</p>
              </div>
            ) : (
              /* Slots grouped by time of day */
              <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-semibold text-slate-700'>
                    Available Slots
                    <span className='ml-2 text-xs font-normal text-slate-400'>({availableSlots.length} total)</span>
                  </span>
                  {selectedSlot && (
                    <span className='flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg'>
                      <Clock className='w-3 h-3' />
                      {selectedSlot} selected
                    </span>
                  )}
                </div>

                {SLOT_GROUPS.map(({ label, icon: Icon, slots, color }) => {
                  const displaySlots = showAll ? slots : slots.slice(0, SLOTS_PER_GROUP);
                  return (
                    <div key={label}>
                      <div className='flex items-center gap-2 mb-3'>
                        <Icon className={`w-3.5 h-3.5 ${color}`} />
                        <span className='text-xs font-bold uppercase tracking-wider text-slate-400'>{label}</span>
                        <span className='text-[11px] text-slate-300 font-medium'>({slots.length})</span>
                      </div>
                      <div className='grid grid-cols-3 sm:grid-cols-4 gap-2'>
                        {displaySlots.map((slot) => {
                          const isSelected = selectedSlot === slot;
                          const isBooked = isSlotBooked(slot);
                          const isPast = isSlotInPast(slot);
                          const isDisabled = isBooked || isPast;
                          return (
                            <button
                              key={slot}
                              disabled={isDisabled}
                              onClick={() => !isDisabled && setSelectedSlot(slot)}
                              className={`slot-btn relative text-xs font-semibold py-2.5 px-2 rounded-xl border transition-all duration-150
                                ${isSelected
                                  ? 'slot-selected bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-200'
                                  : isDisabled
                                    ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-sky-200 hover:text-sky-700'
                                }`}
                            >
                              {slot}
                              {(isPast || isBooked) && !isSelected && (
                                <span className='absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-slate-300 text-white px-1 py-px rounded-full leading-none'>
                                  {isPast ? 'Past' : 'Full'}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Show more */}
                {availableSlots.length > SLOT_GROUPS.length * SLOTS_PER_GROUP && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className='text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors flex items-center gap-1'
                  >
                    {showAll ? 'Show fewer slots' : `+ ${availableSlots.length - SLOT_GROUPS.length * SLOTS_PER_GROUP} more slots`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── Continue Button ─────────────────────────── */}
        <div className='flex justify-end mt-10 pt-6 border-t border-slate-100'>
          <button
            onClick={onContinue}
            disabled={!selectedDate || !selectedSlot}
            className='continue-btn flex items-center gap-2.5 bg-gradient-to-b from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-semibold text-sm px-7 py-3.5 rounded-2xl shadow-md shadow-sky-200/50 disabled:shadow-none disabled:cursor-not-allowed'
          >
            Continue to Review
            <ChevronRight className='w-4 h-4' />
          </button>
        </div>
      </div>
    </>
  );
};

export default CalendarStep;