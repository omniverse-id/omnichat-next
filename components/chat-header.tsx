
"use client"

import type React from "react"
import { useState } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  Pencil,
  Check,
  X,
} from "lucide-react"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useSettings } from "@/hooks/use-settings"
import { useChat } from "@/hooks/use-chat"
import { useTokenCount } from "@/hooks/use-token-count"
import { cn } from "@/lib/utils"
import { RenameChatDialog } from "@/components/rename-chat-dialog"

const GEMINI_MODELS = [
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro" },
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "gemini-flash-latest", name: "Gemini Flash Latest" },
  { id: "gemini-flash-lite-latest", name: "Gemini Flash Lite Latest" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" },
]

const GEMINI_IMAGE_MODELS = [
  { id: "gemini-3-pro-image-preview", name: "Nano Banana Pro (Gemini 3 Pro Image)" },
  { id: "gemini-2.5-flash-image", name: "Nano Banana (Gemini 2.5 Flash Image)" },
]

interface ChatHeaderProps {
  isLeftOpen: boolean
  isRightOpen: boolean
  headerTitle: string
  toggleSidebar: (side: "left" | "right") => void
}

// To prevent duplicating the list logic, we create a shared component.
const ModelList = ({
  setSelectedModel,
  setOpen,
  isImagesToolActive,
  currentProvider,
  fetchedModels
}: {
  setSelectedModel: (model: string) => void,
  setOpen: (open: boolean) => void,
  isImagesToolActive: boolean,
  currentProvider: string,
  fetchedModels?: string[]
}) => {
  const models = isImagesToolActive ? GEMINI_IMAGE_MODELS : GEMINI_MODELS
  
  // If not using Gemini and there are fetched models, show them
  if (currentProvider !== 'google' && fetchedModels && fetchedModels.length > 0) {
    return (
      <Command>
        <CommandInput placeholder="Search model..." />
        <CommandList>
          <CommandEmpty>No model found.</CommandEmpty>
          <CommandGroup>
            {fetchedModels.map((model) => (
              <CommandItem
                key={model}
                value={model}
                onSelect={(currentValue) => {
                  setSelectedModel(currentValue)
                  setOpen(false)
                }}
              >
                {model}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    )
  }
  
  // Default: show Gemini models
  return (
    <Command>
      <CommandInput placeholder="Search model..." />
      <CommandList>
        <CommandEmpty>No model found.</CommandEmpty>
        <CommandGroup>
          {models.map((model) => (
            <CommandItem
              key={model.id}
              value={model.id}
              onSelect={(currentValue) => {
                setSelectedModel(model.id)
                setOpen(false)
              }}
            >
              {model.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

export function ChatHeader({
  isLeftOpen,
  isRightOpen,
  headerTitle,
  toggleSidebar
}: ChatHeaderProps) {
  const { settings, updateSettings } = useSettings()
  const { messages, currentChatId, renameChat } = useChat()
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Calculate total tokens
  const totalContent = messages?.map(m => (m.content || "") + (m.reasoning_content || "")).join("\n") || "";
  const { count: sessionTokens, isLoading: isCountingTokens } = useTokenCount(
    totalContent,
    settings.model,
    settings.apiKeys[settings.provider]
  )

  const selectedModelName = [...GEMINI_MODELS, ...GEMINI_IMAGE_MODELS].find(m => m.id === settings.model)?.name || settings.model

  const handleModelSelect = (modelId: string) => {
    updateSettings({ model: modelId });
    setIsModelDropdownOpen(false);
  }

  const handleRename = async (newTitle: string) => {
    if (!currentChatId || !newTitle.trim()) return
    setIsSaving(true)
    try {
      await renameChat(currentChatId, newTitle)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <header className="h-14 flex flex-shrink-0 items-center justify-between px-3">
        <div className="flex items-center gap-1 md:gap-3 text-foreground transition-all duration-300 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleSidebar("left")}
                className="p-2 flex-shrink-0 hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                {isLeftOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{isLeftOpen ? "Hide sidebar" : "Show sidebar"}</p>
            </TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 overflow-hidden group">
              <span className="font-semibold text-base truncate">{headerTitle}</span>
              {messages && messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsRenameDialogOpen(true)}
                  className="h-7 w-7 p-1 hover:bg-muted transition-opacity bg-transparent flex-shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>

            {messages && messages.length > 0 && (
              <div className={cn(
                "text-xs text-muted-foreground whitespace-nowrap px-2 flex items-center gap-1.5 transition-opacity duration-300",
                isCountingTokens && "opacity-50"
              )}>
                <span className="h-1 w-1 rounded-full bg-border" />
                {sessionTokens.toLocaleString()} tokens
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Conditional Rendering: Drawer for Mobile, Popover for Desktop */}
          {isMobile ? (
            <Drawer open={isModelDropdownOpen} onOpenChange={setIsModelDropdownOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 w-[200px] px-3 justify-between text-sm shadow-sm"
                >
                  <span className="font-medium truncate">{selectedModelName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-50" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                {/* Visually hidden title for screen reader accessibility */}
                <DrawerTitle className="sr-only">Select a Model</DrawerTitle>
                <div className="p-4">
                  <ModelList 
                    setSelectedModel={handleModelSelect} 
                    setOpen={setIsModelDropdownOpen} 
                    isImagesToolActive={settings.tools.images}
                    currentProvider={settings.provider}
                    fetchedModels={settings.fetchedModels?.[settings.provider]}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Popover open={isModelDropdownOpen} onOpenChange={setIsModelDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isModelDropdownOpen}
                  className="h-9 w-[300px] px-3 justify-between text-sm shadow-sm"
                >
                  <span className="font-medium">{selectedModelName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <ModelList 
                  setSelectedModel={handleModelSelect} 
                  setOpen={setIsModelDropdownOpen} 
                  isImagesToolActive={settings.tools.images}
                  currentProvider={settings.provider}
                  fetchedModels={settings.fetchedModels?.[settings.provider]}
                />
              </PopoverContent>
            </Popover>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleSidebar("right")}
                className="p-2 hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                {isRightOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{isRightOpen ? "Hide options" : "Show options"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      <RenameChatDialog
        open={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        currentTitle={headerTitle}
        onRename={handleRename}
        isSaving={isSaving}
      />
    </>
  )
}
