export default function Home() {
  return (
    <main className="min-h-screen bg-white px-6 py-16 text-gray-900">
      <div className="mx-auto max-w-2xl">
        <p className="text-lg font-bold">PainSignal AI</p>

        <h1 className="mt-12 text-4xl font-bold tracking-tight">
          Find related GitHub reports
        </h1>

        <p className="mt-4 text-lg leading-8 text-gray-600">
          Explore issues that may describe similar problems, then inspect
          the original reports.
        </p>

        <p className="mt-6 text-sm text-gray-600">
          Related reports do not necessarily share the same root cause.
        </p>
      </div>
    </main>
  );
}