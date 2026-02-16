export function Layout({ children }) {
  return (
    <div className="min-h-screen p-4 flex flex-col gap-3 max-w-[1600px] mx-auto">
      {children}
    </div>
  )
}
