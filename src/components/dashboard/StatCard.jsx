export const StatCard = ({ label, value, icon: Icon, tone = 'default' }) => {
  const toneClasses = {
    default: 'bg-ink-900 text-white',
    warning: 'bg-status-warningBg text-status-warning',
  }[tone]

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-card px-5 py-4 flex items-center gap-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${toneClasses}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-2xl font-semibold text-slate-900 leading-tight">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}
