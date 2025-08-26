// Debug the daily API logic
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

async function main() {
  console.log('Debugging the daily API logic...');
  
  // Test the exact query from getCanonicalFallback
  console.log('\n1. Testing canonical fallback query:');
  const { data: fallback, error: fallbackError } = await supabase
    .from("quest_days")
    .select("version, base_content")
    .order("quest_id")
    .order("day")
    .limit(1)
    .single();
    
  console.log('Fallback data:', fallback);
  console.log('Fallback error:', fallbackError);
  
  // Test basic quest_days access
  console.log('\n2. Testing basic quest_days access:');
  const { data: allData, error: allError } = await supabase
    .from('quest_days')
    .select('*')
    .limit(3);
    
  console.log('All data count:', allData?.length);
  console.log('All error:', allError);
  
  // Test with auth context (service role should bypass RLS)
  console.log('\n3. Testing with auth context:');
  const { data: authData } = await supabase.auth.getUser();
  console.log('Auth user:', authData.user?.id || 'No user');
  
  // Test the specific query for default-quest
  console.log('\n4. Testing default-quest specific query:');
  const { data: defaultData, error: defaultError } = await supabase
    .from('quest_days')
    .select('*')
    .eq('quest_id', 'default-quest')
    .limit(1);
    
  console.log('Default quest data:', defaultData);
  console.log('Default quest error:', defaultError);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});