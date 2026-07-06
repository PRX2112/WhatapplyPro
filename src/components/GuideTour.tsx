import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight, Sparkles, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export interface TourStep {
  target?: string;
  title: string;
  content: string;
  tab?: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

interface GuideTourProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onClose: () => void;
}

export default function GuideTour({ activeTab, onNavigate, onClose }: GuideTourProps) {
  const { markGuideAsSeen } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const steps: TourStep[] = [
    {
      placement: "center",
      title: "Welcome to Whatapply! 🚀",
      content: "Let's take a quick 2-minute walkthrough to help you set up and make the most of your WhatsApp-powered business CRM.",
    },
    {
      tab: "dashboard",
      target: "[data-tour='dashboard-stats']",
      placement: "bottom",
      title: "Interactive Dashboard Overview",
      content: "Here you can monitor all your key metrics: total clients, active bookings, recent WhatsApp messages, and outstanding payments at a single glance.",
    },
    {
      tab: "dashboard",
      target: "[data-tour='booking-link-banner']",
      placement: "bottom",
      title: "Your Public Booking Link 🔗",
      content: "Share this unique link with your customers so they can self-book appointments without calling you. Copy it to WhatsApp, Instagram bio, or Google Business — instantly!",
    },
    {
      tab: "services",
      target: "[data-tour='add-service-btn']",
      placement: "bottom",
      title: "Define Your Offerings",
      content: "Set up the services, menu items, or products your business sells. Define prices and durations so clients can book appointments directly.",
    },
    {
      tab: "customers",
      target: "[data-tour='add-customer-btn']",
      placement: "bottom",
      title: "Clients & Khata — All in One",
      content: "Manage your customers and their payment ledger in one place. Add client details, then expand any row to record debit/credit entries, track outstanding dues, and send instant WhatsApp payment reminders.",
    },
    {
      tab: "bookings",
      target: "[data-tour='new-booking-btn']",
      placement: "bottom",
      title: "Confirm Appointments",
      content: "Schedule and confirm bookings or sessions. Whatapply automatically shoots confirmation alerts to customers on WhatsApp!",
    },
    {
      tab: "broadcasts",
      target: "[data-tour='launch-campaign-btn']",
      placement: "bottom",
      title: "Bulk WhatsApp Broadcasts",
      content: "Run targeted marketing campaigns or send payment alerts. Draft template messages using AI, and broadcast to specific customer tags.",
    },
    {
      tab: "sandbox",
      target: "[data-tour='chat-simulator-pane']",
      placement: "top",
      title: "WhatsApp Chat Simulator",
      content: "Simulate incoming WhatsApp queries from clients to test auto-reply triggers, flow templates, and AI chat actions safely.",
    },
    {
      tab: "settings",
      target: "[data-tour='settings-profile-section']",
      placement: "top",
      title: "Profile & WhatsApp Integrations",
      content: "Configure business details, link your UPI ID for quick scan payments, and plug in Meta WhatsApp API tokens to go live.",
    },
    {
      placement: "center",
      title: "You are Ready! 🎉",
      content: "You've successfully completed the setup guide. You can retake this Learning Guide anytime from the User profile menu at the top-right.",
    },
  ];


  // Listen to mobile breakpoint resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sync tab navigation if step requires it
  useEffect(() => {
    const step = steps[currentStep];
    if (step && step.tab && activeTab !== step.tab) {
      onNavigate(step.tab);
    }
  }, [currentStep]);

  // Position and highlight recalculation
  useEffect(() => {
    const step = steps[currentStep];
    if (!step) return;

    // Wait until tab active transition completes to avoid reading outdated rects
    if (step.tab && activeTab !== step.tab) {
      return;
    }

    const calcRect = () => {
      if (!step.target) {
        setTargetRect(null);
        return;
      }

      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        // Check if rect is visible
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
          return;
        }
      }

      // Fallback: try searching generic header elements on the view page
      const header = document.querySelector("main h2") || document.querySelector("main h1");
      if (header) {
        const rect = header.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      } else {
        setTargetRect(null);
      }
    };

    // Run layout calculation after a tiny timeout to ensure page components finished loading
    const timer = setTimeout(calcRect, 250);

    window.addEventListener("resize", calcRect);
    window.addEventListener("scroll", calcRect, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calcRect);
      window.removeEventListener("scroll", calcRect, true);
    };
  }, [currentStep, activeTab]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((c) => c + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((c) => c - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await markGuideAsSeen();
    } catch {}
    onClose();
  };

  const step = steps[currentStep];
  if (!step) return null;

  // Determine popover position variables
  const getPopoverStyle = () => {
    const popoverWidth = 320;
    const padding = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (isMobile || !targetRect || step.placement === "center") {
      return {
        position: "fixed" as const,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: isMobile ? "calc(100% - 32px)" : `${popoverWidth}px`,
        maxWidth: "400px",
      };
    }

    let top = 0;
    let left = 0;
    let transform = "";

    if (step.placement === "bottom") {
      left = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
      top = targetRect.top + targetRect.height + padding;
      left = Math.max(padding, Math.min(left, viewportWidth - popoverWidth - padding));
    } else if (step.placement === "top") {
      left = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
      top = targetRect.top - padding;
      transform = "translateY(-100%)";
      left = Math.max(padding, Math.min(left, viewportWidth - popoverWidth - padding));
    } else if (step.placement === "left") {
      left = targetRect.left - popoverWidth - padding;
      top = targetRect.top + targetRect.height / 2;
      transform = "translateY(-50%)";

      // If it overflows left side, flip to right side
      if (left < padding) {
        left = targetRect.left + targetRect.width + padding;
        // If it overflows right side too, center it
        if (left + popoverWidth > viewportWidth - padding) {
          left = viewportWidth / 2 - popoverWidth / 2;
        }
      }
    } else {
      // right
      left = targetRect.left + targetRect.width + padding;
      top = targetRect.top + targetRect.height / 2;
      transform = "translateY(-50%)";

      // If it overflows right side, flip to left side
      if (left + popoverWidth > viewportWidth - padding) {
        left = targetRect.left - popoverWidth - padding;
        // If it overflows left side too, center it
        if (left < padding) {
          left = viewportWidth / 2 - popoverWidth / 2;
        }
      }
    }

    // Secondary vertical bounds clamp to keep it visible on the screen
    if (step.placement === "left" || step.placement === "right") {
      const halfHeight = 110; 
      top = Math.max(halfHeight + padding, Math.min(top, viewportHeight - halfHeight - padding));
    } else if (step.placement === "bottom") {
      top = Math.min(top, viewportHeight - 200); 
      top = Math.max(padding, top);
    } else if (step.placement === "top") {
      top = Math.max(220, top); 
    }

    return {
      position: "fixed" as const,
      top: `${top}px`,
      left: `${left}px`,
      transform,
      width: `${popoverWidth}px`,
    };
  };

  const popoverStyle = getPopoverStyle();
  const hasTarget = !!targetRect && step.placement !== "center";
  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Background overlay — transparent so target stays crisp; darkening done by spotlight ring shadow */}
      <div 
        onClick={handleComplete} 
        className="absolute inset-0 bg-transparent transition-opacity duration-300"
      />

      {/* Spotlight highlight cut-out ring */}
      <AnimatePresence>
        {hasTarget && targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: 1,
              scale: 1,
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 210 }}
            className="fixed pointer-events-none rounded-xl border-[2.5px] border-emerald-400"
            style={{
              zIndex: 49,
              boxShadow: "0 0 0 9999px rgba(15,23,42,0.55), 0 0 18px rgba(16,185,129,0.6)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Popover dialog card */}
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        style={popoverStyle}
        className="bg-white border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
      >
        {/* Top colorful thin gradient accent */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />

        {/* Content Section */}
        <div className="p-5 flex-1 text-slate-800 text-left">
          {/* Header & Close Button */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-wide">
              <Sparkles size={13} className="text-emerald-500" />
              <span>System Journey</span>
            </div>
            <button 
              onClick={handleComplete} 
              className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
              title="Close Guide"
            >
              <X size={15} />
            </button>
          </div>

          <h3 className="font-extrabold text-slate-900 text-base leading-snug mb-1.5">
            {step.title}
          </h3>

          <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
            {step.content}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mb-5">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Footer Navigation Buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleComplete}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
            >
              Skip
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center justify-center p-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                  title="Back"
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <span>Finish</span>
                    <Check size={13} className="ml-0.5" />
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRight size={13} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
