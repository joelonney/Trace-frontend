import { useEffect, useState } from 'react'
import { FolderKanban, Fingerprint, UserCheck, ShieldCheck } from 'lucide-react'
import { getCases } from '../../api/cases'
import { getEvidence } from '../../api/evidence'
import { getPendingAccessRequests, getRecentCustodyEvents } from '../../api/custody'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { LoadingState } from '../../components/common/LoadingState'
import { StatCard } from '../../components/dashboard/StatCard'
import { RecentActivityList } from '../../components/dashboard/RecentActivityList'
import { VerificationSummary } from '../../components/dashboard/VerificationSummary'
import { formatDate, formatDateTime, titleCase } from '../../utils/formatters'
import { codeOf, caseCodeOf } from '../../utils/ids'

export const Dashboard = () => {
  const [data, setData] = useState(null)

  useEffect(() => {
    Promise.all([getCases(), getEvidence(), getPendingAccessRequests(), getRecentCustodyEvents(6)]).then(
      ([cases, evidenceItems, pendingRequests, recentEvents]) => {
        setData({ cases, evidenceItems, pendingRequests, recentEvents })
      },
    )
  }, [])

  if (!data) {
    return <LoadingState label="Loading dashboard…" />
  }

  const { cases, evidenceItems, pendingRequests, recentEvents } = data
  const activeCases = cases.filter((c) => c.status === 'OPEN' || c.status === 'UNDER_REVIEW')

  const evidenceCode = Object.fromEntries(evidenceItems.map((e) => [e.id, codeOf(e)]))

  const recentCases = [...cases]
    .sort((a, b) => new Date(b.opened_date) - new Date(a.opened_date))
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      to: `/cases/${c.id}`,
      title: c.title,
      subtitle: `${codeOf(c)} · ${titleCase(c.status)}`,
      meta: formatDate(c.opened_date),
    }))

  const recentEvidence = [...evidenceItems]
    .sort((a, b) => new Date(b.upload_timestamp) - new Date(a.upload_timestamp))
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      to: `/evidence/${e.id}`,
      title: e.filename,
      subtitle: `${caseCodeOf(e)} · ${titleCase(e.status)}`,
      meta: formatDate(e.upload_timestamp),
    }))

  const recentActivity = recentEvents.map((event) => ({
    id: event.id,
    to: `/custody/${event.evidence_id}`,
    title: titleCase(event.event_type),
    subtitle: `${event.actor} · ${evidenceCode[event.evidence_id] ?? event.evidence_id}`,
    meta: formatDateTime(event.timestamp),
  }))

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of active cases, evidence integrity, and recent custody activity."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Cases" value={activeCases.length} icon={FolderKanban} />
        <StatCard label="Total Evidence Items" value={evidenceItems.length} icon={Fingerprint} />
        <StatCard
          label="Pending Access Requests"
          value={pendingRequests.length}
          icon={UserCheck}
          tone={pendingRequests.length > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Verified Evidence"
          value={evidenceItems.filter((e) => e.status === 'VERIFIED').length}
          icon={ShieldCheck}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Recent Cases" className="lg:col-span-1">
          <RecentActivityList items={recentCases} emptyMessage="No cases yet." />
        </Card>
        <Card title="Recent Evidence" className="lg:col-span-1">
          <RecentActivityList items={recentEvidence} emptyMessage="No evidence yet." />
        </Card>
        <Card title="Verification Status" className="lg:col-span-1">
          <VerificationSummary evidenceItems={evidenceItems} />
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Recent Custody Events">
          <RecentActivityList items={recentActivity} emptyMessage="No custody events yet." />
        </Card>
      </div>
    </div>
  )
}
