import Link from "next/link"
import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TaskNotFound() {
  return (
    <div className="max-w-md mx-auto py-16 px-4 text-center">
      <div className="inline-flex rounded-full bg-zinc-100 p-4 mb-6">
        <FileQuestion className="w-10 h-10 text-zinc-400" strokeWidth={1.5} />
      </div>
      <h1 className="font-condensed text-2xl font-bold text-zinc-800 tracking-tight">
        Task not found
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        This task does not exist or you do not have access to it in your
        workspace.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild className="bg-byred-red hover:bg-byred-red-hot text-white">
          <Link href="/tasks">Back to tasks</Link>
        </Button>
        <Button asChild variant="outline" className="border-zinc-300">
          <Link href="/dashboard">Command Center</Link>
        </Button>
      </div>
    </div>
  )
}
