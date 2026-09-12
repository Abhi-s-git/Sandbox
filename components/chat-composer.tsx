"use client"

import {
  ArrowUpIcon,
  ChevronDownIcon,
  CodeXmlIcon,
  CrosshairIcon,
  Gamepad2Icon,
  LayoutGridIcon,
  PlusIcon,
  ShuffleIcon,
  TrendingUpIcon,
  WandSparklesIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group"

const suggestions = [
  { icon: WandSparklesIcon, label: "Voxel survival" },
  { icon: CodeXmlIcon, label: "Ink samurai duel" },
  { icon: ShuffleIcon, label: "Comic-book firefight" },
  { icon: Gamepad2Icon, label: "Realistic battlefield" },
  { icon: CrosshairIcon, label: "Fight-first shooter" },
  { icon: TrendingUpIcon, label: "Jungle expedition drive" },
  { icon: PlusIcon, label: "Sunny kingdom platformer" },
]

function ChatComposer() {
  return (
    <div className="flex w-full flex-col gap-4">
      <InputGroup className="items-stretch">
        <InputGroupTextarea placeholder="Describe the game you want to build..." />
        <InputGroupAddon align="block-end" className="justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="xs" />}>
              <LayoutGridIcon />
              Kimi K3
              <ChevronDownIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Kimi K3</DropdownMenuItem>
              <DropdownMenuItem>Kimi K3 Turbo</DropdownMenuItem>
              <DropdownMenuItem>GPT-4o</DropdownMenuItem>
              <DropdownMenuItem>Claude Sonnet</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="icon" className="rounded-full">
            <ArrowUpIcon />
          </Button>
        </InputGroupAddon>
      </InputGroup>

      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map(({ icon: Icon, label }) => (
          <Button key={label} variant="secondary" size="sm">
            <Icon />
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}

export { ChatComposer }
