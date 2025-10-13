import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import clsx from 'classnames'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline'
}

function Button({ variant = 'primary', className, children, ...rest }: PropsWithChildren<Props>) {
  const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none h-9 px-3'
  const variants: Record<NonNullable<Props['variant']>, string> = {
    primary: 'bg-primary text-white hover:opacity-90 focus-visible:ring-primary ring-offset-white',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
    outline: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
  }

  return (
    <button className={clsx(base, variants[variant], className)} {...rest}>
      {children}
    </button>
  )
}

export default Button


