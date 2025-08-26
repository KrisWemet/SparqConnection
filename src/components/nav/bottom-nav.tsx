'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/home', label: 'Home' },
  { href: '/today', label: 'Today' },
  { href: '/connections', label: 'Connect' },
  { href: '/play', label: 'Play' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 inset-x-0 md:hidden z-40 bg-white/95 backdrop-blur border-t border-gray-200">
      <ul className="grid grid-cols-4">
        {items.map((it) => {
          const active = pathname === it.href || pathname?.startsWith(it.href + '/')
          return (
            <li key={it.href} className="text-center">
              <Link
                href={it.href}
                className={`block py-3 text-sm font-medium ${active ? 'text-pink-600' : 'text-gray-700'} hover:text-pink-700`}
              >
                {it.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

