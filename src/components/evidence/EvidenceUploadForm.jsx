import { useRef, useState } from 'react'
import { UploadCloud, FileUp, X } from 'lucide-react'
import { Button } from '../common/Button'
import { Alert } from '../common/Alert'
import {
  uploadEvidence,
  validateEvidenceFile,
  EVIDENCE_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_UPLOAD_BYTES,
} from '../../api/evidence'
import { formatFileSize } from '../../utils/formatters'

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-ink-700 focus:outline-none'

export const EvidenceUploadForm = ({ cases, defaultCaseId, onUploaded, onCancel }) => {
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    caseId: defaultCaseId ?? cases[0]?.id ?? '',
    fileType: EVIDENCE_TYPES[0],
    description: '',
  })
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const selectFile = (selected) => {
    setError(null)
    setFile(selected ?? null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    selectFile(e.dataTransfer.files?.[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.caseId) return setError('Select a case.')
    if (!form.description.trim()) return setError('Add a short evidence description.')
    const fileError = validateEvidenceFile(file, form.fileType)
    if (fileError) return setError(fileError)

    setIsSubmitting(true)
    try {
      const newItem = await uploadEvidence({
        caseId: form.caseId,
        file,
        fileType: form.fileType,
        description: form.description,
      })
      onUploaded(newItem)
    } catch (err) {
      setError(err.message ?? 'Registration failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (cases.length === 0) {
    return (
      <div className="space-y-4">
        <Alert variant="warning">You have no assigned cases to register evidence against.</Alert>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onCancel}>Close</Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Alert variant="info" title="Mock registration — nothing is uploaded">
        The file stays in your browser. Its SHA-256 is calculated locally and a mock evidence record
        is created in memory. The file is not encrypted, stored, pinned to IPFS or recorded on a
        blockchain, and the record is lost on page reload.
      </Alert>

      {error && <Alert variant="danger">{error}</Alert>}

      <div>
        <label htmlFor="ev-case" className="block text-xs font-medium text-slate-600 mb-1">Case</label>
        <select id="ev-case" value={form.caseId} onChange={handleChange('caseId')} className={inputClass}>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>{c.id} — {c.title}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="ev-type" className="block text-xs font-medium text-slate-600 mb-1">Evidence type</label>
        <select id="ev-type" value={form.fileType} onChange={handleChange('fileType')} className={inputClass}>
          {EVIDENCE_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-400">
          Accepted: {ALLOWED_EXTENSIONS[form.fileType].map((x) => `.${x}`).join(', ')} · max{' '}
          {formatFileSize(MAX_UPLOAD_BYTES)}
        </p>
      </div>

      <div>
        <label htmlFor="ev-desc" className="block text-xs font-medium text-slate-600 mb-1">Description</label>
        <textarea
          id="ev-desc"
          value={form.description}
          onChange={handleChange('description')}
          rows={3}
          placeholder="Brief description of the evidence item"
          className={inputClass}
        />
      </div>

      <div>
        <span className="block text-xs font-medium text-slate-600 mb-1">File</span>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`rounded-md border-2 border-dashed px-4 py-5 text-center text-sm ${
            isDragging ? 'border-ink-700 bg-slate-50' : 'border-slate-300'
          }`}
        >
          {file ? (
            <div className="flex items-center justify-between gap-3 text-left">
              <div className="min-w-0">
                <p className="font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => { selectFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                aria-label="Remove selected file"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <FileUp size={22} className="mx-auto text-slate-400 mb-1" />
              <p className="text-slate-600">Drag a file here, or</p>
              <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => fileInputRef.current?.click()}>
                Choose file
              </Button>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            aria-label="Evidence file"
            onChange={(e) => selectFile(e.target.files?.[0])}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" icon={UploadCloud} disabled={isSubmitting}>
          {isSubmitting ? 'Registering…' : 'Upload Evidence'}
        </Button>
      </div>
    </form>
  )
}
