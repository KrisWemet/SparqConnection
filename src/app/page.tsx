// Public Landing page
import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-pink-50">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <header className="flex items-center justify-between">
          <div className="text-xl font-bold">✨ Sparq Connection</div>
          <nav className="space-x-4 text-sm">
            <Link href="/privacy" className="text-gray-600 hover:text-gray-900">Privacy</Link>
            <Link href="/terms" className="text-gray-600 hover:text-gray-900">Terms</Link>
            <Link href="/auth" className="inline-block px-4 py-2 rounded-md border text-gray-700 hover:bg-gray-50">Sign in</Link>
          </nav>
        </header>

        <section className="mt-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
              5 minutes a day to feel closer
            </h1>
            <p className="mt-4 text-lg text-gray-700">
              A simple 5–8 minute ritual for couples. Small prompts. Tiny actions. Real warmth—no heavy talks.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link href="/auth" className="px-6 py-3 rounded-md bg-pink-600 text-white font-medium hover:bg-pink-700">
                Get started
              </Link>
              <Link href="/auth" className="px-6 py-3 rounded-md border text-gray-800 hover:bg-gray-50">
                Create account
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-xl border bg-white shadow p-6">
              <div className="text-6xl">💑</div>
              <p className="mt-4 text-gray-700">Short, doable steps—works even if your partner is busy.</p>
              <ul className="mt-4 space-y-2 text-gray-600 text-sm">
                <li>• Choose how you want to show up</li>
                <li>• Answer one quick question</li>
                <li>• Try a tiny kind action</li>
                <li>• Note one line (private)</li>
                <li>• Appreciate your partner</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

