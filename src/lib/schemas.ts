// lib/schemas.ts
import { z } from "zod";

/** Tag enums mirror docs/CONTENT_TAGS.md */
export const AttachmentTag = z.enum(["avoidant","anxious","secure","mixed"]);
export const ModalityTag   = z.enum(["nvc","cbt","gottman","ipt","imago","mindfulness"]);
export const DepthTag      = z.enum(["light","deep","repair"]);
export const ContextTag    = z.enum(["parents","ldr","dating","newlyweds","roommates","finance","sex","shiftwork","travel","stress"]);
// Additional tags found in seed content
export const LoveLanguageTag = z.enum(["words","acts","time","gifts","touch"]);
export const ActivityTag = z.enum(["play","ritual","boundaries","consent"]);

export const ContentTags = z.array(
  z.union([AttachmentTag, ModalityTag, DepthTag, ContextTag, LoveLanguageTag, ActivityTag])
).max(6);

/** Canonical "base content" authored by us (pre‑AI) */
export const BaseDayContentSchema = z.object({
  story: z.string().min(1),
  dq: z.string().min(1),                 // daily question
  micro_action: z.string().min(1),
  journal: z.string().min(1),
  reflection: z.string().min(1),
  tags: ContentTags.default([])
});

/** What the Personalizer must output. Keep it tight for reliability. */
export const DailyPlanSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD in user's IANA tz
  identity: z.string().min(1),                  // selected identity for the day
  story: z.string().min(1).max(500),
  dq: z.string().min(1).max(240),
  micro_action: z.string().min(1).max(240),
  journal: z.string().min(1).max(240),
  reflection: z.string().min(1).max(240),
  appreciation_templates: z.array(z.string().min(1)).max(4).default([]),
  tags: ContentTags.default([]),
  version: z.number().int().min(1)
});

export type DailyPlan = z.infer<typeof DailyPlanSchema>;
export type BaseDayContent = z.infer<typeof BaseDayContentSchema>;

/** Utility to assert at runtime after LLM call */
export function parseDailyPlan(json: unknown): DailyPlan {
  return DailyPlanSchema.parse(json);
}