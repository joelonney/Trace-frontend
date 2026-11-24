import { useEffect, useState } from 'react'
import { getEvidence } from '../../api/evidence'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { EvidenceTable } from '../../components/evidence/EvidenceTable'

export const VerificationIndex = () => {
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
        title="Verification"
        description="Select an evidence item to check its integrity verification status."
      />
      <Card>
        <EvidenceTable
          evidenceItems={evidenceItems}
          isLoading={isLoading}
          getRowLink={(row) => `/verification/${row.id}`}
        />
      </Card>
    </div>
  )
}
