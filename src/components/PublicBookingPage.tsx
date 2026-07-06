import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarDays, Clock, IndianRupee, Check, Loader2,
  Smartphone, MessageSquare, AlertCircle, ArrowLeft, Heart,
  Sparkles, CheckCircle2
} from "lucide-react";
import api from "../lib/api";
import { getBusinessConfig } from "../lib/types";

interface BusinessInfo {
  id: string;
  name: string;
  type: string;
  upiId?: string;
  timezone: string;
  slug: string;
}

interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMin: number;
  category?: string;
}

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Booking Form State
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  useEffect(() => {
    if (!slug) return;
    api.public
      .getBusiness(slug)
      .then((data) => {
        setBusiness(data.business);
        setServices(data.services);
        if (data.services.length > 0) {
          setSelectedService(data.services[0]);
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load business details.");
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !selectedService || !date || !time) return;

    setSubmitting(true);
    try {
      // Combine date & time into ISO string
      const isoDateTime = new Date(`${date}T${time}`).toISOString();
      const res = await api.public.createBooking(slug, {
        customerName,
        customerPhone,
        serviceId: selectedService.id,
        dateTime: isoDateTime,
        notes: notes || undefined,
      });
      setSuccessData(res.booking);
    } catch (err: any) {
      alert(err.message || "Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={36} />
        <p className="text-sm font-semibold text-slate-600">Loading booking page...</p>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-4">
            <AlertCircle size={24} />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">Business Not Found</h3>
          <p className="text-sm text-slate-500 mt-2">{error || "The requested business page does not exist."}</p>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold hover:underline mt-5"
          >
            <ArrowLeft size={13} /> Back to Whatapply
          </a>
        </div>
      </div>
    );
  }

  const config = getBusinessConfig(business.type);

  // Group services by category
  const groupedServices = services.reduce<Record<string, ServiceItem[]>>((acc, s) => {
    const cat = s.category || "General Offerings";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const formattedBookingTime = successData
    ? new Date(successData.dateTime).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900 flex flex-col justify-between">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 py-6 px-4 max-w-lg mx-auto w-full">
        {/* Business Branding Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-xl shadow-lg shadow-emerald-500/10 mb-4">
            {business.name.charAt(0)}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{business.name}</h1>
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-widest mt-1">
            {config.icon} {config.label}
          </p>
        </header>

        <AnimatePresence mode="wait">
          {!successData ? (
            <motion.div
              key="booking-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-xl p-5 space-y-6">
                {/* 1. Select Service */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    1. Select {config.serviceLabel.slice(0, -1)}
                  </h3>

                  <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1 border border-slate-100 rounded-xl p-2.5 bg-slate-50">
                    {Object.entries(groupedServices).map(([cat, items]) => (
                      <div key={cat} className="space-y-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1">
                          {cat}
                        </div>
                        {items.map((s) => {
                          const active = selectedService?.id === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSelectedService(s)}
                              className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                                active
                                  ? "bg-emerald-50 border-emerald-500 shadow-sm"
                                  : "bg-white border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="text-sm font-bold text-slate-800 truncate">{s.name}</div>
                                {s.description && (
                                  <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{s.description}</div>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-bold text-emerald-800 flex items-center justify-end">
                                  <IndianRupee size={11} /> {s.price}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                                  <Clock size={10} /> {s.durationMin}m
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Choose Time */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    2. Choose Date & Time
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={date}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Time</label>
                      <input
                        type="time"
                        required
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Customer Info */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    3. Your Contact Details
                  </h3>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Kumar"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">WhatsApp Mobile Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 font-medium"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">We'll send your booking confirmation here.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Special Notes (Optional)</label>
                    <textarea
                      placeholder="Any requests or comments..."
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2 disabled:opacity-60 text-sm tracking-wide"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
                  {submitting ? "Booking slot..." : "Confirm My Booking"}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="booking-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 text-center space-y-6"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto animate-bounce">
                <CheckCircle2 size={28} />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900">Slot Booked!</h2>
                <p className="text-sm text-slate-500 mt-1">Thank you, your slot has been successfully reserved.</p>
              </div>

              {/* Booking Receipt Summary */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider">Business</span>
                  <span className="font-bold text-slate-700">{business.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider">Service</span>
                  <span className="font-bold text-slate-700">{successData.serviceName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider">Time</span>
                  <span className="font-bold text-slate-700">{formattedBookingTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider">Price</span>
                  <span className="font-bold text-emerald-700 text-sm">₹{successData.price}</span>
                </div>
              </div>

              {/* simulated whatsapp bubble */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 text-[9px] bg-emerald-100 text-emerald-800 rounded-bl font-semibold flex items-center gap-0.5">
                  <Smartphone size={8} /> WhatsApp
                </div>
                <div className="flex gap-2">
                  <span className="text-lg">📱</span>
                  <div>
                    <p className="text-xs font-bold text-emerald-800">Booking Notification Sent!</p>
                    <p className="text-xs text-emerald-600 mt-0.5 leading-relaxed">
                      We sent a confirmation text to <span className="font-semibold">{successData.customerPhone}</span>.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSuccessData(null);
                  setCustomerName("");
                  setCustomerPhone("");
                  setDate("");
                  setTime("");
                  setNotes("");
                }}
                className="w-full py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-lg text-xs transition"
              >
                Book Another Slot
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mini Footer */}
      <footer className="text-center py-4 text-[10px] text-slate-400 relative z-10">
        Powered by <span className="font-bold text-emerald-600">Whatapply</span> · Smart Bookings on Autopilot
      </footer>
    </div>
  );
}
