document.addEventListener('DOMContentLoaded', () => {
  // 点击二维码跳转到选项页面
  document.getElementById('options-link').addEventListener('click', () => {
    console.log('options-link clicked');
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  });
}); 