import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Pencil, Trash2, Loader2, Tag, Clock, IndianRupee, ToggleLeft, ToggleRight, X, Check } from "lucide-react";
import api from "../../lib/api";
import type { Service } from "../../lib/types";
import { getBusinessConfig } from "../../lib/types";

interface Props {
  businessType: string;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

const CATEGORIES = ["Hair", "Skin", "Nail", "Body", "Makeup", "Massage", "Consultation", "Package", "Membership", "Other"];

export default function ServiceCatalog({ businessType, toast }: Props) {
  const config = getBusinessConfig(businessType);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "", description: "", price: "", durationMin: "30", category: "", isActive: true,
  });

  const load = async () => {
    try {
      const data = await api.services.list();
      setServices(data);
    } catch (e: any) {
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "", price: "", durationMin: "30", category: "", isActive: true });
    setShowForm(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name, description: s.description || "", price: s.price.toString(),
      durationMin: s.durationMin.toString(), category: s.category || "", isActive: s.isActive,
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.services.save({
        id: editing?.id,
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price) || 0,
        durationMin: parseInt(form.durationMin) || 30,
        category: form.category || null,
        isActive: form.isActive,
      });
      toast.success(editing ? "Service updated!" : "Service added!");
      setShowForm(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    try {
      await api.services.delete(id);
      toast.success("Service deleted");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const grouped = services.reduce<Record<string, Service[]>>((acc, s) => {
    const cat = s.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Service Catalog</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Define your {config.serviceLabel.toLowerCase()} — they'll appear in the booking form
          </p>
        </div>
        <button
          onClick={openAdd}
          data-tour="add-service-btn"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={15} />
          Add {config.serviceLabel.slice(0, -1)}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading...
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <div className="text-4xl mb-3">🛒</div>
          <h3 className="font-bold text-slate-700">No services yet</h3>
          <p className="text-slate-400 text-sm mt-1 mb-4">Add your first service to enable the booking form</p>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700"
          >
            + Add First Service
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <Tag size={13} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{cat}</span>
                <span className="text-xs text-slate-400">({items.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {items.map(s => (
                  <motion.div
                    key={s.id}
                    layout
                    className={`bg-white border rounded-xl p-4 flex flex-col gap-2 hover:shadow-sm transition-all ${
                      s.isActive ? "border-slate-200" : "border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm leading-tight">{s.name}</h4>
                        {s.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{s.description}</p>}
                      </div>
                      {!s.isActive && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded shrink-0">Inactive</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-bold text-emerald-700">
                        <IndianRupee size={12} />
                        {s.price.toLocaleString("en-IN")}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock size={12} />
                        {s.durationMin} min
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => openEdit(s)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowForm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-slate-900">{editing ? "Edit Service" : "Add New Service"}</h3>
                  <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                    <X size={16} className="text-slate-500" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Service Name *</label>
                    <input
                      value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                      required placeholder="e.g. Hair Spa, Monthly Membership"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                    <textarea
                      value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                      placeholder="Brief description (optional)"
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Price (₹) *</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))}
                        required placeholder="0"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Duration (min)</label>
                      <input
                        type="number" min="1"
                        value={form.durationMin} onChange={e => setForm(f => ({...f, durationMin: e.target.value}))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                    <select
                      value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white"
                    >
                      <option value="">No category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-slate-700 font-medium">Active (show in booking form)</span>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({...f, isActive: !f.isActive}))}
                      className="text-emerald-600"
                    >
                      {form.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-400" />}
                    </button>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button" onClick={() => setShowForm(false)}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit" disabled={saving}
                      className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      {saving ? "Saving..." : editing ? "Update" : "Add Service"}
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
