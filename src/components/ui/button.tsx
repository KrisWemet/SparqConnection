'use client'

import React from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost'

export default function Button({
  variant = 'primary',
  className = '',
  as = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  className?: string
  as?: 'button' | 'a'
}) {
  const base = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px]'
  const styles: Record<Variant, string> = {
    primary: 'bg-[var(--color-primary,#FF6B6B)] text-white hover:brightness-110 focus:ring-[var(--color-primary,#FF6B6B)]',
    secondary: 'bg-gray-900 text-white hover:bg-black focus:ring-gray-900',
    outline: 'border border-gray-300 text-gray-800 hover:bg-gray-50 focus:ring-gray-400',
    ghost: 'text-gray-700 hover:bg-gray-50 focus:ring-gray-300',
  }
  const cls = `${base} ${styles[variant]} ${className}`

  if (as === 'a') {
    // @ts-ignore
    return <a className={cls} {...props} />
  }
  return <button className={cls} {...props} />
}

