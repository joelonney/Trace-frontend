// Facade for custody. The implementation is chosen once by ./mode.js (default: mock).
// Exported names and return shapes are identical in both modes so pages never change.
// HTTP paths follow docs/API_CONTRACT_V1.md and have NOT been tested against a live backend.
import { useMock } from './mode'
import * as mock from './mock/custody'
import { http } from './http'
import * as A from './adapters'

const real = {
  getCustodyEvents: async (evidenceId) =>
    A.items(await http.get(`/evidence/${evidenceId}/custody`, { page_size: 100 })).map(A.toCustodyEvent),
  getRecentCustodyEvents: async (limit = 5) =>
    A.items(await http.get('/custody/events', { limit })).map(A.toCustodyEvent),
  // Dashboard tile + Transfers page. Under the contract these are pending *incoming* custody
  // transfers (decision D5, two-step: the recipient accepts before custody changes).
  getIncomingTransfers: async () =>
    A.items(await http.get('/transfers', { status: 'PENDING', direction: 'incoming' })).map(A.toTransfer),
  getPendingAccessRequests: async () =>
    A.items(await http.get('/transfers', { status: 'PENDING', direction: 'incoming' })).map(A.toTransfer),
  acceptTransfer: async (transferId) => {
    const data = await http.post(`/transfers/${transferId}/accept`, {})
    return A.toCustodyEvent(data.event ?? data)
  },
  rejectTransfer: async (transferId) => {
    const data = await http.post(`/transfers/${transferId}/reject`, {})
    return A.toCustodyEvent(data.event ?? data)
  },
  transferCustody: async ({ evidenceId, toUserId, reason }) => {
    const data = await http.post(`/evidence/${evidenceId}/transfers`, { to_user_id: toUserId, reason })
    return A.toCustodyEvent(data.event ?? data)
  },
  getTransferRecipients: async (evidenceId) =>
    A.items(await http.get(`/evidence/${evidenceId}/transfer-recipients`)).map((u) => ({
      id: u.id, name: u.name, organization: u.organization ?? null, role: u.role ?? null,
    })),
}

const impl = useMock ? mock : real

export const getCustodyEvents = impl.getCustodyEvents
export const getRecentCustodyEvents = impl.getRecentCustodyEvents
export const getPendingAccessRequests = impl.getPendingAccessRequests
export const getIncomingTransfers = impl.getIncomingTransfers
export const acceptTransfer = impl.acceptTransfer
export const rejectTransfer = impl.rejectTransfer
export const transferCustody = impl.transferCustody
export const getTransferRecipients = impl.getTransferRecipients
