import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Feedtratto
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Assistente</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="px-4">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-4 pt-0">
          <div className="w-full max-w-2xl space-y-6">
            {/* Logo/Title */}
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Feedtratto AI</h1>
              <p className="text-sm text-muted-foreground">
                Como posso ajudar você hoje?
              </p>
            </div>

            {/* Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Envie uma mensagem para o Feedtratto AI"
                className="w-full rounded-3xl border border-input bg-background px-4 py-3 pr-11 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-primary p-1.5 text-primary-foreground hover:bg-primary/90 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                </svg>
              </button>
            </div>

            {/* Suggestions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button className="rounded-xl border border-border bg-card p-3 text-left hover:bg-accent transition-colors">
                <p className="text-xs font-medium">Como criar um novo lote?</p>
              </button>
              <button className="rounded-xl border border-border bg-card p-3 text-left hover:bg-accent transition-colors">
                <p className="text-xs font-medium">Mostre meus lotes ativos</p>
              </button>
              <button className="rounded-xl border border-border bg-card p-3 text-left hover:bg-accent transition-colors">
                <p className="text-xs font-medium">Como cadastrar uma dieta?</p>
              </button>
              <button className="rounded-xl border border-border bg-card p-3 text-left hover:bg-accent transition-colors">
                <p className="text-xs font-medium">Qual o GMD médio dos meus lotes?</p>
              </button>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
