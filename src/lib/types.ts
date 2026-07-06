// ─── Auth ─────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "staff";
  hasSeenGuide?: boolean;
}

export interface Business {
  id: string;
  name: string;
  type: string;
  slug?: string;
  upiId?: string;
  waPhoneId?: string;
  waAccessToken?: string;
  waWabaId?: string;
  waMode: "sandbox" | "production";
  timezone?: string;
}

export interface AuthState {
  user: AuthUser | null;
  business: Business | null;
  token: string | null;
  loading: boolean;
}

// ─── Customer ─────────────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  upiId?: string;
  note?: string;
  tags: string[];
  outstandingAmount: number;
  createdAt: string;
  updatedAt?: string;
}

// ─── Service (generic catalog) ────────────────────────────────
export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMin: number;
  category?: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Booking ──────────────────────────────────────────────────
export interface Booking {
  id: string;
  customerId?: string;
  serviceId?: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  price: number;
  dateTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes?: string;
  staffName?: string;
  createdAt: string;
  updatedAt?: string;
}

// ─── Ledger ───────────────────────────────────────────────────
export interface LedgerEntry {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  type: "debit" | "credit";
  amount: number;
  description?: string;
  createdAt: string;
}

// ─── WhatsApp Templates ───────────────────────────────────────
export interface Template {
  id: string;
  name: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  language: string;
  bodyText: string;
  placeholders: string[];
  status: "APPROVED" | "PENDING" | "REJECTED";
  createdAt?: string;
}

// ─── Campaigns ────────────────────────────────────────────────
export interface Campaign {
  id: string;
  templateId?: string;
  templateName?: string;
  name: string;
  targetGroup: string;
  recipientsCount: number;
  sentAt: string;
  stats: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

// ─── Messages ─────────────────────────────────────────────────
export interface SandboxMessage {
  id: string;
  direction: "incoming" | "outgoing";
  from: string;
  to: string;
  text: string;
  isAutoResponse?: boolean;
  status?: string;
  timestamp: string;
}

// ─── Dashboard Stats ──────────────────────────────────────────
export interface DashboardStats {
  totalCustomers: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  messagesLast30Days: number;
  totalRevenue: number;
  totalOutstanding: number;
  totalCampaigns: number;
}

// ─── Business type config ─────────────────────────────────────
export type BusinessType = 
  | "salon" | "spa" | "restaurant" | "cafe" | "gym" | "fitness"
  | "clinic" | "hospital" | "shop" | "retail" | "freelancer" | "general";

export interface BusinessTypeConfig {
  label: string;
  icon: string;
  customerLabel: string;
  bookingLabel: string;
  serviceLabel: string;
}

export const BUSINESS_TYPE_CONFIG: Record<string, BusinessTypeConfig> = {
  salon: { label: "Salon / Parlour", icon: "✂️", customerLabel: "Clients", bookingLabel: "Appointments", serviceLabel: "Services" },
  spa: { label: "Spa & Wellness", icon: "🧖", customerLabel: "Guests", bookingLabel: "Sessions", serviceLabel: "Treatments" },
  restaurant: { label: "Restaurant / Cafe", icon: "🍽️", customerLabel: "Guests", bookingLabel: "Reservations", serviceLabel: "Menu Items" },
  cafe: { label: "Cafe", icon: "☕", customerLabel: "Customers", bookingLabel: "Reservations", serviceLabel: "Menu" },
  gym: { label: "Gym / Fitness", icon: "🏋️", customerLabel: "Members", bookingLabel: "Sessions", serviceLabel: "Plans" },
  fitness: { label: "Fitness Studio", icon: "💪", customerLabel: "Members", bookingLabel: "Classes", serviceLabel: "Programs" },
  clinic: { label: "Clinic / Hospital", icon: "🏥", customerLabel: "Patients", bookingLabel: "Appointments", serviceLabel: "Procedures" },
  hospital: { label: "Hospital", icon: "🏨", customerLabel: "Patients", bookingLabel: "Appointments", serviceLabel: "Services" },
  shop: { label: "Shop / Retail", icon: "🛒", customerLabel: "Customers", bookingLabel: "Orders", serviceLabel: "Products" },
  retail: { label: "Retail Store", icon: "🏪", customerLabel: "Customers", bookingLabel: "Orders", serviceLabel: "Products" },
  freelancer: { label: "Freelancer", icon: "💼", customerLabel: "Clients", bookingLabel: "Projects", serviceLabel: "Services" },
  general: { label: "General Business", icon: "🏢", customerLabel: "Customers", bookingLabel: "Bookings", serviceLabel: "Services" },
};

export function getBusinessConfig(type: string): BusinessTypeConfig {
  return BUSINESS_TYPE_CONFIG[type] || BUSINESS_TYPE_CONFIG.general;
}
