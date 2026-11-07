"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { IconButton, cx } from "./ui";

/** Native <dialog>: built-in focus trap, Esc to close, focus returns to the opener. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Close when the route is hidden (Cache Components keeps hidden routes mounted).
  useEffect(() => () => ref.current?.close(), []);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className={cx(
        "mt-auto mb-0 w-full max-w-full rounded-t-3xl rounded-b-none bg-white p-0 text-gray-900 shadow-2xl ring-1 ring-gray-950/10 backdrop:backdrop-blur-[2px] sm:m-auto sm:w-[calc(100%-1.5rem)] sm:rounded-2xl",
        size === "sm" && "sm:max-w-sm",
        size === "md" && "sm:max-w-lg",
        size === "lg" && "sm:max-w-2xl",
        size === "xl" && "sm:max-w-4xl",
      )}
    >
      {open ? (
        <div className="flex max-h-[min(92dvh,860px)] flex-col">
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-gray-300 sm:hidden" aria-hidden="true" />
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="min-w-0">
              <h2 id="dialog-title" className="text-base font-semibold sm:text-lg">
                {title}
              </h2>
              {description ? <p className="mt-0.5 text-xs text-gray-600 sm:text-sm">{description}</p> : null}
            </div>
            <IconButton label="Close" onClick={onClose} className="-mr-1 -mt-1">
              <X className="size-5" />
            </IconButton>
          </div>
          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">{children}</div>
          {footer ? (
            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-3">
              {footer}
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
