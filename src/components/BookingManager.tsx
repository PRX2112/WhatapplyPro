import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, CalendarDays, Loader2, X, Check, ChevronDown, User, Briefcase, Clock, IndianRupee, Pencil, Trash2, CheckCircle2, XCircle, Clock3, Ban } from "lucide-react";
import api from "../lib/api";
import type { Booking, Service } from "../lib/types";
import { getBusinessConfig } from "../lib/types";
import { format } from "date-fns";

interface Props {
  businessName: string;
  businessType: string;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock3, color: "text-amber-600 bg-amber-50 border-amber-200" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-blue-600 bg-blue-50 border-blue-200" },
  cancelled: { label: "Cancelled", icon: Ban, color: "text-red-500 bg-red-50 border-red-200" },
};

export default function BookingManager({ businessName, businessType, toast }: Props) {
  const config = getBusinessConfig(businessType);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customerName: "", customerPhone: "", serviceId: "",
    serviceName: "", price: "", dateTime: "", notes: "", staffName: "",
  });

  const load = async () => {
    try {
      const [b, s] = await Promise.all([
        api.bookings.list(filterStatus ? { status: filterStatus } : undefined),
        api.services.list(),
      ]);
      setBookings(b);
      setServices(s.filter(sv => sv.isActive));
    } catch (e: any) {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterStatus]);

  const openAdd = () => {
    setEditingBooking(null);
    setForm({ customerName: "", customerPhone: "", serviceId: "", serviceName: "", price: "", dateTime: "", notes: "", staffName: "" });
    setShowForm(true);
  };

  const openEdit = (b: Booking) => {
    setEditingBooking(b);
    setForm({
      customerName: b.customerName, customerPhone: b.customerPhone,
      serviceId: b.serviceId || "", serviceName: b.serviceName,
      price: b.price.toString(), dateTime: b.dateTime.slice(0, 16),
      notes: b.notes || "", staffName: b.staffName || "",
    });
    setShowForm(true);
  };

  const handleServiceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const svc = services.find(s => s.id === e.target.value);
    if (svc) {
      setForm(f => ({ ...f, serviceId: svc.id, serviceName: svc.name, price: svc.price.toString() }));
    } else {
      setForm(f => ({ ...f, serviceId: "", serviceName: "", price: "" }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.bookings.save({
        id: editingBooking?.id,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        serviceId: form.serviceId || null,
        serviceName: form.serviceName,
        price: parseFloat(form.price) || 0,
        dateTime: form.dateTime,
        notes: form.notes || null,
        staffName: form.staffName || null,
      });
      toast.success(editingBooking ? "Booking updated!" : "Booking created! WhatsApp confirmation sent.");
      setShowForm(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: Booking["status"]) => {
    try {
      await api.bookings.updateStatus(id, status);
      toast.success(`Booking ${status}!`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this booking?")) return;
    try {
      await api.bookings.delete(id);
      toast.success("Booking deleted");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const grouped = bookings.reduce<Record<string, Booking[]>>((acc, b) => {
    const date = format(new Date(b.dateTime), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(b);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{config.bookingLabel}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage {config.bookingLabel.toLowerCase()}, update status, send WhatsApp notifications
          </p>
        </div>
        <button
          onClick={openAdd}
          data-tour="new-booking-btn"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={15} /> New {config.bookingLabel.slice(0, -1)}
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {["", "pending", "confirmed", "completed", "cancelled"].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              filterStatus === s
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
            }`}
          >
            {s === "" ? "All" : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading...
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <CalendarDays size={40} className="mx-auto mb-3 text-slate-300" />
          <h3 className="font-bold text-slate-700">No {config.bookingLabel.toLowerCase()} yet</h3>
          <button onClick={openAdd} className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg">
            + Create First Booking
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {format(new Date(date + "T00:00:00"), "EEEE, d MMMM yyyy")}
                </span>
                <span className="text-xs text-slate-400">({grouped[date].length})</span>
              </div>
              <div className="space-y-2">
                {grouped[date].map(b => {
                  const sc = STATUS_CONFIG[b.status];
                  const Icon = sc.icon;
                  return (
                    <motion.div key={b.id} layout className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex flex-col items-center justify-center shrink-0">
                          <span className="text-base font-black text-violet-700 leading-none">
                            {format(new Date(b.dateTime), "h")}
                          </span>
                          <span className="text-[9px] text-violet-500 font-bold">
                            {format(new Date(b.dateTime), "mm a")}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 text-sm">{b.customerName}</span>
                                <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${sc.color}`}>
                                  <Icon size={10} />
                                  {sc.label}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">{b.customerPhone}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-emerald-700 text-sm">₹{b.price.toLocaleString("en-IN")}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Briefcase size={11} /> {b.serviceName}
                            </span>
                            {b.staffName && (
                              <span className="flex items-center gap-1">
                                <User size={11} /> {b.staffName}
                              </span>
                            )}
                          </div>

                          {b.notes && <p className="text-xs text-slate-400 mt-1 italic">"{b.notes}"</p>}

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                            {b.status === "pending" && (
                              <button
                                onClick={() => handleStatusChange(b.id, "confirmed")}
                                className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-semibold hover:bg-emerald-100 transition-colors"
                              >
                                <CheckCircle2 size={11} /> Confirm
                              </button>
                            )}
                            {(b.status === "pending" || b.status === "confirmed") && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(b.id, "completed")}
                                  className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold hover:bg-blue-100 transition-colors"
                                >
                                  <CheckCircle2 size={11} /> Complete
                                </button>
                                <button
                                  onClick={() => handleStatusChange(b.id, "cancelled")}
                                  className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded-md text-xs font-semibold hover:bg-red-100 transition-colors"
                                >
                                  <XCircle size={11} /> Cancel
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => openEdit(b)}
                              className="flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-xs font-semibold hover:bg-slate-100 transition-colors"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(b.id)}
                              className="flex items-center gap-1 px-2 py-1 bg-slate-50 text-red-500 border border-slate-200 rounded-md text-xs font-semibold hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowForm(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-slate-900">
                    {editingBooking ? `Edit ${config.bookingLabel.slice(0, -1)}` : `New ${config.bookingLabel.slice(0, -1)}`}
                  </h3>
                  <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                    <X size={16} className="text-slate-500" />
                  </button>
                </div>

                {!editingBooking && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
                    📱 A WhatsApp confirmation will be sent automatically after booking.
                  </p>
                )}

                <form onSubmit={handleSave} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Service</label>
                    <select
                      value={form.serviceId}
                      onChange={handleServiceSelect}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                    >
                      <option value="">Select from catalog or enter manually</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name} — ₹{s.price}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Service Name *</label>
                    <input value={form.serviceName} onChange={e => setForm(f => ({...f, serviceName: e.target.value}))}
                      required placeholder="e.g. Haircut & Spa"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Customer Name *</label>
                      <input value={form.customerName} onChange={e => setForm(f => ({...f, customerName: e.target.value}))}
                        required placeholder="Full name"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Phone *</label>
                      <input value={form.customerPhone} onChange={e => setForm(f => ({...f, customerPhone: e.target.value}))}
                        required placeholder="+91..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Price (₹)</label>
                      <input type="number" min="0" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Date & Time *</label>
                      <input type="datetime-local" value={form.dateTime} onChange={e => setForm(f => ({...f, dateTime: e.target.value}))}
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Staff Name</label>
                    <input value={form.staffName} onChange={e => setForm(f => ({...f, staffName: e.target.value}))}
                      placeholder="Assigned staff (optional)"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                    <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                      rows={2} placeholder="Special requests..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none" />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowForm(false)}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold">
                      Cancel
                    </button>
                    <button type="submit" disabled={saving}
                      className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      {saving ? "Saving..." : editingBooking ? "Update" : "Create Booking"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
