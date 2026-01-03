# Environment Setup Guide

## Problem This Solves

Previously, when environment variables weren't set, the signup process would fail with a cryptic "Failed to fetch" error. This was because:

1. The app would build successfully with placeholder values
2. At runtime, it would try to connect to placeholder URLs like `https://placeholder.supabase.co`
3. This would result in fetch failures with unclear error messages

## Solution

We now have proper fallback handling with clear user-facing error messages:

### Build Time
- ✅ App builds successfully even without environment variables
- ✅ Uses placeholder values to allow compilation

### Runtime
- ✅ Detects when placeholders are being used
- ✅ Shows clear configuration warnings on signup/login pages
- ✅ Prevents failed fetch attempts with helpful error messages
- ✅ Disables forms when configuration is missing

## Quick Start

### 1. Copy the environment file

For frontend-only development:
```bash
cd frontend
cp .env.example .env.local
```

For full stack:
```bash
cp .env.example .env
cd frontend
cp .env.example .env.local
```

### 2. Get your Supabase credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Anon/Public key

### 3. Update your .env.local

```bash
# Required for signup/login to work
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
```

### 4. Start the development server

```bash
cd frontend
npm run dev
```

Visit http://localhost:3000/signup and you should now see either:
- ✅ Working signup form (if configured correctly)
- ⚠️ Configuration warning (if env vars missing/invalid)

## Testing the Fix

### Without Environment Variables

1. Remove or rename your `.env.local` file:
   ```bash
   cd frontend
   mv .env.local .env.local.backup
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```

3. Visit http://localhost:3000/signup

4. You should see:
   - ⚠️ A warning banner at the top saying "Configuration Required"
   - Form fields are disabled
   - Clear message about missing environment variables
   - No "Failed to fetch" errors

### With Valid Environment Variables

1. Restore your `.env.local`:
   ```bash
   cd frontend
   mv .env.local.backup .env.local
   ```

2. Ensure it has valid Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Restart the dev server:
   ```bash
   npm run dev
   ```

4. Visit http://localhost:3000/signup

5. You should see:
   - ✅ No warning banner
   - Form fields are enabled
   - Signup works normally

## What Changed

### 1. Environment Variable Module (`frontend/src/lib/env.ts`)
- Added `isConfigured` getter to detect placeholder values
- Checks if URLs contain "placeholder" or are valid Supabase URLs

### 2. Supabase Client (`frontend/src/lib/supabase/client.ts`)
- Added `isSupabaseConfigured()` helper
- Added `getSupabaseConfigError()` for user-friendly error messages
- Shows warning in console when not configured

### 3. Auth Functions (`frontend/src/lib/auth.ts`)
- Pre-flight configuration check before signup/signin
- Throws clear error message instead of letting fetch fail

### 4. Signup/Login Pages
- Check configuration on mount
- Show warning banner when not configured
- Disable form fields when configuration missing
- Better error message handling for fetch failures

## Environment Variables Reference

### Required (for authentication)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Optional (for additional features)
```env
# Payment features
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Real-time features
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080

# App URL (for webhooks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Troubleshooting

### Still seeing "Failed to fetch"?
- Make sure you've restarted the dev server after updating `.env.local`
- Check that your Supabase URL is valid and accessible
- Verify your anon key is correct

### Warning banner won't go away?
- Check that your `.env.local` doesn't have placeholder values
- Ensure the variables start with `NEXT_PUBLIC_`
- Restart the dev server

### Build fails?
- This shouldn't happen anymore - builds should succeed without env vars
- If it does fail, check for syntax errors in your `.env.local`
- Make sure you're using the correct variable names

## Production Deployment

For production, set these environment variables in your hosting platform:

- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Build & Deploy → Environment
- **Railway**: Variables tab
- **Render**: Environment tab

The app will:
1. Build successfully (uses placeholders)
2. At runtime, check for valid configuration
3. Show clear errors if missing
4. Work normally if configured

## Documentation Updates

See also:
- `.env.example` - Comprehensive list of all variables
- `ENV_VAR_BUILD_STRATEGY.md` - Technical details about the fallback strategy
- `REDUNDANCY_FALLBACK_STRATEGY.md` - Information about service redundancy
