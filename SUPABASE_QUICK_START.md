# Quick Start: Set Up Supabase for AgentFlow

This guide will help you set up a Supabase database so you can run through the signup flow and test the application.

## Prerequisites

- A Supabase account (free tier works fine)
- 5-10 minutes

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in or create an account
4. Click "New Project"
5. Fill in the details:
   - **Name**: AgentFlow (or whatever you prefer)
   - **Database Password**: Choose a strong password (save this!)
     - Minimum 12 characters recommended
     - Include uppercase, lowercase, numbers, and symbols
     - Example: `MyAgentFlow2024!@#`
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is fine for testing
6. Click "Create new project"
7. Wait 1-2 minutes for the project to initialize

## Step 2: Run the Database Setup SQL

1. In your Supabase project dashboard, click on **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file `/database/COMPLETE_SETUP.sql` from this repository
4. Copy the entire contents
5. Paste it into the SQL Editor
6. Click **Run** (or press Ctrl+Enter / Cmd+Enter)
7. Wait for the query to complete (should take 5-10 seconds)
8. You should see "Success. No rows returned" - this is correct!

## Step 3: Get Your API Credentials

1. In your Supabase project, click on **Settings** (gear icon) in the left sidebar
2. Click on **API** under Project Settings
3. You'll see several important values:

   **Project URL:**
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```
   
   **anon/public key:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....(very long string)
   ```
   
   **service_role key:** (click "Reveal" to see it)
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....(very long string)
   ```

4. Keep this tab open - you'll need these values in the next step

## Step 4: Configure Environment Variables

### For Frontend Only (Quickest Way)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Create a `.env.local` file:
   ```bash
   cp .env.example .env.local
   ```

3. Open `.env.local` in your editor and replace the placeholder values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
   ```

4. Save the file

### For Full Stack (If You Need Backend Too)

Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Edit `.env` and add:
```env
# Supabase
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....

# Frontend
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
```

## Step 5: Install Dependencies and Run

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to [http://localhost:3000](http://localhost:3000)

## Step 6: Test the Signup Flow

1. Navigate to [http://localhost:3000/signup](http://localhost:3000/signup)
2. You should see the signup form with NO warning banner
3. Fill out the form:
   - **Full Name**: Test User
   - **Email**: test@example.com
   - **Company Name**: Test Company (optional)
   - **Phone**: +1234567890 (optional)
   - **Password**: testpassword123
   - **Confirm Password**: testpassword123
4. Click "Create account"
5. If successful, you'll be redirected to the dashboard!

## Step 7: Verify in Supabase

1. Go back to your Supabase dashboard
2. Click **Authentication** in the left sidebar
3. Click **Users** tab
4. You should see your newly created user!
5. Click **Table Editor** in the left sidebar
6. Click the **users** table
7. You should see your user record with all the details you entered

## Troubleshooting

### "Configuration Required" Warning Banner

**Problem**: You see a warning banner saying database is not configured.

**Solution**: 
- Make sure your `.env.local` file exists in the `frontend` directory
- Verify the values don't contain the word "placeholder"
- Restart your dev server (`npm run dev`)

### "Failed to fetch" Error

**Problem**: You get a network error when submitting the form.

**Solution**:
- Check that your Supabase URL is correct (should end in `.supabase.co`)
- Verify your anon key is the full, long string
- Check your internet connection
- Make sure your Supabase project is active (not paused)

### "User already exists" Error

**Problem**: You already created a user with that email.

**Solution**:
- Try a different email address
- Or delete the user from Supabase:
  1. Go to Authentication → Users
  2. Click the user
  3. Click "Delete user"

### Invalid credentials

**Problem**: Wrong password or email.

**Solution**:
- Make sure password is at least 8 characters
- Check that passwords match
- Email must be valid format

## What's Next?

Now that you have Supabase set up, you can:

1. **Test the login flow**: Go to [http://localhost:3000/login](http://localhost:3000/login)
2. **Explore the dashboard**: See the user interface at [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
3. **Add more features**: Configure Twilio, Stripe, etc. (optional)
4. **Review the database**: Use Supabase Table Editor to see all tables

## Need Help?

- Check `ENVIRONMENT_SETUP.md` for more detailed configuration
- Check `SIGNUP_FIX_SUMMARY.md` for technical details about the signup fix
- Review the SQL schema in `/database/COMPLETE_SETUP.sql`

## Quick Reference

### Essential Environment Variables

```env
# Minimum required for signup/login
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Where to Find Values in Supabase

| Value | Location in Supabase Dashboard |
|-------|--------------------------------|
| Project URL | Settings → API → Project URL |
| anon/public key | Settings → API → Project API keys → anon/public |
| service_role key | Settings → API → Project API keys → service_role |

### Development Commands

```bash
# Install dependencies
cd frontend && npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Type check
npm run type-check

# Lint code
npm run lint
```

## Success! 🎉

Your Supabase database is now set up and you can run through the complete signup flow without any "Failed to fetch" errors!
