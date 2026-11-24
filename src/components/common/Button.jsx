const VARIANTS = {
  primary: 'bg-ink-900 text-white hover:bg-ink-800 focus-visible:outline-ink-900',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400',
  danger: 'bg-status-danger text-white hover:opacity-90 focus-visible:outline-status-danger',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400',
}

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className = '',
  children,
  ...rest
}) => (
  <button
    className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    {...rest}
  >
    {Icon && <Icon size={16} strokeWidth={2} />}
    {children}
  </button>
)
