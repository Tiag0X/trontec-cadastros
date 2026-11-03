"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, LayoutDashboard, FileCheck2, Download, LogOut } from "lucide-react"
import { signOut } from "next-auth/react"

export function Sidebar() {
  const pathname = usePathname()

  const links = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/condominios", label: "Condomínios", icon: Building2 },
    { href: "/admin/cadastros", label: "Revisão", icon: FileCheck2 },
    { href: "/admin/exportacoes", label: "Exportações", icon: Download },
  ]

  return (
    <aside className="w-60 bg-sidebar flex flex-col h-full">
      <div className="h-16 flex items-center px-5 shrink-0">
        <img
          src="https://trontec.com.br/wp-content/uploads/2020/02/logo.fw_.png"
          alt="Trontec"
          className="h-7 object-contain opacity-95"
        />
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        <p className="px-3 pb-2 text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground/70">
          Menu
        </p>
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
              )}
              <Icon className={`h-[1.15rem] w-[1.15rem] transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 mt-auto">
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-[1.15rem] w-[1.15rem]" />
          Sair
        </button>
      </div>
    </aside>
  )
}
