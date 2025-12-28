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
  walletBalanceUsd: number;
  lowBalanceThresholdUsd: number;
  lowBalanceNotifiedAt?: string;
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

// Wallet types
export interface WalletTransaction {
  id: string;
  userId: string;
  transactionType: 'deposit' | 'withdrawal' | 'refund' | 'adjustment';
  amountUsd: number;
  balanceBeforeUsd: number;
  balanceAfterUsd: number;
  description: string;
  metadata?: Record<string, any>;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  relatedCallId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  notes?: string;
  tags?: string[];
  promoCodeId?: string;
  isAutoReload?: boolean;
  receiptUrl?: string;
  receiptNumber?: string;
  createdAt: string;
}

export interface WalletTopUpOption {
  amount: number;
  label: string;
  popular?: boolean;
}

export const WALLET_TOPUP_OPTIONS: WalletTopUpOption[] = [
  { amount: 25, label: '$25' },
  { amount: 50, label: '$50', popular: true },
  { amount: 100, label: '$100' },
  { amount: 200, label: '$200' },
  { amount: 500, label: '$500' },
];

export const MIN_WALLET_BALANCE = 2.00; // Minimum balance required to make calls
export const DEFAULT_LOW_BALANCE_THRESHOLD = 20.00; // Default threshold for low balance warnings

// Payment Methods
export interface PaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  stripeCustomerId: string;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  billingName?: string;
  billingEmail?: string;
  billingAddress?: Record<string, any>;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Promo Codes
export interface PromoCode {
  id: string;
  code: string;
  description?: string;
  creditAmountUsd: number;
  maxUses?: number;
  currentUses: number;
  maxUsesPerUser: number;
  validFrom: string;
  validUntil?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCodeRedemption {
  id: string;
  promoCodeId: string;
  userId: string;
  transactionId?: string;
  creditAmountUsd: number;
  redeemedAt: string;
}

// Notification Preferences
export interface NotificationPreferences {
  id: string;
  userId: string;
  emailOnDeposit: boolean;
  emailOnWithdrawal: boolean;
  emailOnLowBalance: boolean;
  emailOnAutoReload: boolean;
  emailOnRefund: boolean;
  dailyDigestEnabled: boolean;
  weeklyDigestEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  userId: string;
  notificationType: string;
  channel: 'email' | 'sms' | 'push';
  sentTo: string;
  subject?: string;
  message?: string;
  status: 'sent' | 'failed' | 'pending';
  metadata?: Record<string, any>;
  sentAt: string;
}

// Spending Limits
export interface SpendingLimits {
  dailyLimitUsd?: number;
  weeklyLimitUsd?: number;
  monthlyLimitUsd?: number;
  enabled: boolean;
}

// Auto Reload Settings
export interface AutoReloadSettings {
  enabled: boolean;
  thresholdUsd: number;
  amountUsd: number;
  paymentMethodId?: string;
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

// Wallet helper functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function isLowBalance(balance: number, threshold: number = DEFAULT_LOW_BALANCE_THRESHOLD): boolean {
  return balance < threshold;
}

export function hasMinimumBalance(balance: number): boolean {
  return balance >= MIN_WALLET_BALANCE;
}

export function estimateCallsRemaining(walletBalance: number, avgCallCost: number = 1.50): number {
  if (avgCallCost === 0) return 0;
  return Math.floor(walletBalance / avgCallCost);
}

// ========================================
// SERVICE ARCHITECTURE TYPES
// ========================================

export interface Service {
  id: string;
  serviceKey: string;
  name: string;
  description?: string;
  icon?: string;
  category: 'core' | 'communication' | 'intelligence' | 'automation' | 'integration' | 'enterprise';
  tier: 'free' | 'standard' | 'premium' | 'enterprise';
  basePriceUsd: number;
  usageBased: boolean;
  usagePriceModel?: {
    type: 'per_call' | 'per_sms' | 'per_minute' | 'per_month';
    price: number;
  };
  version: string;
  isAvailable: boolean;
  isBeta: boolean;
  requiresServices?: string[];
  conflictsWith?: string[];
  configSchema?: Record<string, any>;
  defaultConfig?: Record<string, any>;
  setupInstructions?: string;
  documentationUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserService {
  id: string;
  userId: string;
  serviceId: string;
  enabled: boolean;
  enabledAt?: string;
  disabledAt?: string;
  config: Record<string, any>;
  lastUsedAt?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceUsageLog {
  id: string;
  userServiceId: string;
  userId: string;
  serviceId: string;
  usageType: string;
  quantity: number;
  costUsd: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface SMSMessage {
  id: string;
  userId: string;
  agentId?: string;
  twilioMessageSid?: string;
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  toNumber: string;
  body: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'received';
  errorMessage?: string;
  serviceKey?: string;
  relatedCallId?: string;
  inReplyTo?: string;
  conversationId?: string;
  isAutomated: boolean;
  templateUsed?: string;
  costUsd: number;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface SMSTemplate {
  id: string;
  userId: string;
  agentId?: string;
  name: string;
  serviceKey: string;
  messageTemplate: string;
  isActive: boolean;
  isDefault: boolean;
  availableVariables?: string[];
  createdAt: string;
  updatedAt: string;
}

// Service configuration types
export interface VoiceReceptionistConfig {
  voiceModel: 'Ara' | 'Eve' | 'Leo';
  systemPrompt: string;
  language?: string;
  enableRecording?: boolean;
}

export interface SMSAutoresponderConfig {
  autoReply: boolean;
  templateId?: string;
  aiPowered: boolean;
  responseDelay?: number; // seconds
  enabledHours?: string; // e.g., "9am-5pm" or "24/7"
}

export interface MissedCallResponderConfig {
  enabledHours: string; // e.g., "24/7" or "9am-5pm"
  templateId?: string;
  delaySeconds: number; // Wait before sending SMS
  maxAttemptsBeforeSMS?: number; // How many rings before considered "missed"
}

// Helper functions for services
export function isServiceEnabled(userServices: UserService[], serviceKey: string): boolean {
  return userServices.some(us =>
    us.enabled &&
    // Would need to join with services table to check serviceKey
    true
  );
}

export function getServiceConfig<T = Record<string, any>>(
  userServices: UserService[],
  serviceKey: string
): T | null {
  const userService = userServices.find(us => us.enabled);
  return userService ? (userService.config as T) : null;
}
