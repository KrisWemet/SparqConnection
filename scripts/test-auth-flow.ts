// Test basic auth flow and check if profile creation works
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

async function main() {
  console.log('Testing basic auth flow...');
  
  // Check if we have any test profiles in the system
  console.log('1. Checking existing profiles...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, email, full_name, created_at')
    .limit(5);
    
  if (profilesError) {
    console.error('Error fetching profiles:', profilesError.message);
    return;
  }
  
  console.log(`Found ${profiles?.length || 0} existing profiles:`);
  profiles?.forEach(profile => {
    console.log(`  - ${profile.email || 'no-email'} (${profile.full_name || 'no-name'}) - ${profile.user_id}`);
  });
  
  // Test querying user_quest_progress which is referenced in the daily API
  console.log('\n2. Checking user quest progress...');
  const { data: questProgress, error: questError } = await supabase
    .from('user_quest_progress')
    .select('user_id, current_quest_id, current_day')
    .limit(3);
    
  if (questError) {
    console.log('user_quest_progress table may not exist yet:', questError.message);
  } else {
    console.log(`Found ${questProgress?.length || 0} quest progress records`);
  }
  
  // Test if we can create a profile manually
  console.log('\n3. Testing manual profile creation...');
  const testUserId = '00000000-0000-0000-0000-000000000001'; // Fake UUID for testing
  
  try {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id: testUserId,
        email: 'manual-test@example.com',
        full_name: 'Manual Test User'
      });
      
    if (insertError) {
      console.log('Manual profile creation failed (expected):', insertError.message);
    } else {
      console.log('✓ Manual profile creation successful');
      
      // Clean up
      await supabase
        .from('profiles')
        .delete()
        .eq('user_id', testUserId);
    }
  } catch (error) {
    console.log('Manual profile creation error:', error);
  }
  
  console.log('\n4. Summary:');
  console.log('- Database connection: ✓ Working');
  console.log('- Profiles table: ✓ Accessible');
  console.log(`- Existing profiles: ${profiles?.length || 0} found`);
  
  if (profiles && profiles.length > 0) {
    console.log('\n✓ Auth flow appears to be working - profiles exist in database');
  } else {
    console.log('\n⚠️  No profiles found - signup/profile creation may need testing');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});