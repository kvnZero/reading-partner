chrome.runtime.onInstalled.addListener(async () => {
  const { aiConfig, pageRules, roles } = await chrome.storage.local.get(['aiConfig', 'pageRules', 'roles']);

  if (!aiConfig) {
    await chrome.storage.local.set({
      aiConfig: {
        model: 'kimi',
        apiKey: ''
      }
    });
  }

  if (!pageRules) {
    await chrome.storage.local.set({
      pageRules: [
        {
          urlPattern: "https://mp.weixin.qq.com/cgi-bin/appmsg.*?action=edit",
          selectors: {
            title: ".js_article_title",
            content: ".ProseMirror"
          },
          isDefault: true
        }
      ]
    });
  }

  if (!roles) {
    await chrome.storage.local.set({
      roles: [
        {
          id: 'writer',
          name: '文章写手',
          prompt: '你是一个专业的文章写手，擅长根据主题创作高质量的文章。',
          isDefault: true
        },
        {
          id: 'editor',
          name: '编辑',
          prompt: '你是一个专业的编辑，擅长优化文章结构和表达。',
          isDefault: true
        },
        {
          id: 'reviewer',
          name: '审稿人',
          prompt: '你是一个专业的审稿人，擅长审阅文章并提出修改建议。',
          isDefault: true
        }
      ]
    });
  }
});

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getConfig') {
    chrome.storage.local.get('aiConfig', (result) => {
      sendResponse(result.aiConfig);
    });
    return true;
  }
}); 