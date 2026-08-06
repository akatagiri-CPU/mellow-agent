import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { BOXES } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">AI部長</h1>
        <div className="flex items-center gap-4">
          {profile?.role === "mellow_admin" && (
            <Link
              href="/admin"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              管理画面
            </Link>
          )}
          <span className="text-sm text-gray-600">{profile?.name ?? user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BOXES.map((box) => (
            <Link
              key={box.id}
              href={`/boxes/${box.id}`}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <h2 className="text-base font-semibold text-gray-900">{box.label}</h2>
              <p className="mt-1 text-sm text-gray-500">{box.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
