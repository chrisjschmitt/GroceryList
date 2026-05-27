import Link from "next/link";
import GroceryList from "@/components/GroceryList";

export default function Home() {
  return (
    <main className="flex-1 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span>🛒</span>
              <span>GroceryList</span>
            </h1>
            <Link
              href="/admin"
              className="text-sm text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
            >
              ⚙️ Admin
            </Link>
          </div>
          <p className="mt-2 text-gray-500">
            Compare prices across local stores and save on your grocery bill
          </p>
        </header>

        <GroceryList />
      </div>
    </main>
  );
}
