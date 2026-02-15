import { Link, Outlet } from "react-router";

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-stone-200 bg-white">
        <nav className="mx-auto flex max-w-7xl items-center px-4 py-3">
          <Link to="/" className="text-lg font-semibold text-stone-900">
            Woodworking Planner
          </Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
