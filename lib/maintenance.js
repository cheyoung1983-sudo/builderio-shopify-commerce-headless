const RETRY_AFTER_SECONDS = 60 * 60

function isMaintenanceMode(value = process.env.MAINTENANCE_MODE) {
  return value !== 'false'
}

function sendMaintenanceResponse(res, html) {
  res.statusCode = 503
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Retry-After', String(RETRY_AFTER_SECONDS))
  res.setHeader('Cache-Control', 'no-store')
  res.write(html)
  res.end()
}

module.exports = { isMaintenanceMode, sendMaintenanceResponse }
