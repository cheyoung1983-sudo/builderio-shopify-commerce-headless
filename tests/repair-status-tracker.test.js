const fs = require('fs')
const path = require('path')

describe('Repair Status Tracker Component & Real-Time Firestore Sync', () => {
  const componentPath = path.resolve(__dirname, '../components/services/RepairStatusTracker.tsx')
  const apiPath = path.resolve(__dirname, '../pages/api/repair-requests/[rms].ts')
  const orderTrackingPagePath = path.resolve(__dirname, '../pages/order-tracking.tsx')
  const servicesFaqPagePath = path.resolve(__dirname, '../pages/services-faq.tsx')

  test('RepairStatusTracker component exists', () => {
    expect(fs.existsSync(componentPath)).toBe(true)
  })

  test('uses Firebase Firestore onSnapshot listener for real-time updates', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain("import { doc, onSnapshot } from 'firebase/firestore'")
    expect(content).toContain('onSnapshot(')
    expect(content).toContain("'repair_requests'")
    expect(content).toContain('Live Firestore Feed')
  })

  test('implements all 5 required repair milestones in REPAIR_STAGES', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain('Kit Dispatched')
    expect(content).toContain('Inbound Transit')
    expect(content).toContain('Bench Triage & Repair')
    expect(content).toContain('QC & Calibration')
    expect(content).toContain('Outbound Delivery')
  })

  test('displays hardware specs, customer photos, and technician activity log', () => {
    const content = fs.readFileSync(componentPath, 'utf8')
    expect(content).toContain('Device Diagnostics &amp; Ingestion Specs')
    expect(content).toContain('Customer Diagnostic Photos')
    expect(content).toContain('Technician Activity &amp; Cleanroom Log')
    expect(content).toContain('data-testid="repair-status-tracker"')
  })

  test('API route pages/api/repair-requests/[rms].ts queries Firestore and demo seeds', () => {
    expect(fs.existsSync(apiPath)).toBe(true)
    const apiContent = fs.readFileSync(apiPath, 'utf8')
    expect(apiContent).toContain('DCP-RMS-100001')
    expect(apiContent).toContain('DCP-RMS-100002')
    expect(apiContent).toContain('bench_diagnostic')
    expect(apiContent).toContain('inbound_transit')
  })

  test('pages/order-tracking.tsx integrates tabbed navigation with RepairStatusTracker', () => {
    const content = fs.readFileSync(orderTrackingPagePath, 'utf8')
    expect(content).toContain('RepairStatusTracker')
    expect(content).toContain('Mail-In Cleanroom Repairs')
    expect(content).toContain('Replacement Parts Orders')
  })

  test('pages/services-faq.tsx renders RepairStatusTracker', () => {
    const content = fs.readFileSync(servicesFaqPagePath, 'utf8')
    expect(content).toContain('RepairStatusTracker')
  })
})
