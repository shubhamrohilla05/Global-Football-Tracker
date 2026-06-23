/** Loading skeleton for the match route. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="skeleton h-4 w-64 rounded" />
      <div className="glass-card mt-6 p-0">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
        <div className="grid grid-cols-3 items-center gap-4 px-6 py-10 sm:px-10">
          <div className="flex flex-col items-center gap-3">
            <div className="skeleton h-16 w-16 rounded-2xl" />
            <div className="skeleton h-4 w-20 rounded" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="skeleton h-10 w-24 rounded" />
            <div className="skeleton h-4 w-16 rounded-full" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="skeleton h-16 w-16 rounded-2xl" />
            <div className="skeleton h-4 w-20 rounded" />
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-16 w-full rounded-xl" />
        ))}
      </div>
      <div className="mt-8">
        <div className="skeleton h-6 w-40 rounded" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
