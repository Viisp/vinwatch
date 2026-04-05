"use client";

import {
  type EmojiPickerListCategoryHeaderProps,
  type EmojiPickerListEmojiProps,
  type EmojiPickerListRowProps,
  EmojiPicker as EmojiPickerPrimitive,
} from "frimousse";
import { LoaderIcon, SearchIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

function EmojiPicker({ className, ...props }: React.ComponentProps<typeof EmojiPickerPrimitive.Root>) {
  return (
    <EmojiPickerPrimitive.Root
      className={cn("isolate flex h-full w-fit flex-col overflow-hidden rounded-xl bg-[#0d1b2a] border border-[#243552]", className)}
      {...props}
    />
  );
}

function EmojiPickerSearch({ className, ...props }: React.ComponentProps<typeof EmojiPickerPrimitive.Search>) {
  return (
    <div className={cn("flex h-9 items-center gap-2 border-b border-[#243552] px-3", className)}>
      <SearchIcon className="size-4 shrink-0 text-slate-500" />
      <EmojiPickerPrimitive.Search
        className="flex h-10 w-full bg-transparent py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none"
        placeholder="Rechercher…"
        {...props}
      />
    </div>
  );
}

function EmojiPickerRow({ children, ...props }: EmojiPickerListRowProps) {
  return <div {...props} className="scroll-my-1 px-1">{children}</div>;
}

function EmojiPickerEmoji({ emoji, className, ...props }: EmojiPickerListEmojiProps) {
  return (
    <button
      {...props}
      className={cn("data-[active]:bg-[#1a2d42] flex size-7 items-center justify-center rounded-md text-base hover:bg-[#1a2d42] transition-colors", className)}
    >
      {emoji.emoji}
    </button>
  );
}

function EmojiPickerCategoryHeader({ category, ...props }: EmojiPickerListCategoryHeaderProps) {
  return (
    <div {...props} className="bg-[#0d1b2a] text-slate-500 px-3 pb-2 pt-3.5 text-xs leading-none">
      {category.label}
    </div>
  );
}

function EmojiPickerContent({ className, ...props }: React.ComponentProps<typeof EmojiPickerPrimitive.Viewport>) {
  return (
    <EmojiPickerPrimitive.Viewport
      className={cn("outline-none relative flex-1", className)}
      {...props}
    >
      <EmojiPickerPrimitive.Loading className="absolute inset-0 flex items-center justify-center text-slate-500">
        <LoaderIcon className="size-4 animate-spin" />
      </EmojiPickerPrimitive.Loading>
      <EmojiPickerPrimitive.Empty className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
        Aucun emoji trouvé.
      </EmojiPickerPrimitive.Empty>
      <EmojiPickerPrimitive.List
        className="select-none pb-1"
        components={{ Row: EmojiPickerRow, Emoji: EmojiPickerEmoji, CategoryHeader: EmojiPickerCategoryHeader }}
      />
    </EmojiPickerPrimitive.Viewport>
  );
}

export { EmojiPicker, EmojiPickerSearch, EmojiPickerContent };
