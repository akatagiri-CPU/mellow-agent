import Link from "next/link";
import { notFound } from "next/navigation";
import { BOXES } from "@/lib/types";

export default async function BoxPage({
  params,
}: {
  params: Promise<{ boxId: string }>;
}) {
  const { boxId } = await params;
  const box = BOXES.find((b) => b.id === boxId);

  if (!box) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
          ← 箱一覧に戻る
        </Link>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-xl font-semibold text-gray-900">{box.label}</h1>
        <p className="mt-3 text-gray-500">準備中です</p>
      </main>
    </div>
  );
}
