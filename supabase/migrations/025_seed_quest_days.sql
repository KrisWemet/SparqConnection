-- Migration: Populate quest_days table with seed content
-- Purpose: Fix "No content available" error by providing basic daily ritual content

-- Insert default quest content (7 days to start)
INSERT INTO quest_days (quest_id, day, version, base_content, tags) VALUES 
(
  'default-quest',
  1,
  1,
  jsonb_build_object(
    'story', 'Today is a fresh start to nurture your connection. Small moments of kindness create the strongest bonds.',
    'dq', 'What''s one thing your partner did recently that made you smile?',
    'micro_action', 'Give your partner a 20-second hug without saying anything - just breathe together.',
    'journal', 'How did it feel to pause and think about something positive your partner did? What emotions came up?',
    'reflection', 'Looking at today''s connection moment, what''s one small thing you could do tomorrow to show appreciation?'
  ),
  ARRAY['connection', 'appreciation', 'mindfulness']
),
(
  'default-quest',
  2,
  1,
  jsonb_build_object(
    'story', 'Every relationship is built on a foundation of understanding. Today, let''s explore what makes your partner feel truly seen.',
    'dq', 'What''s something your partner cares deeply about that you''d love to understand better?',
    'micro_action', 'Ask your partner about their day and listen without giving advice - just be present.',
    'journal', 'What did you learn about your partner today? How did it feel to listen with full attention?',
    'reflection', 'Think about your listening today. What would help you be even more present tomorrow?'
  ),
  ARRAY['understanding', 'listening', 'presence']
),
(
  'default-quest',
  3,
  1,
  jsonb_build_object(
    'story', 'Gratitude is a bridge that connects hearts. When we appreciate what we have, we create space for more love to grow.',
    'dq', 'What''s a small everyday thing your partner does that you might take for granted?',
    'micro_action', 'Thank your partner for something specific they did this week - be detailed about why it mattered.',
    'journal', 'How does expressing gratitude change how you feel about your relationship? What did you notice?',
    'reflection', 'What''s one habit your partner has that you could appreciate more regularly?'
  ),
  ARRAY['gratitude', 'appreciation', 'recognition']
),
(
  'default-quest',
  4,
  1,
  jsonb_build_object(
    'story', 'Touch is one of our most powerful ways to connect. A gentle touch can communicate what words sometimes cannot.',
    'dq', 'How does your partner like to receive physical affection? What makes them feel most loved through touch?',
    'micro_action', 'Offer your partner a brief shoulder rub or hold their hand for a quiet moment.',
    'journal', 'How do you and your partner connect through touch? What feels most natural and comforting?',
    'reflection', 'Thinking about physical connection, what''s one way you could be more intentional about touch?'
  ),
  ARRAY['physical_touch', 'comfort', 'intimacy']
),
(
  'default-quest',
  5,
  1,
  jsonb_build_object(
    'story', 'Dreams shared become goals achieved. When partners support each other''s aspirations, both hearts grow stronger.',
    'dq', 'What''s something your partner is working toward that you could support them with?',
    'micro_action', 'Ask your partner about a goal or dream they have and how you can help them take one small step.',
    'journal', 'What dreams do you share with your partner? How does it feel to support each other''s growth?',
    'reflection', 'Looking at your partner''s goals, what''s one specific way you could be their biggest cheerleader?'
  ),
  ARRAY['support', 'goals', 'encouragement']
),
(
  'default-quest',
  6,
  1,
  jsonb_build_object(
    'story', 'Laughter is medicine for the soul and glue for relationships. Playfulness keeps love light and joyful.',
    'dq', 'What''s something silly that always makes your partner laugh?',
    'micro_action', 'Do something playful together - share a funny memory, make a silly face, or have a brief dance party.',
    'journal', 'How does playfulness show up in your relationship? What brings out your partner''s joyful side?',
    'reflection', 'Think about fun in your relationship. What''s one way you could bring more lightness into your days together?'
  ),
  ARRAY['playfulness', 'joy', 'laughter']
),
(
  'default-quest',
  7,
  1,
  jsonb_build_object(
    'story', 'Every week of connection builds a stronger foundation. Take a moment to celebrate the small steps you''ve both taken.',
    'dq', 'What''s one thing that felt different or better about your connection this week?',
    'micro_action', 'Share with your partner one specific moment from this week when you felt especially close.',
    'journal', 'Reflecting on this week, what patterns of connection are you starting to notice? What feels good?',
    'reflection', 'As you look toward next week, what''s one intention you want to set for your relationship?'
  ),
  ARRAY['reflection', 'celebration', 'intention']
);

-- Insert a few more quest types for variety
INSERT INTO quest_days (quest_id, day, version, base_content, tags) VALUES 
(
  'mindful-connection',
  1,
  1,
  jsonb_build_object(
    'story', 'Mindfulness in relationships means being fully present with each other. Today, let''s practice gentle awareness.',
    'dq', 'When you''re with your partner, what helps you feel most present and connected?',
    'micro_action', 'Spend 3 minutes looking into your partner''s eyes and breathing together without speaking.',
    'journal', 'What was it like to be fully present with your partner? What did you notice about yourself and them?',
    'reflection', 'How could you bring more mindful presence into your everyday moments together?'
  ),
  ARRAY['mindfulness', 'presence', 'awareness']
),
(
  'appreciation-focus',
  1,
  1,
  jsonb_build_object(
    'story', 'Appreciation is like sunlight for relationships - it helps everything grow. Today, let''s shine that light brightly.',
    'dq', 'What''s a quality your partner has that you admire but rarely mention out loud?',
    'micro_action', 'Write your partner a short note about something you appreciate about their character.',
    'journal', 'How does focusing on appreciation change your perspective on your relationship? What shifts for you?',
    'reflection', 'What would daily appreciation look like in your relationship? How could you make it more natural?'
  ),
  ARRAY['appreciation', 'gratitude', 'character']
);