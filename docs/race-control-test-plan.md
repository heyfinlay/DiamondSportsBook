# Race Control Manual Test Plan

1. **Create and open a session**
   - Navigate to `/control`.
   - Fill in the create session form and submit.
   - Confirm you are redirected to `/control/:sessionId` and the session header reflects the new details.

2. **Start race and timer controls**
   - Click **Start Race**. Phase should show `race`, timer begins counting, and a toast confirms initialization.
   - Hit **Pause** and verify the clock stops and a toast appears.
   - Hit **Resume** and ensure the clock continues from the paused value.

3. **Hotkey lap logging**
   - Focus the page (no inputs selected) and press the hotkey shown on a driver card.
   - Observe toast confirmation and see Lap/Last/Best values update for that driver.
   - Repeat for multiple drivers and confirm updates propagate without manual inputs.

4. **Track status buttons**
   - Click through each flag (Green, Yellow, VSC, SC, Red, Checkered).
   - Check that the current flag pill updates, toasts fire, and entries appear in the Control Log.
   - Open `/live/:sessionId` to confirm track status changes propagate to live timing.

5. **Penalty and pit forms**
   - Submit penalty form for a specific driver and another session-level penalty.
   - Submit a pit event with and without duration.
   - Confirm toasts, driver cards, and control log entries update; verify `penalties`/`pit events` queries refresh.

6. **Lap invalidation & driver retirement**
   - Use the Invalidate form or button on a driver card; verify toast + control log entry.
   - Click **Retire** on a driver card and confirm status changes to `retired` with a log entry.

7. **Race control log review**
   - Scroll the Control Log and ensure flag changes, penalties, pits, invalidations, pauses/resumes, and driver retirements appear with timestamps and readable text.

8. **Permissions check**
   - Sign in as a user without race control permissions and visit `/control/:sessionId`.
   - Confirm a friendly “permission required” message is shown instead of the console.

9. **Delete session**
   - Click **Delete** and accept the prompt.
   - Confirm you return to `/control` and the session is removed from future lookups.
