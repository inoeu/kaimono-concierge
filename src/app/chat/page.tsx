import { redirect } from "next/navigation"

type SearchParams = Promise<{ q?: string | string[] }>

export default async function ChatRedirect({
  searchParams
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q
  if (q) {
    redirect(`/?start=${encodeURIComponent(q)}`)
  }
  redirect("/")
}
