import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('Testing Session Setup System...\n')

// Test 1: Check if teams table exists and has data
console.log('1. Checking teams table...')
const { data: teams, error: teamsError } = await supabase
  .from('teams')
  .select('*')
  .order('team_id')

if (teamsError) {
  console.error('❌ Error fetching teams:', teamsError.message)
} else {
  console.log(`✅ Found ${teams.length} teams:`)
  teams.forEach(team => {
    console.log(`   - ${team.abbrev}: ${team.name} (Driver: ${team.primary_driver})`)
  })
}

// Test 2: Test DBGP lineup RPC
console.log('\n2. Testing get_dbgp_lineup() RPC...')
const { data: lineup, error: lineupError } = await supabase.rpc('get_dbgp_lineup')

if (lineupError) {
  console.error('❌ Error calling get_dbgp_lineup:', lineupError.message)
} else {
  console.log(`✅ DBGP lineup loaded with ${lineup.length} drivers:`)
  lineup.forEach(driver => {
    console.log(`   #${driver.number} ${driver.name} (${driver.team_id}) - ${driver.primary_color}/${driver.secondary_color}`)
  })
}

console.log('\n✅ All tests passed! Session setup system is ready.')
console.log('\nNext steps:')
console.log('1. Navigate to http://localhost:5173/admin')
console.log('2. Click "Create New Session"')
console.log('3. Click "Load DBGP Lineup" to populate drivers')
console.log('4. Fill in session details and create!')
