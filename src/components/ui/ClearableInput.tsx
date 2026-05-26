"use client";

import { InputHTMLAttributes, forwardRef, useRef } from "react";

interface ClearableInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear: () => void;
  inputClassName?: string;
}

/**
 * Drop-in replacement for <input> that shows an × button whenever
 * the field has a value. Pass onClear to reset the value.
 * Clears and immediately re-focuses the input so the keyboard stays open on mobile.
 * All standard input props (className, style, onChange, etc.) pass through.
 */
const ClearableInput = forwardRef<HTMLInputElement, ClearableInputProps>(
  ({ onClear, inputClassName, className, value, style, ...props }, ref) => {
    const hasValue = value !== "" && value !== undefined && value !== null;
    const innerRef = useRef<HTMLInputElement>(null);

    // Merge the forwarded ref with our internal one so we can always call .focus()
    function setRefs(el: HTMLInputElement | null) {
      (innerRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
    }

    function handleClear(e: React.MouseEvent | React.TouchEvent) {
      e.preventDefault();      // keep focus on desktop / stop ghost-click on iOS
      onClear();
      // Re-focus so the keyboard stays up on mobile
      innerRef.current?.focus();
    }

    return (
      <div className={`relative w-full ${className ?? ""}`} style={style}>
        <input
          ref={setRefs}
          value={value}
          {...props}
          className={inputClassName ?? ""}
          style={{ paddingRight: hasValue ? "2.5rem" : undefined }}
        />
        {hasValue && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={handleClear}
            onTouchEnd={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full
                       flex items-center justify-center transition-colors z-10"
            style={{ background: "#e2e8f0" }}
            aria-label="Clear field">
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
              <path d="M2 2l6 6M8 2L2 8" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>
    );
  }
);

ClearableInput.displayName = "ClearableInput";
export default ClearableInput;
