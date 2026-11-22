(function () {
  const yearEl = document.getElementById('copyright-year')
  if (yearEl) yearEl.textContent = new Date().getFullYear()

  const targetTimestamp = new Date('2027-02-01T00:00:00-08:00').getTime()
  const daysEl = document.getElementById('cd-days')
  const hoursEl = document.getElementById('cd-hours')
  const minutesEl = document.getElementById('cd-minutes')
  const secondsEl = document.getElementById('cd-seconds')
  const countdownStatus = document.getElementById('countdown-status')
  const countdownElements = [daysEl, hoursEl, minutesEl, secondsEl]
  let countdownInterval

  function padZero(value) {
    return String(value).padStart(2, '0')
  }

  function updateCountdown() {
    const difference = targetTimestamp - Date.now()
    if (difference <= 0) {
      countdownElements.forEach((element) => {
        if (element) element.textContent = '00'
      })
      if (countdownStatus) {
        countdownStatus.textContent = 'The estimated relaunch date has passed. Please contact us for current service availability.'
      }
      if (countdownInterval) window.clearInterval(countdownInterval)
      return
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24))
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
    const minutes = Math.floor((difference / (1000 * 60)) % 60)
    const seconds = Math.floor((difference / 1000) % 60)

    if (daysEl) daysEl.textContent = String(days)
    if (hoursEl) hoursEl.textContent = padZero(hours)
    if (minutesEl) minutesEl.textContent = padZero(minutes)
    if (secondsEl) secondsEl.textContent = padZero(seconds)
  }

  if (countdownElements.some(Boolean)) {
    updateCountdown()
    if (targetTimestamp > Date.now()) {
      countdownInterval = window.setInterval(updateCountdown, 1000)
    }
  }

  const copyBtn = document.getElementById('copy-email-btn')
  const copyIcon = document.getElementById('copy-icon')
  const checkIcon = document.getElementById('check-icon')
  const copyStatus = document.getElementById('copy-status')

  function announceCopyResult(success) {
    if (copyIcon) copyIcon.classList.toggle('hidden', success)
    if (checkIcon) checkIcon.classList.toggle('hidden', !success)
    if (copyStatus) copyStatus.textContent = success ? 'Email address copied.' : 'Could not copy the email address. Please select and copy it.'
  }

  function fallbackCopy(email) {
    const temporaryField = document.createElement('textarea')
    temporaryField.value = email
    temporaryField.setAttribute('readonly', '')
    temporaryField.style.position = 'fixed'
    temporaryField.style.opacity = '0'
    document.body.appendChild(temporaryField)
    temporaryField.select()
    let copied = false
    try {
      copied = document.execCommand('copy')
    } catch {
      copied = false
    }
    temporaryField.remove()
    return copied
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async function () {
      const email = 'ryan@displaycellpros.com'
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(email)
          announceCopyResult(true)
        } else {
          announceCopyResult(fallbackCopy(email))
        }
      } catch {
        announceCopyResult(false)
      }
    })
  }
})()
