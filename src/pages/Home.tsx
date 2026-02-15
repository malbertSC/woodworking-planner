import { Link } from "react-router";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-stone-900">
        Woodworking Planner
      </h1>
      <p className="mt-4 text-lg text-stone-600">
        Plan your woodworking projects with visual layouts and cut lists.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          to="/chest-of-drawers"
          className="group rounded-lg border border-stone-200 bg-white p-6 transition-shadow hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-stone-900 group-hover:text-amber-700">
            Chest of Drawers
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            Design a frameless chest of drawers with configurable columns, rows,
            materials, and construction methods. Includes live visualization,
            detailed plans, and optimized cut lists.
          </p>
        </Link>
      </div>
    </div>
  );
}
