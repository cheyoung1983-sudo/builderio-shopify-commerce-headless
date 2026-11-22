const { isMaintenanceMode, sendMaintenanceResponse } = require('../lib/maintenance')

describe('maintenance homepage behavior', () => {
  test('keeps maintenance enabled unless explicitly disabled', () => {
    const originalMode = process.env.MAINTENANCE_MODE
    try {
      delete process.env.MAINTENANCE_MODE
      expect(isMaintenanceMode()).toBe(true)
      process.env.MAINTENANCE_MODE = 'true'
      expect(isMaintenanceMode()).toBe(true)
      process.env.MAINTENANCE_MODE = 'false'
      expect(isMaintenanceMode()).toBe(false)
    } finally {
      if (originalMode === undefined) delete process.env.MAINTENANCE_MODE
      else process.env.MAINTENANCE_MODE = originalMode
    }
  })

  test('serves temporary maintenance with a bounded retry hint', () => {
    const res = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      statusCode: 200,
    }

    sendMaintenanceResponse(res, '<main>Maintenance</main>')

    expect(res.statusCode).toBe(503)
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8')
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '3600')
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
    expect(res.write).toHaveBeenCalledWith('<main>Maintenance</main>')
    expect(res.end).toHaveBeenCalledTimes(1)
  })

  test('keeps the countdown display quiet and provides a status announcement', () => {
    const fs = require('node:fs')
    const path = require('node:path')
    const html = fs.readFileSync(path.join(__dirname, '../content/maintenance-homepage.html'), 'utf8')

    expect(html).toMatch(/aria-live="off"[^>]*id="maintenance-countdown"|id="maintenance-countdown"[^>]*aria-live="off"/)
    expect(html).toContain('id="countdown-status"')
    expect(html).toContain('id="copy-status"')
    expect(html).toMatch(/id="copy-icon"[^>]*aria-hidden="true"/)
    expect(html).toMatch(/id="check-icon"[^>]*aria-hidden="true"/)
  })

  test('announces when the estimated date has passed and stops updating', () => {
    const fs = require('node:fs')
    const path = require('node:path')
    const script = fs.readFileSync(path.join(__dirname, '../public/maintenance/maintenance.js'), 'utf8')
    document.body.innerHTML = `
      <span id="cd-days"></span><span id="cd-hours"></span>
      <span id="cd-minutes"></span><span id="cd-seconds"></span>
      <p id="countdown-status"></p>
    `
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2027-02-01T08:00:00.000Z'))

    try {
      window.eval(script)
      expect(document.getElementById('countdown-status').textContent).toMatch(/estimated relaunch date has passed/i)
      expect(document.getElementById('cd-days').textContent).toBe('00')
      expect(jest.getTimerCount()).toBe(0)
    } finally {
      jest.clearAllTimers()
      jest.useRealTimers()
      document.body.innerHTML = ''
    }
  })

  test('does not start a timer when countdown elements are unavailable', () => {
    const fs = require('node:fs')
    const path = require('node:path')
    const script = fs.readFileSync(path.join(__dirname, '../public/maintenance/maintenance.js'), 'utf8')
    jest.useFakeTimers()

    try {
      expect(() => window.eval(script)).not.toThrow()
      expect(jest.getTimerCount()).toBe(0)
    } finally {
      jest.clearAllTimers()
      jest.useRealTimers()
    }
  })
})
