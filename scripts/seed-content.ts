// scripts/seed-content.ts
import { config } from 'dotenv';
config({ path: '.env.local' });   // <-- make sure we load .env.local
import { createClient } from '@supabase/supabase-js';
import { BaseDayContentSchema } from '../src/lib/schemas';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service role only for seeding
const supabase = createClient(url, key);

type Day = {
  story: string; dq: string; micro_action: string; journal: string; reflection: string; tags: string[];
};

type Quest = { id: string; title: string; version: number; days: Day[] };

const ESF: Quest = {
  id: 'q_emotional_safety',
  title: 'Emotional Safety Foundations',
  version: 1,
  days: [
    { story:"A small moment where one partner took a breath before replying.",
      dq:"What helps you feel safe to share when something's awkward?",
      micro_action:"Before answering, inhale 4, exhale 6 once today.",
      journal:"One situation where a pause helped (or could have).",
      reflection:"Name one cue that says 'it's safe here.'",
      tags:["light","mindfulness"]
    },
    { story:"Reassurance after a misread tone.",
      dq:"Which kinds of check‑ins feel supportive vs. smothering?",
      micro_action:"Send a short check‑in with choice (e.g., 'text/voice/no reply needed').",
      journal:"How did offering choice land for us?",
      reflection:"One phrasing I liked hearing today.",
      tags:["avoidant","nvc","parents"]
    },
    { story:"Owning a small mistake quickly.",
      dq:"What makes apologies feel sincere to you?",
      micro_action:"Use a 3‑part repair: name impact • own it • offer next time.",
      journal:"A time I appreciated a quick repair.",
      reflection:"One tiny 'next time' I can try.",
      tags:["repair","gottman"]
    },
    { story:"Turning down the volume on a tense topic.",
      dq:"When should we take a 10‑minute pause vs. keep going?",
      micro_action:"Suggest a timed pause once today, then return kindly.",
      journal:"Pause helped/hurt because…",
      reflection:"A better re‑entry line for us is…",
      tags:["mindfulness","deep"]
    },
    { story:"Appreciating effort, not outcome.",
      dq:"What kind of effort feels seen for you?",
      micro_action:"Spot one effort out loud within 24 hours.",
      journal:"What I noticed them trying.",
      reflection:"How did naming effort shift the mood?",
      tags:["words","nvc","light"]
    },
    { story:"Predictable check‑ins reduce anxiety.",
      dq:"What rhythm of updates lowers stress (daily? when late?)",
      micro_action:"Agree on one predictable update for this week.",
      journal:"What rhythm felt good today?",
      reflection:"One boundary that made things easier.",
      tags:["anxious","parents","roommates"]
    },
    { story:"Rituals that say 'we're ok.'",
      dq:"What tiny ritual could anchor us this week?",
      micro_action:"Start one 2‑minute ritual (eg tea & 1 question).",
      journal:"How did that ritual feel?",
      reflection:"One tweak to make it stick.",
      tags:["light","mindfulness"]
    }
  ]
};

const AAB: Quest = {
  id: 'q_appreciation_bids',
  title: 'Appreciation & Bids',
  version: 1,
  days: [
    { story:"A small bid ('look at this meme!') lands.",
      dq:"What do your bids usually look like?",
      micro_action:"Turn toward one bid today (even briefly).",
      journal:"A bid I might miss sometimes is…",
      reflection:"How did turning toward feel?",
      tags:["light","gottman"]
    },
    { story:"Noticing acts vs. words.",
      dq:"Which appreciations land best (acts/words/time/gifts/touch)?",
      micro_action:"Give one appreciation in their top LL.",
      journal:"What I appreciated today.",
      reflection:"Which template felt natural?",
      tags:["acts","words","time"]
    },
    { story:"Specific over generic.",
      dq:"What makes a compliment feel real?",
      micro_action:"Use a 2‑part appreciation: specific behavior → impact.",
      journal:"I noticed you ___ and it helped ___.",
      reflection:"One area I want to notice more.",
      tags:["words","nvc"]
    },
    { story:"Bid repair after a miss.",
      dq:"When a bid is missed, what repair helps?",
      micro_action:"Name the miss + small make‑good.",
      journal:"A bid I want to repair.",
      reflection:"What made repair easier?",
      tags:["repair","gottman"]
    },
    { story:"Quiet bids from avoidant partner.",
      dq:"What are your subtle bids?",
      micro_action:"Check in with choice (reply optional).",
      journal:"Which subtle cue I noticed.",
      reflection:"How choice changed the feel.",
      tags:["avoidant","light"]
    },
    { story:"Public vs private appreciation.",
      dq:"Where do appreciations feel best (text, voice, in person)?",
      micro_action:"Send one in preferred channel.",
      journal:"How did the channel impact it?",
      reflection:"One channel to avoid.",
      tags:["words","time"]
    },
    { story:"Appreciation ritual.",
      dq:"What 1‑minute ritual keeps appreciation alive?",
      micro_action:"Start a nightly one‑liner ritual.",
      journal:"The line I shared.",
      reflection:"How to keep it fresh.",
      tags:["light","ritual"]
    }
  ]
};

const RB: Quest = {
  id: 'q_repair_basics',
  title: 'Repair Basics (No‑Trauma)',
  version: 1,
  days: [
    { story:"Sincere apologies matter.",
      dq:"What makes 'I'm sorry' feel real?",
      micro_action:"Try a 3‑part repair today.",
      journal:"A recent moment I'd repair differently.",
      reflection:"One line that would help me say in repairs.",
      tags:["repair","nvc"]
    },
    { story:"Pauses prevent blowups.",
      dq:"How should we signal 'I need a pause'?",
      micro_action:"Create a pause cue + re‑entry line.",
      journal:"When a pause might have helped.",
      reflection:"A re‑entry line I like.",
      tags:["mindfulness"]
    },
    { story:"Do‑overs can be gentle.",
      dq:"What's a small do‑over from this week?",
      micro_action:"Ask for a redo, kindly.",
      journal:"What I learned from the redo.",
      reflection:"One micro‑habit to reduce repeats.",
      tags:["light","repair"]
    },
    { story:"Consent before hard topics.",
      dq:"How do you prefer to be approached about hard stuff?",
      micro_action:"Ask consent before feedback.",
      journal:"What 'yes' vs 'not now' feels like.",
      reflection:"A softer opener I can use.",
      tags:["consent","nvc"]
    },
    { story:"Boundaries reduce friction.",
      dq:"What boundary reduces repeat friction?",
      micro_action:"Set one boundary kindly + reason.",
      journal:"What the boundary protects.",
      reflection:"A respectful follow‑through step.",
      tags:["boundaries"]
    },
    { story:"Signals of change.",
      dq:"What helps you believe change is coming?",
      micro_action:"Name one 'next time I'll…'.",
      journal:"Where progress showed up.",
      reflection:"One small win to keep.",
      tags:["repair"]
    },
    { story:"Celebrate repairs.",
      dq:"How can we celebrate repairs?",
      micro_action:"Acknowledge a repair with gratitude.",
      journal:"What celebration felt good.",
      reflection:"A tradition we could keep.",
      tags:["words","light"]
    }
  ]
};

const PR: Quest = {
  id: 'q_playful_resets',
  title: 'Playful Resets',
  version: 1,
  days: [
    { story:"Shared silliness lowers stress.",
      dq:"What silly thing reliably makes you smile?",
      micro_action:"Send one playful thing today.",
      journal:"What landed well?",
      reflection:"Where lightness helped.",
      tags:["light","play"]
    },
    { story:"3‑minute games count.",
      dq:"What kind of game sounds fun for 3 minutes?",
      micro_action:"Try 'You or Me?' round.",
      journal:"A fun discovery about us.",
      reflection:"A game we might revisit.",
      tags:["play"]
    },
    { story:"Mini-dates at home.",
      dq:"Favorite mini date at home?",
      micro_action:"Plan a 20‑min mini date.",
      journal:"How it felt.",
      reflection:"A tweak for next time.",
      tags:["time","parents"]
    },
    { story:"Music shifts mood.",
      dq:"Music that shifts your mood?",
      micro_action:"Share one song; listen together.",
      journal:"What the song changed.",
      reflection:"Our go‑to vibe setter.",
      tags:["light"]
    },
    { story:"Weekly traditions.",
      dq:"A tradition we'd enjoy weekly?",
      micro_action:"Pilot it once.",
      journal:"How the pilot went.",
      reflection:"Keep/Change/Drop?",
      tags:["ritual","light"]
    },
    { story:"Inviting play with choice.",
      dq:"How do you like to be invited to play?",
      micro_action:"Invite with choice.",
      journal:"How autonomy affected it.",
      reflection:"My best invite line.",
      tags:["avoidant","play"]
    },
    { story:"Sweet, not stressful surprises.",
      dq:"What surprise would feel sweet, not stressful?",
      micro_action:"Do a tiny surprise (opt‑out friendly).",
      journal:"Their reaction.",
      reflection:"Surprise guidelines for us.",
      tags:["consent","light"]
    }
  ]
};

const QUESTS: Quest[] = [ESF, AAB, RB, PR];

async function main() {
  // Ensure table exists with these columns:
  // quest_days(id uuid default gen_random_uuid() pk,
  //   quest_id text, day int, version int,
  //   base_content jsonb, tags text[])

  for (const q of QUESTS) {
    for (let i = 0; i < q.days.length; i++) {
      const d = q.days[i];
      // Basic validation against our schema
      BaseDayContentSchema.parse({
        story: d.story, dq: d.dq, micro_action: d.micro_action,
        journal: d.journal, reflection: d.reflection, tags: d.tags
      });

      const { error } = await supabase
        .from('quest_days')
        .upsert({
          quest_id: q.id,
          day: i + 1,
          version: q.version,
          base_content: {
            story: d.story,
            dq: d.dq,
            micro_action: d.micro_action,
            journal: d.journal,
            reflection: d.reflection,
            tags: d.tags
          },
          tags: d.tags
        }, { onConflict: 'quest_id,day,version' });

      if (error) {
        console.error(`Upsert failed for ${q.id} day ${i + 1}:`, error.message);
        process.exitCode = 1;
      } else {
        console.log(`Seeded ${q.id} day ${i + 1}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});