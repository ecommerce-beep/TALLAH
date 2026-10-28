document.addEventListener('DOMContentLoaded', () => {
  const countdownEl = document.getElementById('countdown');
  if (!countdownEl) return;

  const targetDateStr = (countdownEl.getAttribute('data-countdown-target') || '').trim();
  const targetDate = new Date(targetDateStr);

  // No date (cleared setting) or an invalid one: hide the timer instead of showing zeros or NaN
  if (!targetDateStr || isNaN(targetDate.getTime())) {
    countdownEl.style.display = 'none';
    return;
  }

  let timer;

  // Returns true once the countdown has ended
  function updateCountdown() {
    const now = new Date();
    let diff = targetDate - now;

    if (diff <= 0) {
      // expired
      document.getElementById('cd-days').textContent = '0';
      document.getElementById('cd-hours').textContent = '0';
      document.getElementById('cd-minutes').textContent = '0';
      document.getElementById('cd-seconds').textContent = '0';
      countdownEl.style.display = 'none';
      clearInterval(timer);
      return true;
    }



    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    document.getElementById('cd-days').textContent = days;
    document.getElementById('cd-hours').textContent = hours;
    document.getElementById('cd-minutes').textContent = minutes;
    document.getElementById('cd-seconds').textContent = seconds;
    return false;
  }

  // Only keep ticking while the countdown is running
  if (!updateCountdown()) {
    timer = setInterval(updateCountdown, 1000);
  }
});