export const Tabs = ({ tabs, activeTab, onChange }) => (
  <div className="border-b border-slate-200 mb-4">
    <nav className="flex gap-1 -mb-px overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
            activeTab === tab.key
              ? 'border-ink-900 text-ink-900'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  </div>
)
