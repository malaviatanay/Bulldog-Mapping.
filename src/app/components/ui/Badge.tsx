"use client";
import { X } from "lucide-react";

type BadgeProps = {
  label: string;
  onRemove?: () => void;
  className?: string;
};

export default function Badge({ label, onRemove, className = "" }: BadgeProps) {
  return (
    <span
      className={`button-depth inline-flex items-center gap-1 bg-highlight text-white text-sm px-2.5 py-1 rounded-md border border-highlight-hover ${className}`}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:bg-highlight-hover rounded transition-colors duration-150 ease-out-2 p-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
