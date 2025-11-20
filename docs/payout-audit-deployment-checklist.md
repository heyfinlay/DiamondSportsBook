# Payout Audit System - Deployment Checklist

**Date:** 2025-11-21
**Status:** ✅ READY FOR DEPLOYMENT

---

## ✅ Completed Tasks

### Database Changes
- [x] Created `settlement_payouts` table with all required columns
- [x] Added indexes for efficient querying (user_id, pool_id, market_id, settled_at)
- [x] Configured RLS policies (users see own, admins see all)
- [x] Updated `market_pool_confirm_settlement()` function with:
  - [x] Idempotency checks (prevent double-payment)
  - [x] Audit trail insertion for each payout
  - [x] `settled_at` timestamp fix
- [x] Created `settlement_get_pool_payouts()` helper RPC
- [x] Created `settlement_get_user_payouts()` helper RPC
- [x] Granted appropriate permissions to authenticated users

### Backend/API Changes
- [x] Created [settlementAuditApi.ts](../src/domains/betting/api/settlementAuditApi.ts)
  - [x] `fetchPoolPayouts()` - get all payouts for a pool
  - [x] `fetchUserPayouts()` - get user's payout history
  - [x] `fetchRecentSettlements()` - get recent settled pools
  - [x] TypeScript interfaces for PoolPayout and UserPayout
- [x] Updated `UserWager` interface in [bettingApi.ts](../src/domains/betting/api/bettingApi.ts)
  - [x] Added `settled_payout` field
  - [x] Updated `fetchUserWagers()` to include settled_payout in SELECT
  - [x] Updated mapping to include settled_payout

### Frontend Changes
- [x] Created [SettlementAuditPage.tsx](../src/app/admin/SettlementAuditPage.tsx)
  - [x] Main list view: recent settlements
  - [x] Detail view: payouts for specific pool
  - [x] Summary stats: # winners, total stake, total paid
  - [x] Payout table with all relevant fields
- [x] Updated [AccountPage.tsx](../src/app/account/AccountPage.tsx)
  - [x] Won wagers show "Final Payout" in green
  - [x] Void/refunded wagers show "Refunded" in yellow
  - [x] Pending wagers show "Potential" estimate
- [x] Updated [router.tsx](../src/app/router.tsx)
  - [x] Added `/admin/settlements` route
  - [x] Added `/admin/settlements/:poolId` route
  - [x] Protected routes with admin permissions
- [x] Updated [AdminDashboard.tsx](../src/app/admin/AdminDashboard.tsx)
  - [x] Added "Settlement Audit" navigation button

### Documentation
- [x] Created [payout-system-audit.md](payout-system-audit.md) - detailed audit findings
- [x] Created [payout-math-validation.sql](payout-math-validation.sql) - SQL test suite
- [x] Created [payout-system-implementation-summary.md](payout-system-implementation-summary.md) - complete guide
- [x] Created this deployment checklist

### Build Verification
- [x] TypeScript compilation successful
- [x] No type errors
- [x] Vite build successful
- [x] No runtime errors expected

---

## 🧪 Testing Checklist

### Database Tests
- [ ] Run [payout-math-validation.sql](payout-math-validation.sql) to verify:
  - [ ] Single winner gets correct payout
  - [ ] Multiple equal winners split fairly
  - [ ] Multiple unequal winners get proportional shares
  - [ ] Rounding behavior is acceptable
  - [ ] Idempotency protection works (double-settlement fails)

### Manual Frontend Tests
- [ ] **Settlement Audit Page** (`/admin/settlements`)
  - [ ] Page loads without errors
  - [ ] Recent settlements display correctly
  - [ ] Can click a settlement to view details
  - [ ] Requires admin permission (non-admins see error)

- [ ] **Pool Payout Detail Page** (`/admin/settlements/:poolId`)
  - [ ] Summary stats display correctly
  - [ ] Payout table shows all winners
  - [ ] Columns display: user, outcome, stake, share %, payout, odds, timestamp
  - [ ] Data is sorted by payout amount (highest first)
  - [ ] "Back to Settlements" link works

- [ ] **Account Page** (`/account`)
  - [ ] Pending wagers show "Potential Ɖ{amount}"
  - [ ] Won wagers show "Final Payout Ɖ{amount}" in green
  - [ ] Void/refunded wagers show "Refunded Ɖ{amount}" in yellow
  - [ ] Lost wagers display correctly

- [ ] **Admin Dashboard** (`/admin`)
  - [ ] "Settlement Audit" button is visible
  - [ ] Button links to `/admin/settlements`

### End-to-End Test
- [ ] **Create and settle a test market:**
  1. [ ] Create a test market with 2+ outcomes
  2. [ ] Place multiple wagers on the winning outcome (different users, different amounts)
  3. [ ] Place wagers on losing outcomes
  4. [ ] Close the market
  5. [ ] Propose settlement with winning outcome
  6. [ ] Confirm settlement
  7. [ ] Verify:
     - [ ] Winners credited correctly in wallet
     - [ ] Wagers marked as "won" / "lost"
     - [ ] `settlement_payouts` table has one row per winner
     - [ ] Settlement appears in `/admin/settlements`
     - [ ] Payout details visible in `/admin/settlements/:poolId`
     - [ ] Users see "Final Payout" on account page
  8. [ ] **Idempotency test:**
     - [ ] Attempt to propose settlement again
     - [ ] Should fail with "Pool already settled" error
     - [ ] Attempt to confirm settlement again
     - [ ] Should fail (no pending settlement)

---

## 📊 Database Verification Queries

After deployment, run these queries to verify everything is working:

### Check settlement_payouts table exists
```sql
SELECT count(*) FROM public.settlement_payouts;
```

### Check indexes exist
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'settlement_payouts'
ORDER BY indexname;
```

### Check RLS policies
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'settlement_payouts';
```

### Check helper functions exist
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'settlement_%';
```

### Test payout query (as admin)
```sql
SELECT * FROM settlement_get_pool_payouts('some-pool-id');
```

### Test user payout query
```sql
SELECT * FROM settlement_get_user_payouts(auth.uid(), 10);
```

---

## 🚀 Deployment Steps

1. **Database Migration**
   - [x] Migration file already applied via Supabase MCP
   - [x] All functions updated in production database
   - [ ] Verify with queries above

2. **Frontend Deployment**
   - [x] Code committed to repository
   - [ ] Push to production branch
   - [ ] Trigger deployment pipeline
   - [ ] Wait for build to complete
   - [ ] Verify deployment successful

3. **Smoke Tests**
   - [ ] Navigate to `/admin/settlements` as admin
   - [ ] Verify page loads
   - [ ] Check browser console for errors
   - [ ] Test navigation to detail page

4. **User Communication** (Optional)
   - [ ] Notify admins about new audit trail feature
   - [ ] Inform users that final payouts now display on account page
   - [ ] Share link to documentation

---

## 🔄 Rollback Plan (If Needed)

If issues arise, rollback can be done in stages:

### Frontend Rollback (Easy)
- Revert [router.tsx](../src/app/router.tsx) changes
- Revert [AdminDashboard.tsx](../src/app/admin/AdminDashboard.tsx) changes
- Remove [SettlementAuditPage.tsx](../src/app/admin/SettlementAuditPage.tsx)
- Remove [settlementAuditApi.ts](../src/domains/betting/api/settlementAuditApi.ts)
- Redeploy frontend

### Backend Rollback (Moderate)
```sql
-- Remove helper functions
DROP FUNCTION IF EXISTS public.settlement_get_pool_payouts(uuid);
DROP FUNCTION IF EXISTS public.settlement_get_user_payouts(uuid, integer);

-- Revert market_pool_confirm_settlement to previous version
-- (Would need to restore from git history or backup)

-- Drop settlement_payouts table (destructive - only if necessary)
DROP TABLE IF EXISTS public.settlement_payouts CASCADE;
```

**Note:** Database rollback will lose audit trail data. Only do this if critical issues are found.

---

## 📝 Known Issues & Limitations

1. **Rounding Residual**
   - Sum of payouts may be slightly less than net pool due to rounding
   - Typically < Ɖ1.00 per settlement
   - Documented and acceptable

2. **No Settlement Undo**
   - Once settled, cannot be un-settled
   - Must void pool or manually refund if error
   - Future enhancement: add reversal function

3. **Navigation**
   - Settlement audit link only in Admin Dashboard
   - Could add to top navigation or sidebar in future

---

## ✅ Final Checklist Before Go-Live

- [x] All database changes applied
- [x] All TypeScript errors resolved
- [x] Build successful
- [x] Routes configured
- [x] Navigation updated
- [ ] Manual testing complete
- [ ] Database queries verified
- [ ] Admin team notified
- [ ] Documentation reviewed

---

## 📞 Support

If issues arise:
1. Check browser console for errors
2. Check Supabase logs for database errors
3. Review [payout-system-audit.md](payout-system-audit.md) for detailed analysis
4. Contact development team with error details

---

**Status:** ✅ READY - All code complete, awaiting final testing and deployment

---

**End of Checklist**
