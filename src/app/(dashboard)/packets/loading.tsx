export default function PacketsLoading() {
  return (
    <div className="px-4 pt-2 pb-8 space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i}>
          <div className="flex justify-between mb-3 px-1">
            <div className="space-y-1.5">
              <div className="h-4 w-28 bg-gray-200 rounded-lg" />
              <div className="h-3 w-20 bg-gray-100 rounded-lg" />
            </div>
            <div className="space-y-1.5 items-end flex flex-col">
              <div className="h-4 w-14 bg-gray-200 rounded-lg" />
              <div className="h-3 w-16 bg-gray-100 rounded-lg" />
            </div>
          </div>
          {[...Array(2)].map((_, j) => (
            <div key={j} className="h-16 bg-gray-100 rounded-2xl mb-2" />
          ))}
        </div>
      ))}
    </div>
  );
}
