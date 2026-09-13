"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
import { ClockIcon, CoinsIcon, MessageSquareIcon, PlusIcon } from "lucide-react"


import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

type Game = {
  id: string
  title: string
}

function AppSidebar({ games = [] }: { games?: Game[] }) {
  const pathname = usePathname()
  const { state } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-1">
            <SidebarTrigger />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/" />}
                  isActive={pathname === "/"}
                >
                  <PlusIcon />
                  <span>New game</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <ClockIcon />
            Recents
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {state === "collapsed" ? (
              <SidebarMenu>
                <SidebarMenuItem>
                  <Popover>
                    <PopoverTrigger render={<SidebarMenuButton />}>
                      <ClockIcon />
                      <span>Recents</span>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      side="right"
                      className="w-56 max-h-[60vh] overflow-y-auto"
                    >
                      {games.map((game) => (
                        <Link
                          key={game.id}
                          href={`/games/${game.id}`}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <MessageSquareIcon className="size-4 shrink-0" />
                          <span className="truncate">{game.title}</span>
                        </Link>
                      ))}
                    </PopoverContent>
                  </Popover>
                </SidebarMenuItem>
              </SidebarMenu>
            ) : (
              <SidebarMenu>
                {games.map((game) => (
                  <SidebarMenuItem key={game.id}>
                    <SidebarMenuButton
                      render={<Link href={`/games/${game.id}`} />}
                    >
                      <MessageSquareIcon />
                      <span>{game.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <CoinsIcon />
              <span>credits</span>
            </SidebarMenuButton>
            <SidebarMenuBadge>12</SidebarMenuBadge>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="group-data-[collapsible=icon]:hidden">
            <OrganizationSwitcher
              appearance={{
                elements: {
                  rootbox: "w-full! max-w-full",
                  organizationSwitcherTrigger:
                    "w-full! max-w-full justify-between!",
                  organizationPreview: "min-w-0",
                  organizationPreviewTextConatiner: "min-w-0",
                  organizationPreviewMainIdentifier: "trucnate",
                },
              }}
            />
          </div>
          <UserButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

export { AppSidebar }
