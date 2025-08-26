-- 023_personalization_micro_quizzes.sql: Structured personalization data + pair sharing prefs

-- Expand profiles with structured personalization fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS attachment_tendencies JSONB, -- {distribution:{secure:40,anxious:35,avoidant:25,mixed?:0}, primary:'secure', confidence:0.7, updated_at:ts}
  ADD COLUMN IF NOT EXISTS love_language_rank JSONB,    -- {order:['words','time','touch','acts','gifts'], top:['words','time'], confidence:0.6, updated_at:ts}
  ADD COLUMN IF NOT EXISTS share_with_partner JSONB,    -- {show_tips:true, show_labels:false}
  ADD COLUMN IF NOT EXISTS copy_profile JSONB;          -- {prefers_space:true, benefits_reassurance:false, touch_affirming:true}

-- Defaults for share_with_partner for existing rows
UPDATE profiles
SET share_with_partner = COALESCE(share_with_partner, jsonb_build_object('show_tips', true, 'show_labels', false))
WHERE share_with_partner IS NULL;

-- Per-pair sharing preferences table (consent/visibility)
CREATE TABLE IF NOT EXISTS pair_sharing_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID REFERENCES pairs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
  show_tips BOOLEAN DEFAULT true,
  show_labels BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pair_id, user_id)
);

-- RLS for pair_sharing_preferences
ALTER TABLE pair_sharing_preferences ENABLE ROW LEVEL SECURITY;

-- Only participants of the pair can access/modify their own row
CREATE POLICY "Users can view their pair sharing prefs"
  ON pair_sharing_preferences FOR SELECT
  USING (
    user_id = auth.uid() AND pair_id IN (
      SELECT id FROM pairs p WHERE (p.user_a = auth.uid() OR p.user_b = auth.uid())
    )
  );

CREATE POLICY "Users can insert their own pair sharing prefs"
  ON pair_sharing_preferences FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND pair_id IN (
      SELECT id FROM pairs p WHERE (p.user_a = auth.uid() OR p.user_b = auth.uid())
    )
  );

CREATE POLICY "Users can update their own pair sharing prefs"
  ON pair_sharing_preferences FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- updated_at trigger
CREATE TRIGGER update_pair_sharing_prefs_updated_at
  BEFORE UPDATE ON pair_sharing_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

