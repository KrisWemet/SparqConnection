-- 013_quest_days_unique.sql

-- Only add if there are no duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM (
      SELECT quest_id, day, COUNT(*) c
      FROM quest_days
      GROUP BY 1,2
      HAVING COUNT(*) > 1
    ) d
  ) THEN
    -- Use a unique index; ON CONFLICT (quest_id, day) can infer from this
    CREATE UNIQUE INDEX IF NOT EXISTS idx_quest_days_quest_day_unique
      ON quest_days(quest_id, day);
  END IF;
END $$;
