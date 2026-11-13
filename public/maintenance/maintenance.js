    (function () {
      // Set current year dynamically
      const yearEl = document.getElementById('copyright-year');
      if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
      }

      // Target Relaunch Date: February 1, 2027 at 00:00:00 Pacific Time (PST = UTC-8)
      const targetTimestamp = new Date('2027-02-01T00:00:00-08:00').getTime();

      const daysEl = document.getElementById('cd-days');
      const hoursEl = document.getElementById('cd-hours');
      const minutesEl = document.getElementById('cd-minutes');
      const secondsEl = document.getElementById('cd-seconds');

      function padZero(num) {
        return String(num).padStart(2, '0');
      }

      function updateCountdown() {
        const now = Date.now();
        const diff = targetTimestamp - now;

        if (diff <= 0) {
          daysEl.textContent = '00';
          hoursEl.textContent = '00';
          minutesEl.textContent = '00';
          secondsEl.textContent = '00';
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        daysEl.textContent = days;
        hoursEl.textContent = padZero(hours);
        minutesEl.textContent = padZero(minutes);
        secondsEl.textContent = padZero(seconds);
      }

      updateCountdown();
      setInterval(updateCountdown, 1000);

      // Copy Support Email Button using execCommand fallback for iframe compatibility
      const copyBtn = document.getElementById('copy-email-btn');
      const copyIcon = document.getElementById('copy-icon');
      const checkIcon = document.getElementById('check-icon');

      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          const emailText = 'ryan@displaycellpros.com';
          const tempInput = document.createElement('input');
          tempInput.value = emailText;
          document.body.appendChild(tempInput);
          tempInput.select();
          try {
            document.execCommand('copy');
            copyIcon.classList.add('hidden');
            checkIcon.classList.remove('hidden');
            setTimeout(function () {
              copyIcon.classList.remove('hidden');
              checkIcon.classList.add('hidden');
            }, 2000);
          } catch (err) {
            // Silently ignore if blocked
          }
          document.body.removeChild(tempInput);
        });
      }
    })();
  