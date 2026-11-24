import { Link } from 'react-router-dom'
import { StatusBadge } from '../common/StatusBadge'
import { formatDateTime, formatFileSize } from '../../utils/formatters'
import { useUserDirectory } from '../../hooks/useUserDirectory'
import { codeOf, caseCodeOf } from '../../utils/ids'

const Field = ({ label, children, mono = false }) => (
  <div>
    <dt className="text-xs text-slate-500">{label}</dt>
    <dd className={`text-sm text-slate-800 mt-0.5 break-all ${mono ? 'font-mono text-xs' : ''}`}>
      {children}
    </dd>
  </div>
)

const Tag = ({ children }) => (
  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-sans font-medium uppercase tracking-wide text-slate-500">
    {children}
  </span>
)

export const EvidenceDetailPanel = ({ evidenceItem, relatedCase }) => {
  const nameOf = useUserDirectory()
  const isLocal = evidenceItem.hash_source === 'LOCAL_CALCULATED'

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <Field label="Evidence ID">{codeOf(evidenceItem)}</Field>
      <Field label="Integrity Status">
        <StatusBadge value={evidenceItem.status} />
      </Field>

      <Field label="Filename">{evidenceItem.filename}</Field>
      <Field label="File Type">{evidenceItem.file_type}</Field>

      <Field label="Case">
        <Link to={`/cases/${evidenceItem.case_id}`} className="text-ink-900 hover:underline">
          {relatedCase ? codeOf(relatedCase) : caseCodeOf(evidenceItem)}
          {relatedCase ? ` — ${relatedCase.title}` : ''}
        </Link>
      </Field>
      <Field label="Size">{formatFileSize(evidenceItem.size)}</Field>

      <Field label="Uploaded By">{nameOf(evidenceItem.uploaded_by)}</Field>
      <Field label="Registered">{formatDateTime(evidenceItem.upload_timestamp)}</Field>

      <Field label="Current Custodian">{nameOf(evidenceItem.current_custodian)}</Field>
      <span />

      <div className="sm:col-span-2">
        <Field label="SHA-256 Hash" mono>
          {evidenceItem.sha256}
          <Tag>{isLocal ? 'Calculated locally in browser · not blockchain-recorded' : 'Synthetic demo value'}</Tag>
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Storage Reference (CID)" mono>
          {evidenceItem.cid ?? 'None — file was not stored anywhere'}
          {evidenceItem.cid && <Tag>Synthetic placeholder</Tag>}
        </Field>
      </div>

      <div className="sm:col-span-2">
        <Field label="Description">{evidenceItem.description}</Field>
      </div>
    </dl>
  )
}
