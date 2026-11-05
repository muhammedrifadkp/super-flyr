import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-black text-gray-300">404</p>
      <h1 className="text-xl font-semibold text-gray-950">This page isn’t available</h1>
      <p className="max-w-sm text-sm text-gray-600">The offer may have ended or the link is wrong.</p>
      <Link href="/" className="mt-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
        See today’s offers
      </Link>
    </main>
  );
}
