import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Search, Trash2, Pencil, IndianRupee, QrCode, Bell,
  Loader2, X, Check, Tag, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Filter,
} from "lucide-react";
import api from "../lib/api";
import type { Customer, LedgerEntry } from "../lib/types";
import { getBusinessConfig } from "../lib/types";

interface Props {
  businessType: string;
  businessUpiId: string;
  businessName: string;
  toast: { success: (m: string) => void; error: (m: string) => void };
  mode?: "customers" | "ledger";
}

export default function PaymentLedger({ businessType, businessUpiId, businessName, toast, mode = "customers" }: Props) {
  const config = getBusinessConfig(businessType);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<Record<string, LedgerEntry[]>>({});
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [showLedgerForm, setShowLedgerForm] = useState<string | null>(null);

  // Forms
  const [custForm, setCustForm] = useState({ name: "", phone: "", email: "", upiId: "", note: "", tags: "" });
  const [ledgerForm, setLedgerForm] = useState({ type: "debit" as "debit" | "credit", amount: "", description: "" });

  const load = async () => {
    try {
      const q = search || undefined;
      const data = await api.customers.list(q ? { q } : undefined);
      setCustomers(data);
    } catch (e: any) {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search]);

  const loadLedger = async (customerId: string) => {
    try {
      const entries = await api.ledger.list({ customerId });
      setLedgerEntries(prev => ({ ...prev, [customerId]: entries }));
    } catch {}
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadLedger(id);
    }
  };

  const openAdd = () => {
    setEditingCustomer(null);
    setCustForm({ name: "", phone: "", email: "", upiId: "", note: "", tags: "" });
    setShowForm(true);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setCustForm({ name: c.name, phone: c.phone, email: c.email || "", upiId: c.upiId || "", note: c.note || "", tags: c.tags.join(", ") });
    setShowForm(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCustomer(true);
    try {
      await api.customers.save({
        id: editingCustomer?.id,
        name: custForm.name,
        phone: custForm.phone,
        email: custForm.email || null,
        upiId: custForm.upiId || null,
        note: custForm.note || null,
        tags: custForm.tags ? custForm.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      });
      toast.success(editingCustomer ? "Customer updated!" : "Customer added!");
      setShowForm(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer? This will also delete all their ledger entries.")) return;
    try {
      await api.customers.delete(id);
      toast.success("Customer deleted");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAddLedgerEntry = async (customerId: string) => {
    if (!ledgerForm.amount || parseFloat(ledgerForm.amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      await api.ledger.add({
        customerId,
        type: ledgerForm.type,
        amount: parseFloat(ledgerForm.amount),
        description: ledgerForm.description || undefined,
      });
      toast.success(`${ledgerForm.type === "debit" ? "Debit" : "Credit"} entry added!`);
      setShowLedgerForm(null);
      setLedgerForm({ type: "debit", amount: "", description: "" });
      load();
      loadLedger(customerId);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRemind = async (customerId: string) => {
    try {
      const result = await api.ledger.remind({ customerId });
      toast.success("WhatsApp reminder sent!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredCustomers = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const totalOutstanding = filteredCustomers.reduce((sum, c) => sum + Math.max(0, c.outstandingAmount), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{config.customerLabel} & Ledger</h2>
          <p className="text-sm text-slate-500 mt-0.5">Track balances, add transactions, send UPI reminders</p>
        </div>
        <button
          onClick={openAdd}
          data-tour="add-customer-btn"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={15} /> Add {config.customerLabel.slice(0, -1)}
        </button>
      </div>

      {/* Summary bar */}
      {totalOutstanding > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IndianRupee size={16} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-900">Total Outstanding</span>
          </div>
          <span className="text-lg font-black text-amber-700">₹{totalOutstanding.toLocaleString("en-IN")}</span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${config.customerLabel.toLowerCase()}...`}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <div className="text-4xl mb-3">👥</div>
          <h3 className="font-bold text-slate-700">No {config.customerLabel.toLowerCase()} found</h3>
          {!search && (
            <button onClick={openAdd} className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg">
              + Add First {config.customerLabel.slice(0, -1)}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCustomers.map((c, idx) => {
            const expanded = expandedId === c.id;
            const entries = ledgerEntries[c.id] || [];
            return (
              <motion.div
                key={c.id}
                layout
                data-tour={idx === 0 ? "ledger-customer-row" : undefined}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {c.name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{c.name}</span>
                      {c.tags.map(tag => (
                        <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                    <div className="text-xs text-slate-400">{c.phone}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`font-black text-base ${c.outstandingAmount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {c.outstandingAmount > 0 ? `₹${c.outstandingAmount.toLocaleString("en-IN")}` : "✓ Cleared"}
                    </div>
                    <div className="text-[10px] text-slate-400">outstanding</div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {c.outstandingAmount > 0 && (
                      <button
                        onClick={() => handleRemind(c.id)}
                        title="Send WhatsApp Reminder"
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Bell size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => toggleExpand(c.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Ledger */}
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 overflow-hidden"
                    >
                      <div className="px-4 py-3 bg-slate-50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Transaction History</span>
                          <button
                            onClick={() => setShowLedgerForm(showLedgerForm === c.id ? null : c.id)}
                            className="flex items-center gap-1 text-xs text-emerald-700 font-semibold hover:underline"
                          >
                            <Plus size={12} /> Add Entry
                          </button>
                        </div>

                        {showLedgerForm === c.id && (
                          <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3 space-y-2">
                            <div className="flex rounded-lg overflow-hidden border border-slate-200">
                              {(["debit", "credit"] as const).map(t => (
                                <button
                                  key={t}
                                  onClick={() => setLedgerForm(f => ({...f, type: t}))}
                                  className={`flex-1 py-1.5 text-xs font-bold transition-all ${
                                    ledgerForm.type === t
                                      ? t === "debit" ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
                                      : "bg-white text-slate-500"
                                  }`}
                                >
                                  {t === "debit" ? "↑ Debit (Owes)" : "↓ Credit (Paid)"}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                placeholder="Amount ₹"
                                value={ledgerForm.amount}
                                onChange={e => setLedgerForm(f => ({...f, amount: e.target.value}))}
                                className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                              />
                              <input
                                placeholder="Note (optional)"
                                value={ledgerForm.description}
                                onChange={e => setLedgerForm(f => ({...f, description: e.target.value}))}
                                className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                              />
                              <button
                                onClick={() => handleAddLedgerEntry(c.id)}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}

                        {entries.length === 0 ? (
                          <p className="text-xs text-slate-400 py-2 text-center">No transactions yet</p>
                        ) : (
                          <div className="space-y-1.5">
                            {entries.map(e => (
                              <div key={e.id} className="flex items-center gap-2 text-xs">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${e.type === "debit" ? "bg-red-100" : "bg-emerald-100"}`}>
                                  {e.type === "debit"
                                    ? <TrendingUp size={10} className="text-red-600" />
                                    : <TrendingDown size={10} className="text-emerald-600" />
                                  }
                                </div>
                                <span className="flex-1 text-slate-600">{e.description || (e.type === "debit" ? "Credit sale" : "Payment received")}</span>
                                <span className={`font-bold ${e.type === "debit" ? "text-red-600" : "text-emerald-600"}`}>
                                  {e.type === "debit" ? "+" : "-"}₹{e.amount.toLocaleString("en-IN")}
                                </span>
                                <span className="text-slate-300">{new Date(e.createdAt).toLocaleDateString("en-IN")}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Customer Modal */}
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
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-slate-900">
                    {editingCustomer ? `Edit ${config.customerLabel.slice(0, -1)}` : `Add ${config.customerLabel.slice(0, -1)}`}
                  </h3>
                  <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                    <X size={16} className="text-slate-500" />
                  </button>
                </div>
                <form onSubmit={handleSaveCustomer} className="space-y-3">
                  {[
                    { label: "Name *", field: "name" as const, placeholder: "Full name", required: true },
                    { label: "Phone *", field: "phone" as const, placeholder: "+91 98765 43210", required: true },
                    { label: "Email", field: "email" as const, placeholder: "email@example.com", required: false },
                    { label: "UPI ID", field: "upiId" as const, placeholder: "name@okhdfc", required: false },
                    { label: "Note", field: "note" as const, placeholder: "Any notes...", required: false },
                    { label: "Tags (comma-separated)", field: "tags" as const, placeholder: "VIP, Regular, New", required: false },
                  ].map(({ label, field, placeholder, required }) => (
                    <div key={field}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                      <input
                        value={custForm[field]}
                        onChange={e => setCustForm(f => ({...f, [field]: e.target.value}))}
                        placeholder={placeholder}
                        required={required}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ))}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowForm(false)}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold">
                      Cancel
                    </button>
                    <button type="submit" disabled={savingCustomer}
                      className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                      {savingCustomer ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      {savingCustomer ? "Saving..." : editingCustomer ? "Update" : "Add"}
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
