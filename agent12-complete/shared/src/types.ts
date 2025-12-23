// User and Agent types
export interface User {
  id: string;
  email: string;
  name: string;
  companyName?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  stripeCustomerId?: string;
  currentPlan: string;
  monthlyCallLimit: number;
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  industryTemplate?: 'dental' | 'hvac' | 'restaurant' | 'salon' | 'custom';
  phoneNumber?: string;
  systemPrompt: string;
  voiceModel: 'Ara' | 'Eve' | 'Leo';
  language: string;
  tools: AgentTool[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentTool {
  type: string;
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

// Call types
export interface Call {
  id: string;
  agentId: string;
  userId: string;
  twilioCallSid: string;
  fromNumber: string;
  toNumber: string;
  direction: 'inbound' | 'outbound';
  status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed';
  durationSeconds?: number;
  recordingUrl?: string;
  transcript?: string;
  costUsd: number;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
}

// Billing types
export interface BillingCycle {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  totalCalls: number;
  totalMinutes: number;
  platformFeeUsd: number;
  usageChargesUsd: number;
  totalAmountUsd: number;
  stripeInvoiceId?: string;
  status: 'pending' | 'paid' | 'failed';
  createdAt: string;
}

// Tool integration types
export interface ToolIntegration {
  id: string;
  agentId: string;
  toolType: 'google_calendar' | 'webhook' | 'stripe' | 'custom';
  config: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Pricing tiers
export interface PricingTier {
  minCalls: number;
  maxCalls?: number;
  pricePerCall: number;
  tierName: string;
}

export const PRICING_TIERS: PricingTier[] = [
  { minCalls: 0, maxCalls: 50, pricePerCall: 2.00, tierName: 'Starter' },
  { minCalls: 51, maxCalls: 150, pricePerCall: 1.50, tierName: 'Growth' },
  { minCalls: 151, maxCalls: 300, pricePerCall: 1.25, tierName: 'Scale' },
  { minCalls: 301, pricePerCall: 1.00, tierName: 'Enterprise' },
];

export const PLATFORM_FEE = 50.00; // $50/month base fee

// Industry templates
export interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  suggestedTools: AgentTool[];
  icon: string;
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'dental',
    name: 'Dental Office',
    description: 'Handle appointment booking, cancellations, and patient inquiries',
    systemPrompt: `You are a friendly dental office receptionist. Help patients schedule appointments, cancel existing appointments, answer questions about services, and provide office hours. Always be professional and empathetic.`,
    suggestedTools: [
      {
        type: 'google_calendar',
        name: 'schedule_appointment',
        description: 'Schedule or modify dental appointments',
      },
    ],
    icon: '🦷',
  },
  {
    id: 'hvac',
    name: 'HVAC Service',
    description: 'Schedule service calls, handle emergencies, and answer technical questions',
    systemPrompt: `You are an HVAC service dispatcher. Schedule service appointments, handle emergency calls, answer basic technical questions, and collect customer information. Prioritize emergency calls and communicate clearly about arrival times.`,
    suggestedTools: [
      {
        type: 'google_calendar',
        name: 'schedule_service',
        description: 'Schedule HVAC service appointments',
      },
    ],
    icon: '🌡️',
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'Take reservations, answer menu questions, and handle takeout orders',
    systemPrompt: `You are a restaurant host. Take reservations, answer questions about the menu and hours, handle takeout orders, and provide information about wait times. Be warm and welcoming.`,
    suggestedTools: [
      {
        type: 'google_calendar',
        name: 'make_reservation',
        description: 'Make or modify restaurant reservations',
      },
    ],
    icon: '🍽️',
  },
  {
    id: 'salon',
    name: 'Salon & Spa',
    description: 'Book appointments, answer service questions, and manage cancellations',
    systemPrompt: `You are a salon receptionist. Book appointments for various services, answer questions about treatments and pricing, handle cancellations and rescheduling. Be friendly and knowledgeable about beauty services.`,
    suggestedTools: [
      {
        type: 'google_calendar',
        name: 'book_appointment',
        description: 'Book salon appointments',
      },
    ],
    icon: '💇',
  },
  {
    id: 'custom',
    name: 'Custom Agent',
    description: 'Build your own voice agent from scratch',
    systemPrompt: `You are a helpful voice assistant. Assist callers with their inquiries professionally and courteously.`,
    suggestedTools: [],
    icon: '🤖',
  },
];

// Helper functions
export function calculateCallCost(callDurationMinutes: number): number {
  const grokCost = callDurationMinutes * 0.05; // $0.05/min
  const twilioCost = callDurationMinutes * 0.013; // ~$0.013/min
  return grokCost + twilioCost;
}

export function getPricingTier(callCount: number): PricingTier {
  return PRICING_TIERS.find(
    tier => callCount >= tier.minCalls && (!tier.maxCalls || callCount <= tier.maxCalls)
  ) || PRICING_TIERS[PRICING_TIERS.length - 1];
}

export function calculateMonthlyBill(callCount: number): number {
  const tier = getPricingTier(callCount);
  const usageCharges = callCount * tier.pricePerCall;
  return PLATFORM_FEE + usageCharges;
}
