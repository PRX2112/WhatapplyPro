import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Save, Loader2, Building2, Smartphone, Key, Link, CheckCircle, Sparkles, AlertCircle } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { BUSINESS_TYPE_CONFIG } from "../lib/types";

interface Props {
  geminiLive: boolean;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

const BIZ_TYPES = Object.entries(BUSINESS_TYPE_CONFIG);

export default function SettingsTab({ geminiLive, toast }: Props) {
  const { business, refreshBusiness } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "general",
    upiId: "",
    waPhoneId: "",
    waAccessToken: "",
    waWabaId: "",
    waMode: "sandbox" as "sandbox" | "production",
  });

  useEffect(() => {
    refreshBusiness();
  }, [refreshBusiness]);

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name || "",
        type: business.type || "general",
        upiId: business.upiId || "",
        waPhoneId: business.waPhoneId || "",
        waAccessToken: business.waAccessToken || "",
        waWabaId: business.waWabaId || "",
        waMode: (business.waMode as any) || "sandbox",
      });
    }
  }, [business]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.business.update({
        name: form.name,
        type: form.type,
        upiId: form.upiId || null,
        waPhoneId: form.waPhoneId || null,
        waAccessToken: form.waAccessToken || null,
        waWabaId: form.waWabaId || null,
        waMode: form.waMode,
      });
      await refreshBusiness();
      toast.success("Settings saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const isSandbox = form.waMode === "sandbox";

  const bookingUrl = `${window.location.origin}/book/${business?.slug || ""}`;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Integration Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Configure your business profile and WhatsApp API connection</p>
      </div>

      {business?.slug && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Link size={16} className="text-emerald-700" />
            <h3 className="font-bold text-emerald-950 text-sm">Your Public Booking Page</h3>
          </div>
          <p className="text-xs text-emerald-800">
            Share this link with your customers to let them book sessions or appointments directly.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={bookingUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(bookingUrl);
                toast.success("Booking link copied to clipboard!");
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              Copy Link
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Profile */}
        <div data-tour="settings-profile-section" className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={16} className="text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Business Profile</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Business Name</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({...f, name: e.target.value}))}
              required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Business Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BIZ_TYPES.map(([val, cfg]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(f => ({...f, type: val}))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left ${
                    form.type === val
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span>{cfg.icon}</span>
                  <span className="truncate">{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Business UPI ID</label>
            <input
              value={form.upiId}
              onChange={e => setForm(f => ({...f, upiId: e.target.value}))}
              placeholder="yourbusiness@okhdfc"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-slate-400 mt-1">Used for UPI payment links in reminders & ledger</p>
          </div>
        </div>

        {/* WhatsApp Integration */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Smartphone size={16} className="text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">WhatsApp Integration</h3>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            {(["sandbox", "production"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setForm(f => ({...f, waMode: m}))}
                className={`flex-1 py-2.5 text-xs font-bold transition-all ${
                  form.waMode === m
                    ? m === "sandbox"
                      ? "bg-indigo-600 text-white"
                      : "bg-emerald-600 text-white"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {m === "sandbox" ? "🧪 Sandbox (Test)" : "🚀 Production (Live)"}
              </button>
            ))}
          </div>

          {isSandbox ? (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle size={15} className="text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-indigo-800">Sandbox Mode Active</p>
                  <p className="text-xs text-indigo-600 mt-0.5">
                    Messages are simulated and logged in the Chat Simulator tab. No real WhatsApp credentials needed.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">
                    Production mode sends real WhatsApp messages via the Meta Business API. Requires a verified Meta Business Account.
                  </p>
                </div>
              </div>

              {[
                { label: "WhatsApp Phone Number ID", field: "waPhoneId" as const, placeholder: "12345678901234" },
                { label: "Access Token", field: "waAccessToken" as const, placeholder: "EAAG..." },
                { label: "WABA ID", field: "waWabaId" as const, placeholder: "987654321098765" },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
                  <div className="relative">
                    <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form[field]}
                      onChange={e => setForm(f => ({...f, [field]: e.target.value}))}
                      placeholder={placeholder}
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gemini AI Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Gemini AI Copilot</h3>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
            geminiLive
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-amber-50 border border-amber-200 text-amber-800"
          }`}>
            <span className={`w-2 h-2 rounded-full ${geminiLive ? "bg-emerald-500" : "bg-amber-500"}`} />
            {geminiLive ? "AI Live — Gemini 2.0 Flash connected" : "Simulated Mode — Set GEMINI_API_KEY in .env to enable"}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
