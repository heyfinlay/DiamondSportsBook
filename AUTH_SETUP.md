# Authentication Setup Guide

## ✅ What's Been Implemented

Your authentication system is now fully set up and ready to use!

### Files Created/Modified

**New Auth Files:**
- `src/lib/auth/SessionProvider.tsx` - Extended with signIn, signUp, signOut methods
- `src/lib/auth/usePermissions.ts` - Hook for role-based permissions
- `src/app/auth/LoginPage.tsx` - Beautiful login/signup page
- `src/lib/auth/ProtectedRoute.tsx` - Alternative protected route component
- `src/lib/auth/AuthContext.tsx` - Standalone auth context (not used, kept for reference)
- `scripts/create_dev_user.sql` - SQL script to grant permissions

**Modified Files:**
- `src/app/router.tsx` - Added `/login` route
- `src/app/components/ProtectedRoute.tsx` - Updated to redirect to `/login`

## 🚀 Quick Start

### Step 1: Start Your Dev Server

```bash
npm run dev
```

### Step 2: Sign Up

1. Navigate to `http://localhost:5173/login`
2. Click "Don't have an account? Sign up"
3. Enter your email and password (min 6 characters)
4. Check your email for confirmation link
5. Click the confirmation link
6. Go back to login page and sign in

### Step 3: Grant Yourself Permissions

After signing up and confirming your email, you need to grant yourself permissions via SQL:

**Option A: Using Docker (Easiest)**

```bash
# 1. Edit the script with your email
open scripts/create_dev_user.sql
# Change 'admin@example.com' to your actual email

# 2. Run the script
docker exec -i supabase_db_DiamondSportingBook psql -U postgres < scripts/create_dev_user.sql
```

**Option B: Via Supabase Studio**

1. Go to `http://localhost:54323` (Supabase Studio)
2. Go to SQL Editor
3. Run this query (replace with your email):

```sql
-- Find your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Grant race_control permission
INSERT INTO public.user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
  'race_control'
);

-- Grant super_admin permission (optional, for full access)
INSERT INTO public.user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
  'super_admin'
);
```

### Step 4: Test Your Access

1. Refresh your browser
2. Navigate to `/control/:sessionId` (race control - requires race_control role)
3. Navigate to `/admin` (admin dashboard - requires betting_admin or super_admin role)
4. If you see the page, you're authenticated! 🎉

## 🔐 How Auth Works

### Session Management

The `SessionProvider` wraps your entire app and provides:
- `user`: Current authenticated user object
- `session`: Supabase session with JWT tokens
- `loading`: Boolean indicating auth state loading
- `signIn(email, password)`: Sign in function
- `signUp(email, password)`: Sign up function
- `signOut()`: Sign out function

### Using Auth in Components

```typescript
import { useSession } from '@lib/auth/SessionProvider'

function MyComponent() {
  const { user, session, signOut } = useSession()

  if (!user) {
    return <div>Please log in</div>
  }

  return (
    <div>
      <p>Welcome, {user.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

### Role-Based Permissions

```typescript
import { usePermissions } from '@lib/auth/usePermissions'

function AdminPanel() {
  const { isRaceControl, isSuperAdmin, canManageRace } = usePermissions()

  if (!canManageRace) {
    return <div>Access Denied</div>
  }

  return <div>Admin content...</div>
}
```

Available permission hooks:
- `isRaceControl` - Can manage race sessions
- `isMarshal` - Can log laps
- `isBettingAdmin` - Can manage betting
- `isSuperAdmin` - Full access
- `canManageRace` - race_control OR super_admin
- `canLogLaps` - marshal OR race_control OR super_admin

### Protected Routes

Routes are automatically protected using the existing `ProtectedRoute` component:

```typescript
{
  element: <ProtectedRoute requiredRoles={["race_control", "super_admin"]} />,
  children: [
    {
      path: "control/:sessionId",
      element: <RaceControlPage />
    }
  ]
}
```

## 📊 Available Roles

Roles are defined in `user_roles` table:

| Role | Description | Access |
|------|-------------|--------|
| `race_control` | Race directors | Can create sessions, manage race state, log laps |
| `marshal` | Track marshals | Can log laps only |
| `betting_admin` | Betting administrators | Can manage betting markets, approve withdrawals |
| `super_admin` | System administrators | Full access to everything |
| `spectator` | Default role | Read-only access |

## 🔧 Database Schema

### `user_roles` Table

```sql
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);
```

### RPC: `has_permission(role)`

The RPCs use this helper function to check permissions:

```sql
CREATE OR REPLACE FUNCTION public.has_permission(required_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🎨 Login Page Features

- Beautiful gradient design matching your app theme
- Email/password authentication
- Toggle between sign in and sign up
- Error handling with clear messages
- Email confirmation flow
- Responsive design
- Redirect to original destination after login

## 🐛 Troubleshooting

### "Unauthorized" Error When Calling RPCs

**Problem:** Your user doesn't have the required role.

**Solution:** Run the `create_dev_user.sql` script or manually insert into `user_roles` table.

### Email Confirmation Not Working

**Problem:** Supabase local dev uses Inbucket for emails.

**Solution:**
1. Go to `http://localhost:54324` (Inbucket)
2. Find your confirmation email
3. Click the confirmation link

### Can't Access Protected Routes

**Problem:** Not authenticated or missing required role.

**Solution:**
1. Check you're logged in: Inspect `localStorage` for `supabase.auth.token`
2. Check your roles in database:
   ```sql
   SELECT * FROM user_roles WHERE user_id = auth.uid();
   ```

### RLS Blocking Queries

**Problem:** Row-level security preventing data access.

**Solution:** Ensure your role has the correct RLS policies. Check:
```sql
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

## 🚢 Deploying to Production

Before deploying:

1. **Set up OAuth providers** (optional):
   - Go to Supabase Dashboard → Authentication → Providers
   - Enable Google, GitHub, etc.
   - Update LoginPage to include OAuth buttons

2. **Configure email templates**:
   - Go to Authentication → Email Templates
   - Customize confirmation and reset password emails

3. **Set production URLs**:
   - Update site URL in Supabase settings
   - Update redirect URLs for OAuth

4. **Create initial admin user**:
   - Sign up via production UI
   - Use Supabase Dashboard SQL Editor to grant super_admin role

## 📝 Next Steps

Now that auth is set up, you can:

1. **Test the Timing RPCs** with authenticated requests
2. **Build the Race Control UI** - users can now access `/control/:sessionId`
3. **Add user profile page** - show email, roles, etc.
4. **Add sign out button** to the header
5. **Set up OAuth** for better UX (Google, GitHub, etc.)

## 🎉 You're Ready!

Your auth system is fully integrated with:
- ✅ Supabase Auth
- ✅ Role-based permissions
- ✅ Protected routes
- ✅ Database RLS policies
- ✅ Timing domain RPCs

Go ahead and start building your Race Control UI! ����
