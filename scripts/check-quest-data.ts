// Check what data exists in quest_days table
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

async function main() {
  console.log('Checking quest_days table...');
  
  const { data, error } = await supabase
    .from('quest_days')
    .select('*')
    .limit(5);
    
  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }
  
  console.log('Found', data?.length || 0, 'records:');
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});