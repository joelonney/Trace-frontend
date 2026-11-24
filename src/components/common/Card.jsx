export const Card = ({ title, description, action, children, className = '' }) => (
  <div className={`bg-white border border-slate-200 rounded-lg shadow-card ${className}`}>
    {(title || action) && (
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">
        <div>
          {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="px-5 py-4">{children}</div>
  </div>
)
