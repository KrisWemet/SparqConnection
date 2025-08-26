import { describe, it, expect } from 'vitest'
import { selectPromptVariant } from '@/lib/cq-variants'

describe('selectPromptVariant', () => {
  it('matches words_affirming variant', () => {
    const sel = selectPromptVariant({ stepId: 'cq.daily_question', flags: { words_affirming: 0.8 } })
    expect(sel?.copy_variant_id).toBe('words_affirming_nudge')
  })

  it('matches time_affirming variant', () => {
    const sel = selectPromptVariant({ stepId: 'cq.daily_question', flags: { time_affirming: 0.8 } })
    expect(sel?.copy_variant_id).toBe('time_affirming_cta')
  })

  it('deterministic tiebreaker by id', () => {
    const sel = selectPromptVariant({ stepId: 'cq.daily_question', flags: { words_affirming: 0.8, time_affirming: 0.8 } })
    // base doc has words_affirming_nudge < time_affirming_cta lexically
    expect(sel?.copy_variant_id).toBe('time_affirming_cta' < 'words_affirming_nudge' ? 'time_affirming_cta' : 'words_affirming_nudge')
  })

  it('falls back when no match', () => {
    const sel = selectPromptVariant({ stepId: 'cq.daily_question', flags: {} })
    expect(sel?.copy_variant_id).toBe('base')
  })

  it('entropy low → base', () => {
    const sel = selectPromptVariant({ stepId: 'cq.daily_question', flags: { words_affirming: 0.8 }, entropyLow: true })
    expect(sel?.copy_variant_id).toBe('base')
  })

  it('applies pairing overlay only when provided', () => {
    const sel = selectPromptVariant({ stepId: 'cq.daily_question', flags: { words_affirming: 0.8 }, pairing: 'anx_avoid' })
    expect(sel?.text).toMatch(/check in at 7pm/)
  })
})

