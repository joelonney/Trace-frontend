import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

const VARIANTS = {
  info: { classes: 'bg-status-infoBg text-status-info', Icon: Info },
  success: { classes: 'bg-status-successBg text-status-success', Icon: CheckCircle2 },
  warning: { classes: 'bg-status-warningBg text-status-warning', Icon: AlertTriangle },
  danger: { classes: 'bg-status-dangerBg text-status-danger', Icon: XCircle },
}

export const Alert = ({ variant = 'info', title, children }) => {
  const { classes, Icon } = VARIANTS[variant]
  return (
    <div className={`flex gap-3 rounded-md px-4 py-3 text-sm ${classes}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="mt-0.5 opacity-90">{children}</div>}
      </div>
    </div>
  )
}
