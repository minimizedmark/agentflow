/**
 * Environment Variable Configuration
 *
 * This module provides safe access to environment variables that:
 * 1. Allows builds to succeed without all env vars present
 * 2. Provides fallback values for build time
 * 3. Validates env vars at runtime (not build time)
 * 4. Clear error messages when vars are missing in production
 */

// Type-safe environment variable getter
function getEnvVar(
  key: string,
  options: {
    fallback?: string;
    required?: boolean;
    buildTimeSafe?: boolean;
  } = {}
): string {
  const {
    fallback = '',
    required = false,
    buildTimeSafe = true
  } = options;

  const value = process.env[key];

  // During build, return fallback to allow build to succeed
  if (buildTimeSafe && !value && process.env.NODE_ENV === undefined) {
    return fallback;
  }

  // At runtime, enforce required vars
  if (required && !value) {
    // Only throw in production, warn in development
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${key}`);
    } else {
      console.warn(`Warning: Missing environment variable: ${key}`);
      return fallback;
    }
  }

  return value || fallback;
}

// Check if we're in a build environment
export const isBuildTime = typeof window === 'undefined' && !process.env.NODE_ENV;

// Supabase Configuration
export const supabaseConfig = {
  url: getEnvVar('NEXT_PUBLIC_SUPABASE_URL', {
    fallback: 'https://placeholder.supabase.co',
    buildTimeSafe: true
  }),
  anonKey: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', {
    fallback: 'placeholder-anon-key',
    buildTimeSafe: true
  }),
  serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY', {
    fallback: '',
    required: false, // Only needed server-side
    buildTimeSafe: true
  }),
  // Check if we're using placeholder values (not configured)
  get isConfigured() {
    // Check if we're using placeholder values
    const hasPlaceholderUrl = this.url.includes('placeholder');
    const hasPlaceholderKey = this.anonKey.includes('placeholder');
    
    // Check if the values look valid (not empty and not just the placeholder)
    const hasValidUrl = this.url && this.url.length > 10 && !hasPlaceholderUrl;
    const hasValidKey = this.anonKey && this.anonKey.length > 10 && !hasPlaceholderKey;
    
    return hasValidUrl && hasValidKey;
  }
};

// Stripe Configuration
export const stripeConfig = {
  publishableKey: getEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', {
    fallback: 'pk_test_placeholder',
    buildTimeSafe: true
  }),
  secretKey: getEnvVar('STRIPE_SECRET_KEY', {
    fallback: '',
    required: false, // Only needed server-side
    buildTimeSafe: true
  }),
  webhookSecret: getEnvVar('STRIPE_WEBHOOK_SECRET', {
    fallback: '',
    required: false,
    buildTimeSafe: true
  })
};

// API URLs
export const apiConfig = {
  appUrl: getEnvVar('NEXT_PUBLIC_APP_URL', {
    fallback: 'http://localhost:3000',
    buildTimeSafe: true
  }),
  websocketUrl: getEnvVar('NEXT_PUBLIC_WEBSOCKET_URL', {
    fallback: 'ws://localhost:8080',
    buildTimeSafe: true
  })
};

// Feature flags
export const features = {
  // Enable/disable features based on env vars
  enablePayments: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  enableWebsocket: !!process.env.NEXT_PUBLIC_WEBSOCKET_URL,
};

/**
 * Validate runtime environment variables
 * Call this on app initialization (not at build time)
 */
export function validateRuntimeEnv(): { valid: boolean; missing: string[] } {
  // Skip validation during build
  if (isBuildTime) {
    return { valid: true, missing: [] };
  }

  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    console.error('Missing required environment variables:', missing);
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Get environment info for debugging
 */
export function getEnvInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    isBuild: isBuildTime,
    hasSupabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasStripe: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    hasWebsocket: !!process.env.NEXT_PUBLIC_WEBSOCKET_URL,
  };
}

/**
 * Create Supabase admin client (lazy)
 * Use this for server-side API routes that need service role access
 */
export function createSupabaseAdmin() {
  // Only import at runtime, not at build time
  const { createClient } = require('@supabase/supabase-js');

  return createClient(
    supabaseConfig.url,
    supabaseConfig.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Create Stripe client (lazy)
 * Use this for server-side API routes that need Stripe access
 */
export function createStripeClient() {
  // Only import at runtime, not at build time
  const Stripe = require('stripe');

  return new Stripe(stripeConfig.secretKey, {
    apiVersion: '2024-06-20',
  });
}

export default {
  supabase: supabaseConfig,
  stripe: stripeConfig,
  api: apiConfig,
  features,
  validate: validateRuntimeEnv,
  info: getEnvInfo,
  createSupabaseAdmin,
  createStripeClient,
};
