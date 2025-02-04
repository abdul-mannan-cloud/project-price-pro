import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { IconLoader2, TablerIcon } from '@tabler/icons-react';
import { motion, MotionProps } from 'framer-motion';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2 border',
  {
    variants: {
      variant: {
        ai: 'bg-indigo-500 text-white hover:bg-indigo-600 border-indigo-700 border-b-4 border-b-indigo-600 shadow-md',
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 border-primary-700 border-b-4 border-b-primary-600 shadow-md',
        destructive:
          'bg-red-500 text-destructive-foreground hover:bg-red-600 border-red-700 border-b-4 border-red-600 shadow-md',
        outline:
          'border bg-white hover:bg-neutral-100 border-neutral-300 border-b-4 border-b-neutral-200',
        outline_destructive:
          'border text-red-500 bg-white hover:bg-red-50 border-red-600 border-b-4 border-b-red-500',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        ghost_destructive: 'bg-transparent text-red-500 hover:bg-red-100',
        link: 'text-primary underline-offset-4 hover:underline',
        solid: 'bg-zinc-800 text-white hover:bg-zinc-700',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-xl px-8',
        xs: 'h-8 rounded-md px-4 text-sm',
        icon: 'h-10 w-10 border-b border-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type MotionButtonPropsType = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> &
  MotionProps;

export interface ButtonProps extends MotionButtonPropsType {
  asChild?: boolean;
  supportIcon?: React.ElementType;
  leadingIcon?: React.ElementType;
  isLoading?: boolean;
  stretch?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      children,
      stretch = false,
      supportIcon: SupportIcon,
      leadingIcon: LeadingIcon,
      isLoading = false,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    return (
      <motion.button
        className={cn(
          buttonVariants({ variant, size, className }),
          stretch && 'w-full',
        )}
        ref={ref}
        {...props}>
        {isLoading ? (
          <IconLoader2 size={14} className="animate-spin" />
        ) : null}
        {!isLoading && SupportIcon && (
          <SupportIcon size={14} />
        )}
        {children}
        {LeadingIcon && <LeadingIcon size={14} />}
      </motion.button>
    );
  },
);
Button.displayName = 'Button';

export interface ButtonGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'button-group flex flex-row overflow-hidden rounded-lg border w-fit divide-x',
          '*:rounded-none *:border-none',
          className,
        )}
        {...props}
      />
    );
  },
);

ButtonGroup.displayName = 'ButtonGroup';

export { Button, buttonVariants };