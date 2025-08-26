export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">✨ Sparq</h1>
          <p className="text-gray-600">Building stronger connections, one day at a time</p>
        </div>
        {children}
      </div>
    </div>
  )
}