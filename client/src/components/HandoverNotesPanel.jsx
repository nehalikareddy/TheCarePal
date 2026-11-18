import React, { useState, useEffect } from 'react';
import { Moon, Sun, MessageSquare, Send, Clock, User, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function HandoverNotesPanel({ patientId, userRole }) {
  const [notes, setNotes] = useState([]);
  const [shift, setShift] = useState('Day to Night');
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchNotes = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const res = await api.get(`/handovers/${patientId}`);
      setNotes(res.data.notes || []);
    } catch (err) {
      console.error('Failed to load handover notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [patientId]);

  const handleSubmitNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post(`/handovers/${patientId}`, {
        shift,
        noteText: noteText.trim()
      });
      setNotes([res.data.note, ...notes]);
      setNoteText('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit shift handover note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#e6ecf1] mt-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#e6ecf1] mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#3fb6ad]/15 text-[#04302c] flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4 text-[#3fb6ad]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#101820] font-heading">Shift Handover Notes</h3>
            <p className="text-xs text-slate-500">Day & Night shift communications between caregivers & family</p>
          </div>
        </div>
      </div>

      {/* New Note Form */}
      <form onSubmit={handleSubmitNote} className="mb-6 bg-slate-50 border border-[#e6ecf1] rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <label className="text-xs font-bold text-[#101820] font-heading">Log Shift Observation</label>
          
          {/* Shift Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-white border border-[#e6ecf1] rounded-full text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setShift('Day to Night')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full font-semibold transition-all font-heading ${
                shift === 'Day to Night'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              <span>Day to Night</span>
            </button>

            <button
              type="button"
              onClick={() => setShift('Night to Day')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full font-semibold transition-all font-heading ${
                shift === 'Night to Day'
                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Night to Day</span>
            </button>
          </div>
        </div>

        <textarea
          rows={2}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Record patient mood, meals, vitals, sleep, or medication observations for the incoming shift..."
          className="w-full text-xs sm:text-sm p-3.5 rounded-2xl border border-slate-300 bg-white focus:ring-2 focus:ring-[#3fb6ad] focus:border-[#3fb6ad] focus:outline-none"
        />

        {error && <p className="text-xs text-red-600 font-medium mt-1">{error}</p>}

        <div className="flex justify-end mt-3">
          <button
            type="submit"
            disabled={submitting || !noteText.trim()}
            className="flex items-center gap-1.5 py-2.5 px-5 rounded-full text-xs font-bold bg-[#3fb6ad] text-[#04302c] hover:bg-[#37a79e] font-heading shadow-[0_4px_14px_rgba(63,182,173,0.3)] hover:shadow-[0_8px_20px_rgba(63,182,173,0.45)] disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? 'Posting...' : 'Post Handover Note'}</span>
          </button>
        </div>
      </form>

      {/* Notes List */}
      <div className="space-y-3">
        {loading && notes.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No shift handover notes logged yet.</p>
        ) : (
          notes.map((note) => {
            const isNight = note.shift === 'Night to Day';
            return (
              <div
                key={note._id}
                className="p-4 rounded-2xl border border-[#e6ecf1] bg-white hover:border-slate-300 transition-all flex flex-col gap-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isNight ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {isNight ? <Moon className="w-3 h-3 text-indigo-500" /> : <Sun className="w-3 h-3 text-amber-500" />}
                      <span>{note.shift}</span>
                    </span>
                    <span className="font-bold text-[#101820] font-heading">{note.authorName}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-1 pt-1">
                  {note.noteText}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
