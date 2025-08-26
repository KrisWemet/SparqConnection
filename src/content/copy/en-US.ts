export const copy = {
  tour: {
    s1: { title: "A 5-minute daily boost for your relationship", body: "Small prompts. Tiny actions. Real warmth—without big talks.", cta: "Set me up (60 sec)" },
    s2: { title: "One simple flow each day", body: "Pick how you want to show up → answer one question → try a tiny action → write a quick note → appreciate your partner. You can skip or swap anything." },
    s3: { title: "Small steps that add up", body: "Short check-ins reduce misunderstandings. Noticing effort grows trust. Tiny wins beat big promises." },
    s4: { title: "With or without your partner", body: "Works solo. Even better together. Invite them any time—no pressure.", ctaSolo: "I’m solo for now", ctaInvite: "Invite my partner" },
    s5: { title: "Make it your style", body: "Choose when to get your prompt and how you like to show care." },
    s6: { title: "Let’s try today’s 5 minutes", cta: "Start today’s flow" }
  },
  cards: {
    identity: { title: "How I’ll show up today", subtitle: "Pick a small quality to practice.", why: "Naming a small intention makes it easier to act on it." },
    reset: { title: "30-second reset", subtitle: "One breath to slow down.", why: "A short pause makes moments easier." },
    dq: { title: "Today’s connection question", subtitle: "A quick prompt to understand each other better.", swap: "Show me another question", why: "Short talk > silent guesses.", clarityYes: "Makes sense", clarityNo: "Confusing" },
    action: { title: "One tiny kind act", subtitle: "1–2 minutes, your style.", done: "Mark done", why: "Small actions add up." },
    journal: { title: "Note to myself", subtitle: "Encrypted by default.", why: "Noticing small shifts helps them stick." },
    thanks: { title: "Say what you noticed", subtitle: "One sentence, your way (Text/Voice/In person).", copy: "Copy & send", why: "Small, specific praise makes care feel real." },
    reflect: { title: "What shifted today?", subtitle: "Tiny check-in to close the loop.", why: "Small wins keep the habit going." }
  },
  help: {
    identity: { title: "Identity", body: "Choose one small quality for today. You’re not changing forever—just practicing now." },
    reset: { title: "Reset", body: "One slow breath makes hard moments easier." },
    dq: { title: "Question", body: "A tiny prompt to understand each other better." },
    action: { title: "Action", body: "A 1–2 minute act that fits your style." },
    journal: { title: "Journal", body: "Private by default. You can keep it that way." },
    thanks: { title: "Appreciation", body: "Notice something specific and name its impact." },
    reflect: { title: "Reflection", body: "Name one thing that shifted. That’s progress." }
  },
  glossary: {
    bids: "connection cues",
    turnToward: "respond warmly",
    repair: "quick fix",
    attachment: "how you handle closeness",
    boundaries: "what feels okay / not okay",
    consent: "check if now is a good time"
  }
}

export type Copy = typeof copy
