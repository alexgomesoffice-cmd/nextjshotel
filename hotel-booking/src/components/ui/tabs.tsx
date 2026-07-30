"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col data-[orientation=vertical]:flex-row",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center text-muted-foreground group-data-[orientation=horizontal]/tabs:h-10 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "rounded-lg bg-muted p-[3px]",
        line: "gap-1 border-b border-border bg-transparent rounded-none p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Base
        "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",

        // Default variant (pill)
        "group-data-[variant=default]/tabs-list:rounded-md",
        "group-data-[variant=default]/tabs-list:px-3",
        "group-data-[variant=default]/tabs-list:py-1.5",
        "group-data-[variant=default]/tabs-list:border",
        "group-data-[variant=default]/tabs-list:border-transparent",
        "group-data-[variant=default]/tabs-list:data-[state=active]:bg-background",
        "group-data-[variant=default]/tabs-list:data-[state=active]:text-foreground",
        "group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm",

        // Line variant
        "group-data-[variant=line]/tabs-list:rounded-none",
        "group-data-[variant=line]/tabs-list:px-4",
        "group-data-[variant=line]/tabs-list:py-2",
        "group-data-[variant=line]/tabs-list:text-muted-foreground",
        "group-data-[variant=line]/tabs-list:hover:text-foreground",
        "group-data-[variant=line]/tabs-list:data-[state=active]:text-foreground",

        // Underline
        "group-data-[variant=line]/tabs-list:after:absolute",
        "group-data-[variant=line]/tabs-list:after:left-0",
        "group-data-[variant=line]/tabs-list:after:right-0",
        "group-data-[variant=line]/tabs-list:after:bottom-[-1px]",
        "group-data-[variant=line]/tabs-list:after:h-0.5",
        "group-data-[variant=line]/tabs-list:after:bg-primary",
        "group-data-[variant=line]/tabs-list:after:scale-x-0",
        "group-data-[variant=line]/tabs-list:after:transition-transform",
        "group-data-[variant=line]/tabs-list:data-[state=active]:after:scale-x-100",

        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }