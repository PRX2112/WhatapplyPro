import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Smartphone, Send, Trash2, Loader2, User, ChevronDown } from "lucide-react";
import api from "../lib/api";
import type { Customer, SandboxMessage } from "../lib/types";
import { getBusinessConfig } from "../lib/types";
import { format } from "date-fns";

interface Props {
  businessName: string;
  businessType: string;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

const QUICK_REPLIES = ["Hi", "SERVICES", "BOOK", "BAL", "CANCEL"];

export default function SandboxChat({ businessName, businessType, toast }: Props) {
  const config = getBusinessConfig(businessType);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [messages, setMessages] = useState<SandboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const [c, m] = await Promise.all([api.customers.list(), api.sandbox.messages()]);
      setCustomers(c);
      setMessages(m);
      if (c.length > 0 && !selectedCustomer) setSelectedCustomer(c[0]);
    } catch { toast.error("Failed to load chat"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredMessages = selectedCustomer
    ? messages.filter(m =>
        m.from === selectedCustomer.phone || m.to === selectedCustomer.phone ||
        m.from.replace(/\s/g, "") === selectedCustomer.phone.replace(/\s/g, "") ||
        m.to.replace(/\s/g, "") === selectedCustomer.phone.replace(/\s/g, "")
      )
    : messages;

  const handleSend = async (text?: string) => {
    const msg = text || inputText.trim();
    if (!msg || !selectedCustomer) return;
    setSending(true);
    setInputText("");
    try {
      const result = await api.sandbox.incoming({ phone: selectedCustomer.phone, text: msg });
      setMessages(result.messages);
    } catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  };

  const handleClear = async () => {
    if (!confirm("Clear all sandbox messages?")) return;
    try {
      await api.sandbox.clear();
      setMessages([]);
      toast.success("Sandbox cleared");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">WhatsApp Chat Simulator</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Simulate customer messages and test your auto-reply bot
          </p>
        </div>
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
        >
          <Trash2 size={13} /> Clear Chat
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        {/* Customer List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">{config.customerLabel}</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="animate-spin mr-2" size={16} />
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No customers yet. Add some in the Customers tab.
              </div>
            ) : (
              customers.map(c => {
                const custMessages = messages.filter(m =>
                  m.from === c.phone || m.to === c.phone ||
                  m.from.replace(/\s/g, "") === c.phone.replace(/\s/g, "")
                );
                const last = custMessages[custMessages.length - 1];
                const active = selectedCustomer?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-100 last:border-0 transition-colors ${
                      active ? "bg-emerald-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                      {last && (
                        <div className="text-xs text-slate-400 truncate">
                          {last.direction === "outgoing" ? "← " : "→ "}{last.text.slice(0, 30)}...
                        </div>
                      )}
                    </div>
                    {custMessages.length > 0 && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                        {custMessages.length}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div data-tour="chat-simulator-pane" className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-slate-100 bg-emerald-600 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Smartphone size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{selectedCustomer?.name || "Select a customer"}</div>
              <div className="text-[11px] text-emerald-100">{selectedCustomer?.phone || businessName}</div>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-emerald-100 font-medium">Sandbox Mode</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50"
            style={{ backgroundImage: "radial-gradient(circle, #e2e8f0 1px, transparent 1px)", backgroundSize: "20px 20px" }}
          >
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Smartphone size={36} className="mb-3 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">Send a message to test the bot</p>
                <p className="text-xs text-slate-400 mt-1">Try: Hi, SERVICES, BOOK, or BAL</p>
              </div>
            ) : (
              filteredMessages.map(msg => {
                const isIncoming = msg.direction === "incoming";
                return (
                  <div key={msg.id} className={`flex ${isIncoming ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                        isIncoming
                          ? "bg-white text-slate-800 rounded-tl-sm"
                          : msg.isAutoResponse
                            ? "bg-emerald-600 text-white rounded-tr-sm"
                            : "bg-emerald-700 text-white rounded-tr-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{msg.text}</p>
                      <div className={`text-[10px] mt-1 ${isIncoming ? "text-slate-400" : "text-emerald-200"} text-right`}>
                        {format(new Date(msg.timestamp), "h:mm a")}
                        {msg.isAutoResponse && !isIncoming && <span className="ml-1">🤖</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          <div className="px-4 pt-2 flex gap-2 flex-wrap">
            {QUICK_REPLIES.map(r => (
              <button
                key={r}
                onClick={() => handleSend(r)}
                disabled={!selectedCustomer || sending}
                className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-full hover:bg-emerald-100 disabled:opacity-50 transition-colors"
              >
                {r}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-100 flex gap-2">
            <input
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={selectedCustomer ? `Message as ${selectedCustomer.name}...` : "Select a customer first"}
              disabled={!selectedCustomer || sending}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-full text-sm focus:outline-none focus:border-emerald-400 disabled:bg-slate-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || !selectedCustomer || sending}
              className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 transition-colors shrink-0"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
