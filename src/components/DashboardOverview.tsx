import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users, CalendarDays, MessageSquare, TrendingUp,
  IndianRupee, ArrowRight, Clock, CheckCircle2, AlertCircle, Loader2,
  Link2, Copy, Check, ExternalLink,
} from "lucide-react";
import api from "../lib/api";
import type { DashboardStats } from "../lib/types";
import { getBusinessConfig } from "../lib/types";
import { format } from "date-fns";

interface Props {
  businessName: string;
  businessType: string;
  slug?: string;
  onNavigate: (tab: string) => void;
  toast: { error: (m: string) => void; success?: (m: string) => void };
}

export default function DashboardOverview({ businessName, businessType, onNavigate, toast }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const config = getBusinessConfig(businessType);

  const bookingUrl = slug ? `${window.location.origin}/book/${slug}` : null;

  const handleCopy = async () => {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback for browsers without clipboard API
      const el = document.createElement("textarea");
      el.value = bookingUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [s, b, biz] = await Promise.all([
          api.business.stats(),
          api.bookings.list({ status: "pending" }),
          api.business.get(),
        ]);
        setStats(s);
        setBookings(b.slice(0, 5));
        if (biz?.slug) setSlug(biz.slug);
      } catch (e: any) {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading dashboard...
      </div>
    );
  }

  const statCards = [
    {
      label: config.customerLabel,
      value: stats?.totalCustomers ?? 0,
      icon: Users,
      color: "bg-blue-50 text-blue-700 border-blue-100",
      iconColor: "text-blue-600",
      tab: "customers",
    },
    {
      label: config.bookingLabel,
      value: stats?.totalBookings ?? 0,
      icon: CalendarDays,
      color: "bg-violet-50 text-violet-700 border-violet-100",
      iconColor: "text-violet-600",
      tab: "bookings",
    },
    {
      label: "Messages (30d)",
      value: stats?.messagesLast30Days ?? 0,
      icon: MessageSquare,
      color: "bg-teal-50 text-teal-700 border-teal-100",
      iconColor: "text-teal-600",
      tab: "sandbox",
    },
    {
      label: "Revenue Collected",
      value: `₹${(stats?.totalRevenue ?? 0).toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "bg-emerald-50 text-emerald-700 border-emerald-100",
      iconColor: "text-emerald-600",
      tab: "customers",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">
          {config.icon} {businessName || "Your Business"}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {format(new Date(), "EEEE, d MMMM yyyy")} · Here's your overview
        </p>
      </div>

      {/* Booking Link Banner */}
      {bookingUrl && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4"
          data-tour="booking-link-banner"
        >
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-200/40" />
          <div className="pointer-events-none absolute -right-2 bottom-0 h-16 w-16 rounded-full bg-teal-200/30" />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Icon + Label */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-md shadow-emerald-200">
                <Link2 size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Your Public Booking Link</p>
                <p className="truncate text-sm font-mono font-medium text-slate-700 mt-0.5">{bookingUrl}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span key="check" initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }} className="flex items-center gap-1">
                      <Check size={13} /> Copied!
                    </motion.span>
                  ) : (
                    <motion.span key="copy" initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }} className="flex items-center gap-1">
                      <Copy size={13} /> Copy Link
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white/80 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all"
              >
                <ExternalLink size={13} /> Preview
              </a>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stat Cards */}
      <div data-tour="dashboard-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onNavigate(card.tab)}
              className={`bg-white border rounded-xl p-4 text-left hover:shadow-md transition-all group ${card.color}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg bg-white/80 ${card.iconColor}`}>
                  <Icon size={18} />
                </div>
                <ArrowRight size={14} className="text-current opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-black">{card.value}</div>
              <div className="text-xs font-semibold mt-0.5 opacity-70">{card.label}</div>
            </motion.button>
          );
        })}
      </div>

      {/* Row: Outstanding + Booking Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Outstanding */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">Outstanding Dues</h3>
            </div>
            <button
              onClick={() => onNavigate("customers")}
              className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
            >
              View Ledger <ArrowRight size={12} />
            </button>
          </div>
          <div className="text-3xl font-black text-amber-600">
            ₹{(stats?.totalOutstanding ?? 0).toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-slate-400 mt-1">Total unpaid across all customers</p>
        </div>

        {/* Booking Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-violet-500" />
              <h3 className="font-bold text-slate-900 text-sm">{config.bookingLabel} Status</h3>
            </div>
            <button
              onClick={() => onNavigate("bookings")}
              className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
            >
              Manage <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {[
              { label: "Pending", value: stats?.pendingBookings ?? 0, color: "bg-amber-500", textColor: "text-amber-700" },
              { label: "Confirmed", value: stats?.confirmedBookings ?? 0, color: "bg-emerald-500", textColor: "text-emerald-700" },
              { label: "Completed", value: stats?.completedBookings ?? 0, color: "bg-blue-500", textColor: "text-blue-700" },
              { label: "Cancelled", value: stats?.cancelledBookings ?? 0, color: "bg-red-400", textColor: "text-red-600" },
            ].map(s => {
              const total = stats?.totalBookings || 1;
              const pct = Math.round((s.value / total) * 100);
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-20 shrink-0">{s.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div className={`${s.color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-xs font-bold w-6 text-right ${s.textColor}`}>{s.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-500" />
            <h3 className="font-bold text-slate-900 text-sm">Upcoming {config.bookingLabel}</h3>
          </div>
          <button
            onClick={() => onNavigate("bookings")}
            className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
          >
            View All <ArrowRight size={12} />
          </button>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-300" />
            <p className="text-sm font-medium text-slate-500">No pending {config.bookingLabel.toLowerCase()}</p>
            <button
              onClick={() => onNavigate("bookings")}
              className="mt-3 text-xs text-emerald-700 font-semibold hover:underline"
            >
              + Create first booking →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map(b => (
              <div key={b.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-black text-violet-700">
                    {new Date(b.dateTime).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{b.customerName}</div>
                  <div className="text-xs text-slate-400 truncate">{b.serviceName} · {format(new Date(b.dateTime), "h:mm a, d MMM")}</div>
                </div>
                <div className="text-sm font-bold text-emerald-700 shrink-0">₹{b.price}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
