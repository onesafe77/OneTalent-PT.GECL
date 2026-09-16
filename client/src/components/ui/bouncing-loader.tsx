import { cn } from "@/lib/utils";

interface BouncingLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  color?: "purple" | "red" | "blue" | "green" | "gray";
  text?: string;
}

export function BouncingLoader({ 
  className, 
  size = "md", 
  color = "purple",
  text 
}: BouncingLoaderProps) {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const shadowSizeClasses = {
    sm: "w-2 h-1",
    md: "w-3 h-1.5",
    lg: "w-4 h-2",
  };

  const colorClasses = {
    purple: "bg-purple-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    green: "bg-primary",
    gray: "bg-gray-500",
  };

  const shadowColorClasses = {
    purple: "bg-purple-300/50",
    red: "bg-red-300/50",
    blue: "bg-blue-300/50",
    green: "bg-muted",
    gray: "bg-gray-300/50",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className="relative flex items-end justify-center gap-2">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className={cn(
                "rounded-full animate-bounce-dot",
                sizeClasses[size],
                colorClasses[color]
              )}
              style={{
                animationDelay: `${index * 0.15}s`,
              }}
            />
            <div
              className={cn(
                "rounded-full mt-1 animate-shadow-pulse",
                shadowSizeClasses[size],
                shadowColorClasses[color]
              )}
              style={{
                animationDelay: `${index * 0.15}s`,
              }}
            />
          </div>
        ))}
      </div>
      {text && (
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

export function FullPageLoader({ text = "Memuat..." }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <BouncingLoader size="lg" color="purple" text={text} />
    </div>
  );
}

export function CardLoader({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <BouncingLoader size="md" color="purple" text={text} />
    </div>
  );
}
