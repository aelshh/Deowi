import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center text-sm font-medium whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent_foreground font-mono uppercase tracking-[0.2em] border-2 border-primary shadow-[4px_4px_0_0_#0A0A0A] hover:shadow-[8px_8px_0_0_#0A0A0A] hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-x-0 active:translate-y-0 active:shadow-[4px_4px_0_0_#0A0A0A]",
        outline:
          "bg-surface text-primary font-mono uppercase tracking-[0.2em] border-2 border-primary shadow-[4px_4px_0_0_#0A0A0A] hover:shadow-[8px_8px_0_0_#0A0A0A] hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-x-0 active:translate-y-0 active:shadow-[4px_4px_0_0_#0A0A0A]",
        secondary:
          "bg-muted text-primary font-mono uppercase tracking-[0.2em] border-2 border-primary shadow-[4px_4px_0_0_#0A0A0A] hover:shadow-[8px_8px_0_0_#0A0A0A] hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-x-0 active:translate-y-0 active:shadow-[4px_4px_0_0_#0A0A0A]",
        ghost:
          "font-mono uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground",
        destructive:
          "bg-accent text-accent_foreground font-mono uppercase tracking-[0.2em] border-2 border-primary",
        link: "text-accent underline-offset-4 hover:underline font-mono",
      },
      size: {
        default: "h-10 gap-1.5 px-6 py-4",
        sm: "h-8 gap-1 px-4 text-xs",
        lg: "h-12 gap-1.5 px-8 text-base",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
