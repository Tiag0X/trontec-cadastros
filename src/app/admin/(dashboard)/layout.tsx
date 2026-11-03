import { ReactNode } from "react"
import { Sidebar } from "@/components/admin/sidebar"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserCircle } from "lucide-react"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden border-l border-border">
        <header className="h-16 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur flex items-center justify-between px-6">
          <h1 className="text-sm font-medium text-muted-foreground">Painel administrativo</h1>
          <div className="flex items-center gap-3">
            <div className="text-sm text-right leading-tight">
              <p className="font-medium">{session?.user?.name}</p>
              <p className="text-muted-foreground text-xs">{session?.user?.email}</p>
            </div>
            <div className="h-9 w-9 bg-muted rounded-full flex items-center justify-center text-muted-foreground ring-1 ring-border">
              <UserCircle className="h-5 w-5" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="mx-auto w-full max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
