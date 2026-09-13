import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { listGames } from "@/lib/games/queries"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const games = await listGames()

  return (
    <SidebarProvider>
      <AppSidebar games={games} />
      <SidebarInset>
        <SidebarTrigger />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
