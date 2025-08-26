```json
{
  "CANONICAL_DAY": {"story":"...","dq":"...","micro_action":"...","journal":"...","reflection":"...","tags":["parents","light"]},
  "USER_PROFILE": {
    "identity":"Patient Listener",
    "attachment":"avoidant|anxious|secure|mixed",
    "love_languages":["acts","words","time","gifts","touch"],
    "boundaries_comfort": 1-5,
    "time_pref":"morning|evening",
    "context": {"life_stage":"married","long_distance":false,"cohabiting":true,"children_count":1,"shift_worker":false,"cultural_notes":null}
  },
  "QUEST": {"id":"QID","title":"TITLE","day":1},
  "RECENT": {"micro_done":true,"streak":3},
  "VERSION": 1,
  "SCHEMA": "DailyPlanSchema"
}
```

**Adaptation rules**

* If attachment=avoidant → emphasize autonomy/choice; short prompts; action first.
* If love language includes `acts` → offer action phrasing and practical suggestions.
* If tags mismatch with context → swap to alternative with intersecting tags.
* Appreciation templates ordered by top two Love Languages.

**Output JSON shape**: see `lib/schemas.ts` (DailyPlanSchema).