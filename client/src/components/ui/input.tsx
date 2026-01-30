import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const [isReadOnly, setIsReadOnly] = React.useState(true);

    React.useEffect(() => {
      // Fix for iOS standalone mode keyboard issue
      // Set readonly to false after component mounts
      const timer = setTimeout(() => setIsReadOnly(false), 100);
      return () => clearTimeout(timer);
    }, []);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Remove readonly on focus for iOS PWA
      setIsReadOnly(false);
      // Call user's onFocus if provided
      props.onFocus?.(e);
    };

    return (
      <input
        type={type}
        inputMode={props.inputMode || (type === "password" ? "text" : "text")}
        autoComplete={props.autoComplete || (type === "password" ? "current-password" : "off")}
        readOnly={isReadOnly}
        onFocus={handleFocus}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
