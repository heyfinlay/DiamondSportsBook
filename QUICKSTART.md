# 🏁 Quick Start Guide

## ✅ What's Ready

1. **Timing Domain V2** - Complete database schema, RPCs, and RLS
2. **Authentication System** - Login/signup with role-based permissions
3. **Dev Environment** - Local Supabase running with all migrations

## 🚀 Start Development

### 1. Start Services

```bash
# Terminal 1: Start Supabase (if not already running)
supabase start

# Terminal 2: Start dev server
npm run dev
```

### 2. Create Your Account

1. Go to http://localhost:5173/login
2. Click "Sign up"
3. Enter email and password
4. Check http://localhost:54324 (Inbucket) for confirmation email
5. Click the confirmation link
6. Sign in

### 3. Grant Yourself Permissions

```bash
# Edit the email in the script first:
nano scripts/create_dev_user.sql
# Change 'admin@example.com' to your email

# Run the script:
docker exec -i supabase_db_DiamondSportingBook psql -U postgres < scripts/create_dev_user.sql
```

### 4. Test Access

Visit these URLs (after signing in):
- http://localhost:5173/control/:sessionId - Race Control (requires race_control)
- http://localhost:5173/admin - Admin Dashboard (requires betting_admin or super_admin)

## 📊 Available Services

| Service | URL | Purpose |
|---------|-----|---------|
| **App** | http://localhost:5173 | Your React app |
| **Supabase Studio** | http://localhost:54323 | Database admin UI |
| **Inbucket** | http://localhost:54324 | Email inbox (for confirmations) |
| **Database** | postgresql://postgres:postgres@localhost:54322/postgres | Direct DB access |

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run lint            # Run ESLint

# Database
supabase db reset       # Reset database to migrations
supabase db push        # Push migrations to remote
supabase status         # Check service status
supabase stop           # Stop all services

# Testing
npm test                # Run tests
```

## 🎯 Test the Timing Domain

### Create a Session

```typescript
import { supabase } from '@lib/supabaseClient'

const { data, error } = await supabase.rpc('timing_create_session', {
  p_input: {
    name: 'Monaco GP 2025',
    mode: 'race',
    starts_at: new Date().toISOString(),
    drivers: [
      { number: 44, name: 'Lewis Hamilton', team_name: 'Mercedes', team_color: '#00D2BE' },
      { number: 1, name: 'Max Verstappen', team_name: 'Red Bull', team_color: '#0600EF' }
    ]
  }
})
```

### Initialize Race

```typescript
const { data } = await supabase.rpc('timing_initialize_race', {
  p_session_id: sessionId
})
```

### Log a Lap

```typescript
const { data } = await supabase.rpc('timing_log_lap', {
  p_session_id: sessionId,
  p_driver_id: driverId,
  p_lap_time_ms: 85000  // 1:25.000
})
```

### View Standings

```typescript
const { data } = await supabase
  .from('live_driver_standings')
  .select('*')
  .eq('session_id', sessionId)
  .order('position')
```

## 🔐 Auth in Components

```typescript
import { useSession } from '@lib/auth/SessionProvider'
import { usePermissions } from '@lib/auth/usePermissions'

function MyComponent() {
  const { user, signOut } = useSession()
  const { isRaceControl, canManageRace } = usePermissions()

  if (!canManageRace) {
    return <div>Access Denied</div>
  }

  return (
    <div>
      <p>Welcome, {user?.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

## 📝 Files to Know

**Auth:**
- `src/lib/auth/SessionProvider.tsx` - Auth context
- `src/lib/auth/usePermissions.ts` - Permission hooks
- `src/app/auth/LoginPage.tsx` - Login UI
- `src/app/components/ProtectedRoute.tsx` - Route protection

**Timing Domain:**
- `supabase/migrations/0011_timing_v2_enhancements.sql` - V2 schema
- `src/domains/timing/api/timingApi.ts` - API hooks
- `src/domains/timing/hooks/useTimingRealtime.ts` - Realtime updates

**Database:**
- `scripts/create_dev_user.sql` - Grant permissions
- `test_timing_v2_simple.sql` - Schema verification

**Docs:**
- `TIMING_V2_IMPLEMENTATION.md` - Timing domain docs
- `AUTH_SETUP.md` - Auth system guide
- `README.md` - Project overview

## 🐛 Troubleshooting

**Build fails?**
```bash
rm -rf node_modules
npm install
npm run build
```

**Supabase not running?**
```bash
supabase status  # Check status
supabase start   # Start services
```

**Can't log in?**
- Check http://localhost:54324 for confirmation email
- Verify email is confirmed in Supabase Studio

**"Unauthorized" when calling RPCs?**
```bash
# Grant yourself permissions:
docker exec -i supabase_db_DiamondSportingBook psql -U postgres < scripts/create_dev_user.sql
```

**Database schema issues?**
```bash
supabase db reset  # Reapply all migrations
```

## 🎉 Next Steps

1. **Build Race Control UI** - Create session management interface
2. **Add Realtime Updates** - Use `useTimingRealtime` hook
3. **Test Lap Logging** - Implement lap entry form
4. **Build Live Timing** - Display real-time standings
5. **Add Sign Out Button** - Update header/navigation

## 📚 Documentation

- [Timing V2 Implementation](TIMING_V2_IMPLEMENTATION.md)
- [Auth Setup Guide](AUTH_SETUP.md)
- [Supabase Docs](https://supabase.com/docs)

---

**Everything is ready to go!** Start building your Race Control interface. 🏁
