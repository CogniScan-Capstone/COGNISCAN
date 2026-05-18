"use client";

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  ChangeEventHandler,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  placeholder: string;
  type?: string;
  helper?: string;
  icon?: "mail" | "lock" | "user";
  showEye?: boolean;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "placeholder" | "type">;

const icons = {
  mail: Mail,
  lock: LockKeyhole,
  user: UserRound,
};

export function Field({
  label,
  placeholder,
  type = "text",
  helper,
  icon,
  showEye,
  className,
  ...props
}: FieldProps) {
  const Icon = icon ? icons[icon] : null;
  const [showValue, setShowValue] = useState(false);
  const inputType = showEye && type === "password" && showValue ? "text" : type;

  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-[15px] font-semibold leading-none text-[#343832]">
        {label}
      </span>
      <span className="relative block">
        {Icon ? (
          <Icon
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-muted"
            aria-hidden="true"
          />
        ) : null}
        <input
          {...props}
          type={inputType}
          placeholder={placeholder}
          className={cn(
            "h-12 w-full rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-4 text-[15px] text-on-surface outline-none transition",
            "placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15",
            Icon && "pl-11",
            showEye && "pr-12",
          )}
        />
        {showEye ? (
          <button
            type="button"
            onClick={() => setShowValue((value) => !value)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4f584d] transition hover:text-[#343832]"
            aria-label={showValue ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showValue ? (
              <EyeOff className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </span>
      {helper ? (
        <span className="mt-2 block text-xs leading-none text-on-surface-muted">{helper}</span>
      ) : null}
    </label>
  );
}

export function PhoneField({
  muted = false,
  label = "Phone Number",
  value,
  onChange,
  required,
  placeholder = "812 3456 7890",
}: {
  muted?: boolean;
  label?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[15px] font-semibold leading-none text-[#343832]">
        {label}
      </span>
      <span className="grid h-12 grid-cols-[76px_1fr] overflow-hidden rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] focus-within:border-primary-container focus-within:ring-4 focus-within:ring-primary-container/15">
        <span
          className={cn(
            "flex items-center justify-center border-r border-[#d4d6cf] text-[15px] text-on-surface-variant",
            muted && "bg-[#ecede8]",
          )}
        >
          +62
        </span>
        <input
          type="tel"
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          autoComplete="tel"
          className={cn(
            "h-full min-w-0 border-0 bg-transparent px-4 text-[15px] outline-none placeholder:text-[#737c8f]",
            muted && "bg-[#ecede8]",
          )}
        />
      </span>
    </label>
  );
}

export function TextAreaField({
  label,
  placeholder,
  ...props
}: {
  label: string;
  placeholder: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "placeholder">) {
  return (
    <label className="block">
      <span className="mb-2 block text-[15px] font-semibold leading-none text-[#343832]">
        {label}
      </span>
      <textarea
        {...props}
        placeholder={placeholder}
        rows={props.rows ?? 3}
        className="w-full resize-none rounded-[10px] border border-[#c9cec4] bg-[#fdfcf9] px-4 py-3 text-[15px] text-on-surface outline-none transition placeholder:text-[#737c8f] focus:border-primary-container focus:ring-4 focus:ring-primary-container/15"
      />
    </label>
  );
}

export function PrimaryAuthButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      {...props}
      className={cn(
        "inline-flex h-14 w-full items-center justify-center rounded-full bg-primary-container px-8 text-[18px] font-semibold text-white shadow-[0_16px_26px_-18px_rgba(65,87,62,0.65)] transition hover:-translate-y-0.5 hover:bg-[#789477] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-container/25 disabled:pointer-events-none disabled:opacity-65",
        className,
      )}
    >
      {children}
    </button>
  );
}
