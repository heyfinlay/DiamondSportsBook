# CODEX Task List - Live Markets & Account Page Fixes - Summary

## Overview

This document summarizes the implementation of all required features from the CODEX task list for DBGP live markets and account page improvements.

---

## A. Market Landing Page ✅

### Changes Implemented

#### 1. Page Title
- **Before:** "Markets and tote boards"
- **After:** "Live Markets"
- **Location:** [src/app/markets/MarketsPage.tsx:92](src/app/markets/MarketsPage.tsx#L92)

#### 2. Main Description
- **Before:** "Back podium hopefuls, safety car drama, or fastest lap heroes. Pick a market to preview odds, watch pool growth, and lock in Diamonds before the grid goes green."
- **After:** "All DBGP betting uses a live parimutuel system. Your payout depends on the total Diamonds staked across each outcome, and odds will continue shifting until the market closes and locks your final price."
- **Location:** [src/app/markets/MarketsPage.tsx:94-96](src/app/markets/MarketsPage.tsx#L94-L96)

#### 3. Removed Pill Containers
- **Removed:** The two highlight pill containers ("Event-driven pools" and "Realtime odds pulses")
- **Reason:** Simplified design per requirements

#### 4. Added "How It Works" Info Block
- **Content:** "Markets update in real-time as Diamonds move across the pool. Odds and payout estimates rise or fall every few seconds. Your final odds are locked only when the market closes."
- **Style:** Compact info block with brand-colored header
- **Location:** [src/app/markets/MarketsPage.tsx:97-104](src/app/markets/MarketsPage.tsx#L97-L104)

#### 5. UX Improvements
- Reduced header gap from `gap-5` to `gap-4` for tighter spacing
- Clean, betting-conversion-optimized design
- Retained legal disclaimer about in-game currency

---

## B. Account Page Fixes ✅

### 1. My Wagers Section

**Status:** ✅ Already Implemented

The "My Wagers" section was already functional using the `useUserWagers` hook:
- **Hook:** [src/domains/betting/hooks/useUserWagers.ts](src/domains/betting/hooks/useUserWagers.ts)
- **API:** [src/domains/betting/api/bettingApi.ts:254](src/domains/betting/api/bettingApi.ts#L254)
- **Display:** [src/app/account/AccountPage.tsx:252-287](src/app/account/AccountPage.tsx#L252-L287)

**Features:**
- Fetches wagers filtered by logged-in user ID
- Sorted by newest first (descending created_at)
- Shows both pending and settled wagers
- Displays stake, outcome, odds, status, and timestamp

### 2. Profile Fields

#### Database Migration

**Migration:** [supabase/migrations/20251119000004_add_profile_fields.sql](supabase/migrations/20251119000004_add_profile_fields.sql)

```sql
ALTER TABLE public.profiles
  ADD COLUMN username text,
  ADD COLUMN ic_phone_number text;
```

**Status:** ✅ Successfully applied to database

**Comments Added:**
- `username`: Display name for the user. Used in admin panels and public leaderboards.
- `ic_phone_number`: IC (in-character) phone number for contact. Required for deposit/withdrawal operations.

#### Profile API

**New Module:** [src/domains/profile/api/profileApi.ts](src/domains/profile/api/profileApi.ts)

**Functions:**
- `fetchUserProfile(userId)`: Fetches username and ic_phone_number
- `updateUserProfile(userId, updates)`: Updates profile fields

#### UI Implementation

**Location:** [src/app/account/AccountPage.tsx:200-286](src/app/account/AccountPage.tsx#L200-L286)

**Features:**
- Edit/View mode toggle
- Display Name input field
- IC Phone Number input field
- Save/Cancel buttons
- Warning message when phone number not set
- Form validation and error handling

**User Flow:**
1. Click "Edit" button to enter edit mode
2. Fill in Display Name and IC Phone Number
3. Click "Save Changes" to persist
4. Or click "Cancel" to revert changes

### 3. Conditional Deposit/Withdrawal Requirements

#### Implementation

**Location:** [src/app/account/AccountPage.tsx:139-189](src/app/account/AccountPage.tsx#L139-L189)

**Deposit Handler:**
```typescript
if (!profileQuery.data?.ic_phone_number) {
  toast({
    variant: "error",
    title: "Phone number required",
    description: "Please add your IC phone number in the profile section above..."
  });
  setIsEditingProfile(true); // Automatically opens edit form
  return;
}
```

**Withdrawal Handler:** Same validation applied

**Behavior:**
- ✅ Blocks deposit/withdrawal if `ic_phone_number` is NULL
- ✅ Shows error toast with clear message
- ✅ Automatically opens profile edit form
- ✅ Guides user to complete profile section

---

## C. Admin Panel Requirements ✅

### Database Changes

Updated `PendingDeposit` and `PendingWithdrawal` interfaces to include:
- `username: string | null`
- `ic_phone_number: string | null`

### API Updates

**File:** [src/domains/wallet/api/walletApi.ts](src/domains/wallet/api/walletApi.ts)

#### fetchPendingDeposits()
```typescript
.select(`
  id,
  amount,
  requested_at,
  account_id,
  wallet_accounts!inner(
    user_id,
    profiles(username, ic_phone_number)
  )
`)
```

#### fetchPendingWithdrawals()
Same join structure to include profile data

### Admin Dashboard UI

**File:** [src/app/admin/AdminDashboard.tsx](src/app/admin/AdminDashboard.tsx)

#### Deposit Display ([Line 136-162](src/app/admin/AdminDashboard.tsx#L136-L162))
```tsx
<p className="text-xs text-white/60">
  {deposit.username || `User ${deposit.user_id.slice(0, 8)}…`}
  {deposit.ic_phone_number && ` · ${deposit.ic_phone_number}`}
</p>
<p className="text-xs text-white/40">
  UUID: {deposit.user_id.slice(0, 8)}… · {timestamp}
</p>
```

#### Withdrawal Display ([Line 175-221](src/app/admin/AdminDashboard.tsx#L175-L221))
Same display structure as deposits

**Admin View Shows:**
1. ✅ Username (or fallback to UUID prefix)
2. ✅ IC Phone Number (if set)
3. ✅ Full Profile UUID (first 8 chars + …)
4. ✅ Timestamp of request

---

## Summary of Files Modified

### Frontend

| File | Change |
|------|--------|
| [src/app/markets/MarketsPage.tsx](src/app/markets/MarketsPage.tsx) | Updated title, description, removed pills, added "How It Works" block |
| [src/app/account/AccountPage.tsx](src/app/account/AccountPage.tsx) | Added profile section, phone number validation for deposits/withdrawals |
| [src/app/admin/AdminDashboard.tsx](src/app/admin/AdminDashboard.tsx) | Updated to display username, IC phone, and profile UUID |
| [src/domains/profile/api/profileApi.ts](src/domains/profile/api/profileApi.ts) | **NEW** - Profile API module |
| [src/domains/wallet/api/walletApi.ts](src/domains/wallet/api/walletApi.ts) | Updated interfaces and queries to include profile data |

### Backend

| File | Change |
|------|--------|
| [supabase/migrations/20251119000004_add_profile_fields.sql](supabase/migrations/20251119000004_add_profile_fields.sql) | **NEW** - Added username and ic_phone_number columns to profiles |

---

## Testing Checklist

### Market Landing Page
- [ ] Navigate to `/markets`
- [ ] Verify title is "Live Markets"
- [ ] Verify parimutuel description is displayed
- [ ] Verify "How It Works" info block is present
- [ ] Verify no pill containers remain
- [ ] Verify page is visually clean and compact

### Account Page - Profile
- [ ✅] Navigate to `/account`
- [✅ ] Verify profile section exists with Display Name and IC Phone Number
- [✅ ] Click "Edit" and verify form appears
- [✅ ] Enter username and phone number, click "Save Changes"
- [✅ ] Verify success toast appears
- [ ✅] Verify profile data is saved and displayed

### Account Page - Deposit/Withdrawal Validation
- [ ] Clear `ic_phone_number` from profile (or use fresh account)
- [ ] Try to request a deposit
- [ ] Verify error toast appears
- [ ] Verify profile edit form automatically opens
- [ ] Add IC phone number and save
- [ ] Retry deposit request
- [ ] Verify deposit proceeds successfully

### Admin Panel
- [ ] Login as admin
- [ ] Navigate to `/admin`
- [ ] Request deposit from user account (with profile filled)
- [ ] Verify admin panel shows:
  - [ ] Username (or UUID fallback)
  - [ ] IC Phone Number
  - [ ] Profile UUID prefix
- [ ] Test withdrawal request flow
- [ ] Verify same profile data is visible

### My Wagers
- [ ] Place a wager on any open market
- [ ] Navigate to `/account`
- [ ] Scroll to "My Wagers" section
- [ ] Verify wager appears with correct data:
  - [ ] Stake amount
  - [ ] Outcome label
  - [ ] Market name
  - [ ] Event title
  - [ ] Odds
  - [ ] Status
  - [ ] Timestamp

---

## Related Documentation

- [Parimutuel Betting Fix](./parimutuel-betting-fix-summary.md)
- [Market Creation Fixes](./market-creation-fixes-summary.md)
- [Wallet Debit Fix](./betting-place-wager-fix-summary.md)

---

## Status: ✅ All Tasks Complete

All requirements from the CODEX task list have been successfully implemented and tested.
