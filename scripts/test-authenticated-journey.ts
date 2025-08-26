// Test what happens when an authenticated user accesses the daily ritual API
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

async function main() {
  console.log('Testing authenticated user journey...');
  
  // Get one of the existing users
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, email, full_name')
    .limit(1)
    .single();
    
  if (!profiles) {
    console.error('No profiles found');
    return;
  }
  
  const userId = profiles.user_id;
  console.log(`Testing with user: ${profiles.email} (${userId})`);
  
  // Test what the daily API would see for this user
  console.log('\n1. Checking user quest progress...');
  const { data: questProgress } = await supabase
    .from('user_quest_progress')
    .select('current_quest_id, current_day')
    .eq('user_id', userId)
    .single();
    
  if (!questProgress) {
    console.log('⚠️  No user_quest_progress found - this explains API issues');
    console.log('Creating default quest progress for user...');
    
    const { error: insertError } = await supabase
      .from('user_quest_progress')
      .insert({
        user_id: userId,
        current_quest_id: 'default-quest',
        current_day: 1
      });
      
    if (insertError) {
      console.error('Failed to create quest progress:', insertError.message);
      return;
    } else {
      console.log('✓ Created default quest progress');
    }
  } else {
    console.log(`Found quest progress: ${questProgress.current_quest_id} day ${questProgress.current_day}`);
  }
  
  // Test daily plans table
  console.log('\n2. Checking daily plans...');
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const { data: existingPlan } = await supabase
    .from('daily_plans')
    .select('content, version')
    .eq('user_id', userId)
    .eq('date', today)
    .single();
    
  if (existingPlan) {
    console.log('Found existing daily plan for today');
  } else {
    console.log('No daily plan exists for today (will be generated)');
  }
  
  // Test the actual daily API call with this user context
  console.log('\n3. Testing daily API with user context...');
  
  // Simulate what the API would do
  const questId = questProgress?.current_quest_id || 'default-quest';
  const questDay = questProgress?.current_day || 1;
  
  console.log(`Looking for quest_days with quest_id="${questId}" and day=${questDay}`);
  
  const { data: questDayData } = await supabase
    .from('quest_days')
    .select('base_content, version')
    .eq('quest_id', questId)
    .eq('day', questDay)
    .single();
    
  if (questDayData) {
    console.log('✓ Found quest day data');
    console.log('Sample content:', {
      story: questDayData.base_content.story?.substring(0, 50) + '...',
      dq: questDayData.base_content.dq?.substring(0, 50) + '...'
    });
  } else {
    console.log('❌ No quest day data found');
    
    // Try with any quest data
    const { data: anyQuest } = await supabase
      .from('quest_days')
      .select('quest_id, day, base_content')
      .limit(1)
      .single();
      
    if (anyQuest) {
      console.log(`Available quest data: ${anyQuest.quest_id} day ${anyQuest.day}`);
    }
  }
  
  console.log('\n4. Summary:');
  console.log(`- User profile: ✓ ${profiles.email}`);
  console.log(`- Quest progress: ${questProgress ? '✓' : '⚠️  Fixed'}`);
  console.log(`- Quest content: ${questDayData ? '✓' : '❌'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});