import { Search } from 'lucide-react'

const SelectFilter = ({ label, value, onChange, options }) => (
  <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
    {label}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-ink-700 focus:outline-none"
    >
      <option value="">All</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </label>
)

export const CaseFilters = ({ filters, onChange, options }) => (
  <div className="flex flex-wrap items-end gap-3 mb-4">
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 flex-1 min-w-[200px]">
      Search
      <div className="relative">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search by title, ID, or investigator…"
          className="w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-sm text-slate-700 focus:border-ink-700 focus:outline-none"
        />
      </div>
    </label>

    <SelectFilter
      label="Status"
      value={filters.status}
      onChange={(value) => onChange({ ...filters, status: value })}
      options={options.statuses}
    />
    <SelectFilter
      label="Type"
      value={filters.type}
      onChange={(value) => onChange({ ...filters, type: value })}
      options={options.types}
    />
    <SelectFilter
      label="Priority"
      value={filters.priority}
      onChange={(value) => onChange({ ...filters, priority: value })}
      options={options.priorities}
    />
    <SelectFilter
      label="Investigator"
      value={filters.investigator}
      onChange={(value) => onChange({ ...filters, investigator: value })}
      options={options.investigators}
    />
  </div>
)
