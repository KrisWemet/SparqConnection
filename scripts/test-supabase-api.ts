// Test the same Supabase client setup as the API route
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@/lib/supabase-server';

async function main() {
  console.log('Testing supabase-server client (same as API route)...');
  
  const supabase = await createClient();
  
  // Test the exact query from getCanonicalFallback
  console.log('\n1. Testing getCanonicalFallback query:');
  const { data: fallback, error } = await supabase
    .from("quest_days")
    .select("version, base_content")
    .order("quest_id")
    .order("day")
    .limit(1)
    .single();
    
  console.log('Fallback data exists:', !!fallback);
  console.log('Fallback base_content exists:', !!fallback?.base_content);
  console.log('Error:', error);
  
  if (fallback?.base_content) {
    console.log('Base content keys:', Object.keys(fallback.base_content));
    console.log('Base content sample:', fallback.base_content);
  }
  
  // Test auth status
  console.log('\n2. Testing auth:');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log('User exists:', !!user);
  console.log('User error:', userError);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});