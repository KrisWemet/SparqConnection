// Simple seed script for quest_days table
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

async function main() {
  console.log('Adding basic seed data to quest_days table...');
  
  // Simple insert without upsert to avoid updated_at issues
  const { error } = await supabase
    .from('quest_days')
    .insert([
      {
        quest_id: 'default-quest',
        day: 1,
        version: 1,
        base_content: {
          story: 'Today is a fresh start to nurture your connection. Small moments of kindness create the strongest bonds.',
          dq: 'What\'s one thing your partner did recently that made you smile?',
          micro_action: 'Give your partner a 20-second hug without saying anything - just breathe together.',
          journal: 'How did it feel to pause and think about something positive your partner did? What emotions came up?',
          reflection: 'Looking at today\'s connection moment, what\'s one small thing you could do tomorrow to show appreciation?'
        },
        tags: ['connection', 'appreciation', 'mindfulness']
      },
      {
        quest_id: 'default-quest', 
        day: 2,
        version: 1,
        base_content: {
          story: 'Every relationship is built on a foundation of understanding. Today, let\'s explore what makes your partner feel truly seen.',
          dq: 'What\'s something your partner cares deeply about that you\'d love to understand better?',
          micro_action: 'Ask your partner about their day and listen without giving advice - just be present.',
          journal: 'What did you learn about your partner today? How did it feel to listen with full attention?',
          reflection: 'Think about your listening today. What would help you be even more present tomorrow?'
        },
        tags: ['understanding', 'listening', 'presence']
      },
      {
        quest_id: 'default-quest',
        day: 3, 
        version: 1,
        base_content: {
          story: 'Gratitude is a bridge that connects hearts. When we appreciate what we have, we create space for more love to grow.',
          dq: 'What\'s a small everyday thing your partner does that you might take for granted?',
          micro_action: 'Thank your partner for something specific they did this week - be detailed about why it mattered.',
          journal: 'How does expressing gratitude change how you feel about your relationship? What did you notice?',
          reflection: 'What\'s one habit your partner has that you could appreciate more regularly?'
        },
        tags: ['gratitude', 'appreciation', 'recognition']
      }
    ]);
    
  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }
  
  console.log('✓ Successfully seeded quest_days table with basic content');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});