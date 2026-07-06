import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Megaphone, Plus, Loader2, Sparkles, Trash2, X, Check, Send, Users, BarChart2 } from "lucide-react";
import api from "../lib/api";
import type { Template, Campaign } from "../lib/types";
import { getBusinessConfig } from "../lib/types";

interface Props {
  businessType: string;
  toast: { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void };
}

export default function BroadcastCampaigns({ businessType, toast }: Props) {
  const config = getBusinessConfig(businessType);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const [tmplForm, setTmplForm] = useState({ name: "", category: "MARKETING", bodyText: "", aiPrompt: "" });
  const [campForm, setCampForm] = useState({ templateId: "", name: "", targetGroup: "All Customers", minBalance: "" });

  const load = async () => {
    try {
      const [t, c] = await Promise.all([api.templates.list(), api.campaigns.list()]);
      setTemplates(t);
      setCampaigns(c);
    } catch { toast.error("Failed to load campaigns"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAiGenerate = async () => {
    if (!tmplForm.aiPrompt.trim()) { toast.error("Enter an AI prompt first"); return; }
    setAiGenerating(true);
    try {
      const result = await api.ai.generateTemplate({
        prompt: tmplForm.aiPrompt,
        businessType: config.label,
        category: tmplForm.category,
      });
      setTmplForm(f => ({ ...f, name: result.templateName || f.name, bodyText: result.bodyText, category: result.category || f.category }));
      toast.success("AI generated template! Review and save.");
    } catch (e: any) { toast.error(e.message); }
    finally { setAiGenerating(false); }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.templates.save({ id: editingTemplate?.id, name: tmplForm.name, category: tmplForm.category as any, bodyText: tmplForm.bodyText });
      toast.success(editingTemplate ? "Template updated!" : "Template created!");
      setShowTemplateForm(false);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try { await api.templates.delete(id); toast.success("Template deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campForm.templateId) { toast.error("Select a template"); return; }
    setSending(true);
    try {
      const result = await api.campaigns.send({
        templateId: campForm.templateId,
        name: campForm.name,
        targetGroup: campForm.targetGroup,
        minBalance: campForm.minBalance ? parseFloat(campForm.minBalance) : undefined,
      });
      toast.success(`Campaign sent to ${result.recipientsCount} recipients!`);
      setShowCampaignForm(false);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Broadcast Campaigns</h2>
          <p className="text-sm text-slate-500 mt-0.5">Create templates with AI, launch bulk WhatsApp campaigns</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditingTemplate(null); setTmplForm({ name: "", category: "MARKETING", bodyText: "", aiPrompt: "" }); setShowTemplateForm(true); }}
            data-tour="create-template-btn"
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">
            <Plus size={14} /> Template
          </button>
          <button onClick={() => setShowCampaignForm(true)}
            data-tour="launch-campaign-btn"
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700">
            <Send size={14} /> Send Campaign
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Templates */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Message Templates ({templates.length})</h3>
            <div className="space-y-3">
              {templates.map(t => (
                <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{t.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${t.category === "MARKETING" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                          {t.category}
                        </span>
                      </div>
                      {t.placeholders.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {t.placeholders.map(p => (
                            <span key={p} className="text-[10px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-mono">{`{{${p}}}`}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditingTemplate(t); setTmplForm({ name: t.name, category: t.category, bodyText: t.bodyText, aiPrompt: "" }); setShowTemplateForm(true); }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                        <Sparkles size={13} className="text-indigo-500" />
                      </button>
                      <button onClick={() => handleDeleteTemplate(t.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    {t.bodyText.slice(0, 120)}{t.bodyText.length > 120 ? "..." : ""}
                  </p>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <p className="text-sm">No templates yet</p>
                  <button onClick={() => setShowTemplateForm(true)} className="mt-2 text-xs text-emerald-700 font-semibold">
                    + Create first template
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Campaign History */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Campaign History ({campaigns.length})</h3>
            <div className="space-y-3">
              {campaigns.map(c => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{c.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {new Date(c.sentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Users size={12} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-700">{c.recipientsCount}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Sent", val: c.stats.sent, color: "text-slate-700" },
                      { label: "Delivered", val: c.stats.delivered, color: "text-blue-600" },
                      { label: "Read", val: c.stats.read, color: "text-emerald-600" },
                      { label: "Failed", val: c.stats.failed, color: "text-red-500" },
                    ].map(s => (
                      <div key={s.label} className="text-center bg-slate-50 rounded-lg py-1.5">
                        <div className={`text-base font-black ${s.color}`}>{s.val}</div>
                        <div className="text-[9px] text-slate-400 font-semibold">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <Megaphone size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No campaigns sent yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Template Form Modal */}
      <AnimatePresence>
        {showTemplateForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowTemplateForm(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-slate-900">{editingTemplate ? "Edit Template" : "New Template"}</h3>
                  <button onClick={() => setShowTemplateForm(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} className="text-slate-500" /></button>
                </div>

                {/* AI Copilot */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-800">Gemini AI Copilot</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={tmplForm.aiPrompt}
                      onChange={e => setTmplForm(f => ({...f, aiPrompt: e.target.value}))}
                      placeholder='e.g. "Write a Diwali offer for 20% discount"'
                      className="flex-1 px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      type="button" onClick={handleAiGenerate} disabled={aiGenerating}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1"
                    >
                      {aiGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      {aiGenerating ? "..." : "Generate"}
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveTemplate} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Template Name</label>
                      <input value={tmplForm.name} onChange={e => setTmplForm(f => ({...f, name: e.target.value}))}
                        required placeholder="payment_reminder"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                      <select value={tmplForm.category} onChange={e => setTmplForm(f => ({...f, category: e.target.value}))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white">
                        <option value="MARKETING">MARKETING</option>
                        <option value="UTILITY">UTILITY</option>
                        <option value="AUTHENTICATION">AUTHENTICATION</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Message Body</label>
                    <textarea
                      value={tmplForm.bodyText} onChange={e => setTmplForm(f => ({...f, bodyText: e.target.value}))}
                      required rows={5} placeholder="Hello {{customer_name}}, ..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none font-mono"
                    />
                    <p className="text-xs text-slate-400 mt-1">Use {"{{placeholder}}"} syntax for variables</p>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowTemplateForm(false)}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold">Cancel</button>
                    <button type="submit" className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                      <Check size={14} /> {editingTemplate ? "Update" : "Create Template"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Campaign Launch Modal */}
      <AnimatePresence>
        {showCampaignForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowCampaignForm(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-slate-900">Launch Campaign</h3>
                  <button onClick={() => setShowCampaignForm(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} className="text-slate-500" /></button>
                </div>
                <form onSubmit={handleSendCampaign} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Campaign Name</label>
                    <input value={campForm.name} onChange={e => setCampForm(f => ({...f, name: e.target.value}))}
                      required placeholder="e.g. Diwali Special 2024"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Template *</label>
                    <select value={campForm.templateId} onChange={e => setCampForm(f => ({...f, templateId: e.target.value}))}
                      required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white">
                      <option value="">Select template...</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Target Group</label>
                    <select value={campForm.targetGroup} onChange={e => setCampForm(f => ({...f, targetGroup: e.target.value}))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white">
                      <option value="All Customers">All Customers</option>
                      <option value="Customers with Outstanding Balance">Customers with Outstanding Balance</option>
                    </select>
                  </div>
                  {campForm.targetGroup.includes("Outstanding") && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Minimum Balance (₹)</label>
                      <input type="number" min="0" value={campForm.minBalance} onChange={e => setCampForm(f => ({...f, minBalance: e.target.value}))}
                        placeholder="0 for all with any balance"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                    </div>
                  )}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-800">⚡ This will send a WhatsApp message to all matching customers immediately.</p>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowCampaignForm(false)}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold">Cancel</button>
                    <button type="submit" disabled={sending}
                      className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                      {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      {sending ? "Sending..." : "Launch Campaign"}
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
