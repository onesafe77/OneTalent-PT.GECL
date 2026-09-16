import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // bg-muted hanya 4% lebih gelap dari latar di mode terang — nyaris tak
        // terlihat. Alfa pada token foreground memberi selisih yang SAMA di
        // kedua mode, jadi kerangkanya terbaca di terang maupun gelap.
        "animate-pulse rounded-md bg-foreground/10",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
