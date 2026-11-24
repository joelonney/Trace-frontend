import { useEffect, useState } from 'react'
import { getEvidence } from '../../api/evidence'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { EvidenceTable } from '../../components/evidence/EvidenceTable'

export const CustodyIndex = () => {
  const [evidenceItems, setEvidenceItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getEvidence().then((data) => {
      setEvidenceItems(data)
      setIsLoading(false)
    })
  }, [])

  return (
    <div>
      <PageHeader
        title="Chain of Custody"
        description="Select an evidence item to view its full custody chain."
      />
      <Card>
        <EvidenceTable
          evidenceItems={evidenceItems}
          isLoading={isLoading}
          getRowLink={(row) => `/custody/${row.id}`}
        />
      </Card>
    </div>
  )
}
