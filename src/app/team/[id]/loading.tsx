/** Loading skeleton for the team route. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-4">
        <div className="skeleton h-12 w-12 rounded-2xl" />
        <div className="space-y-2">
          <div className="skeleton h-3 w-16 rounded" />
          <div className="skeleton h-6 w-48 rounded" />
          <div className="skeleton h-3 w-72 rounded" />
        </div>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="skeleton h-6 w-40 rounded" />
          <div className="skeleton h-28 w-full rounded-xl" />
          <div className="skeleton h-6 w-32 rounded" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="skeleton h-6 w-32 rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
