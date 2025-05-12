function showTab(tab) {
  const schedulesTab = document.getElementById('schedules-tab');
  const commentsTab = document.getElementById('comments-tab');
  const schedulesBtn = document.getElementById('tab-schedules');
  const commentsBtn = document.getElementById('tab-comments');

  if (tab === 'schedules') {
    schedulesTab.style.display = 'block';
    commentsTab.style.display = 'none';
    schedulesBtn.classList.add('active');
    commentsBtn.classList.remove('active');
  } else {
    schedulesTab.style.display = 'none';
    commentsTab.style.display = 'block';
    schedulesBtn.classList.remove('active');
    commentsBtn.classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  showTab('schedules');
});
