'use client'

import React from 'react'
import Button from './button'
import { trackEvent } from '@/lib/analytics'

type Props = {
  href: string
  where: string
  children: React.ReactNode
  className?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
}

export default function NudgeLink({ href, where, children, className, variant = 'primary' }: Props) {
  return (
    <Button
      as="a"
      href={href}
      variant={variant}
      className={className}
      onClick={() => trackEvent('nudge_click', { where })}
    >
      {children}
    </Button>
  )
}

