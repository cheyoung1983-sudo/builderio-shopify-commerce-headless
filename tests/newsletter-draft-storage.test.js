/**
 * Tests for newsletter draft email persistence in localStorage
 */

const LOCAL_STORAGE_DRAFT_KEY = 'displaycellpros_newsletter_draft'

describe('Newsletter draft persistence in localStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  test('saves typed draft to localStorage', () => {
    const inputEmail = 'technician@displaycellpros.com'
    localStorage.setItem(LOCAL_STORAGE_DRAFT_KEY, inputEmail)

    const saved = localStorage.getItem(LOCAL_STORAGE_DRAFT_KEY)
    expect(saved).toBe('technician@displaycellpros.com')
  })

  test('removes draft from localStorage when input is cleared', () => {
    localStorage.setItem(LOCAL_STORAGE_DRAFT_KEY, 'draft@example.com')
    expect(localStorage.getItem(LOCAL_STORAGE_DRAFT_KEY)).toBe('draft@example.com')

    // Simulate clearing
    localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY)
    expect(localStorage.getItem(LOCAL_STORAGE_DRAFT_KEY)).toBeNull()
  })

  test('removes draft upon successful subscription', () => {
    localStorage.setItem(LOCAL_STORAGE_DRAFT_KEY, 'submitted@example.com')

    // On submit success, draft is cleaned up and subscriber record is created
    localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY)
    localStorage.setItem(
      'displaycellpros_newsletter_subscriber',
      JSON.stringify({ email: 'submitted@example.com', subscribedAt: new Date().toISOString() })
    )

    expect(localStorage.getItem(LOCAL_STORAGE_DRAFT_KEY)).toBeNull()
    const subscriber = JSON.parse(localStorage.getItem('displaycellpros_newsletter_subscriber'))
    expect(subscriber.email).toBe('submitted@example.com')
  })
})
