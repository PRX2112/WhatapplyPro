import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import {
  LayoutDashboard, CalendarDays, Megaphone,
  Smartphone, Settings, Menu, X, Bell, Sparkles,
  MessageCircle, Users, Briefcase, LogOut, ChevronDown, Loader2, BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GuideTour from "./components/GuideTour";

import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage from "./components/auth/AuthPage";
import PublicBookingPage from "./components/PublicBookingPage";
import ToastContainer from "./components/shared/Toast";
import { useToast } from "./hooks/useToast";
import { getBusinessConfig } from "./lib/types";

// Lazy-load feature components
import DashboardOverview from "./components/DashboardOverview";
import PaymentLedger from "./components/PaymentLedger";
import BookingManager from "./components/BookingManager";
import BroadcastCampaigns from "./components/BroadcastCampaigns";
import SandboxChat from "./components/SandboxChat";
import SettingsTab from "./components/SettingsTab";
import ServiceCatalog from "./components/services/ServiceCatalog";

// Toast context for global access
interface ToastCtx { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void; warning: (m: string) => void; }
export const ToastContext = createContext<ToastCtx>({ success: () => {}, error: () => {}, info: () => {}, warning: () => {} });
export const useGlobalToast = () => useContext(ToastContext);

// ─── Dashboard Shell ──────────────────────────────────────────
function DashboardShell() {
  const { user, business, geminiLive, logout } = useAuth();
  const { toasts, toast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [guideRunning, setGuideRunning] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [userMenuOpen]);

  useEffect(() => {
    if (user && user.hasSeenGuide === false) {
      setGuideRunning(true);
    }
  }, [user]);

  const config = getBusinessConfig(business?.type || "general");

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "services", label: config.serviceLabel, icon: Briefcase },
    { id: "customers", label: `${config.customerLabel} & Khata`, icon: Users },
    { id: "bookings", label: config.bookingLabel, icon: CalendarDays },
    { id: "broadcasts", label: "Campaigns", icon: Megaphone },
    { id: "sandbox", label: "Chat Simulator", icon: Smartphone, badge: "Test" },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const navigate = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <ToastContext.Provider value={toast}>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased">

        {/* ── Top Header ───────────────────────────────────── */}
        <header className="bg-white border-b border-slate-100 px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                <MessageCircle size={16} className="text-white" />
              </div>
              <div>
                <span className="font-black text-slate-950 text-sm tracking-tight">Whatapply</span>
                <span className="ml-1.5 text-[9px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full border border-emerald-100 uppercase">Pro</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Gemini Status */}
            <div className="hidden sm:flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg text-xs">
              <Sparkles size={11} className={`${geminiLive ? "text-indigo-600 fill-indigo-600" : "text-slate-400"}`} />
              <span className="text-indigo-950 font-semibold">AI:</span>
              <span className={geminiLive ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                {geminiLive ? "Live" : "Simulated"}
              </span>
            </div>

            {/* Bell */}
            <button className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg transition-colors relative">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            </button>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1.5 rounded-lg transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-black">
                  {(user?.name || "U").charAt(0)}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</div>
                  <div className="text-[10px] text-slate-400 leading-tight">{business?.name}</div>
                </div>
                <ChevronDown size={13} className="text-slate-400 hidden md:block" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl w-52 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-800">{user?.name}</div>
                      <div className="text-[11px] text-slate-400">{user?.email}</div>
                      <div className="text-[10px] text-emerald-600 mt-0.5 font-semibold capitalize">{config.icon} {business?.type}</div>
                    </div>
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate("settings"); }}
                      className="w-full px-4 py-2.5 text-left text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Settings size={13} /> Settings
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate("dashboard"); setGuideRunning(true); }}
                      className="w-full px-4 py-2.5 text-left text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                    >
                      <BookOpen size={13} /> Learning Guide
                    </button>
                    <button
                      onClick={() => { logout(); }}
                      className="w-full px-4 py-2.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100"
                    >
                      <LogOut size={13} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="flex-1 flex relative">
          {/* ── Sidebar (desktop) ─────────────────────────────── */}
          <aside className="hidden md:flex flex-col w-56 bg-white border-r border-slate-100 p-3 shrink-0 select-none">
            <nav className="space-y-0.5 flex-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    data-tour={`nav-${item.id}`}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={15} className={active ? "text-emerald-700" : "text-slate-400"} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="bg-indigo-100 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="mt-4 pt-4 border-t border-slate-100 px-3">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-3 text-center">
                <div className="text-lg">{config.icon}</div>
                <div className="text-[10px] font-bold text-emerald-800 mt-1">{business?.name}</div>
                <div className="text-[9px] text-emerald-600 capitalize">{config.label}</div>
              </div>
            </div>
          </aside>

          {/* ── Mobile Sidebar ────────────────────────────────── */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="md:hidden fixed inset-0 bg-black z-30"
                />
                <motion.aside
                  initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="md:hidden fixed top-0 bottom-0 left-0 w-56 bg-white p-3 space-y-0.5 z-40 shadow-2xl"
                >
                  <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                    <span className="font-black text-slate-950 text-sm">Whatapply</span>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400">
                      <X size={18} />
                    </button>
                  </div>
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.id)}
                        data-tour={`nav-mobile-${item.id}`}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                          active ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <Icon size={15} className={active ? "text-emerald-700" : "text-slate-400"} />
                        {item.label}
                      </button>
                    );
                  })}
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* ── Main Content ────────────────────────────────────── */}
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === "dashboard" && (
                  <DashboardOverview
                    businessName={business?.name || ""}
                    businessType={business?.type || "general"}
                    slug={business?.slug || ""}
                    onNavigate={navigate}
                    toast={toast}
                  />
                )}
                {activeTab === "services" && (
                  <ServiceCatalog businessType={business?.type || "general"} toast={toast} />
                )}
                {activeTab === "customers" && (
                  <PaymentLedger
                    businessType={business?.type || "general"}
                    businessUpiId={business?.upiId || ""}
                    businessName={business?.name || ""}
                    toast={toast}
                  />
                )}
                {activeTab === "bookings" && (
                  <BookingManager
                    businessName={business?.name || ""}
                    businessType={business?.type || "general"}
                    toast={toast}
                  />
                )}

                {activeTab === "broadcasts" && (
                  <BroadcastCampaigns
                    businessType={business?.type || "general"}
                    toast={toast}
                  />
                )}
                {activeTab === "sandbox" && (
                  <SandboxChat
                    businessName={business?.name || ""}
                    businessType={business?.type || "general"}
                    toast={toast}
                  />
                )}
                {activeTab === "settings" && (
                  <SettingsTab geminiLive={geminiLive} toast={toast} />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {guideRunning && (
        <GuideTour
          activeTab={activeTab}
          onNavigate={navigate}
          onClose={() => setGuideRunning(false)}
        />
      )}
    </ToastContext.Provider>
  );
}

// ─── Root with Auth gate ──────────────────────────────────────
function AppInner() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Loading Whatapply...</p>
      </div>
    );
  }

  return user ? <DashboardShell /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/book/:slug" element={<PublicBookingPage />} />
          <Route path="*" element={<AppInner />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
