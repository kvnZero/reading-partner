class ContentScript {
  constructor() {
    this.currentRule = null;
    this.floatingButton = null;
    this.chatDialog = null;
    this.messageHistory = [];
    this.isProcessing = false;
  }

  cleanHtmlContent(element) {
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true);
    
    // Remove script and style tags
    const scriptsAndStyles = clone.querySelectorAll('script, style');
    scriptsAndStyles.forEach(node => node.remove());
    
    // Get text content, removing extra whitespace
    return clone.textContent?.replace(/\s+/g, ' ').trim() || '';
  }


  async initialize() {
    try {
      // 获取当前页面的规则
      const { pageRules } = await chrome.storage.local.get('pageRules');
      if (!pageRules) return;

      this.currentRule = pageRules.find(rule => {
        const pattern = new RegExp(rule.urlPattern);
        return pattern.test(window.location.href);
      });

      if (this.currentRule) {
        await this.initializeUI();
      }
    } catch (error) {
      console.error('Content script initialization failed:', error);
    }
  }

  async initializeUI() {
    console.log('Initializing UI');
    // 创建悬浮按钮
    this.createFloatingButton();

    // 监听打开对话框事件
    document.addEventListener('openAIChatDialog', async () => {
      if (!this.chatDialog) {
        await this.createChatDialog();
      }
      this.showDialog();
    });
  }

  createFloatingButton() {
    console.log('Creating floating button');
    const button = document.createElement('button');
    button.className = 'ai-assistant-float-btn';
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
    `;
    
    document.body.appendChild(button);
    button.addEventListener('click', () => {
      const event = new CustomEvent('openAIChatDialog');
      document.dispatchEvent(event);
    });

    // 添加样式
    const style = document.createElement('style');
    style.textContent = ``;
    document.head.appendChild(style);
  }

  async createChatDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'ai-assistant-dialog';
    dialog.innerHTML = `
      <div class="dialog-header">
        <div>
         <span>AI写作助手，当前角色：</span>
        <select class="role-selector"></select>
        </div>
        <button class="close-btn">×</button>
      </div>
      <div class="dialog-content">
        <div class="chat-messages"></div>
        <div class="input-area">
          <textarea placeholder="输入您的问题..."></textarea>
          <button class="send-btn">发送</button>
        </div>
        <div class="input-options">
            <label class="history-checkbox">
                <input type="checkbox" checked>
                包含历史对话
            </label>
        </div>
      </div>
    `;

    // 添加新的样式
    const style = document.createElement('style');
    style.textContent = `
      .input-options {
        padding: 4px 12px;
        font-size: 12px;
        color: #666;
      }

    `;
    document.head.appendChild(style);

    document.body.appendChild(dialog);
    this.chatDialog = dialog;
    this.messageHistory = [];

    // 初始化角色选择器
    const { roles } = await chrome.storage.local.get('roles');
    if (roles) {
      const roleSelector = dialog.querySelector('.role-selector');
      roles.forEach(role => {
        const option = document.createElement('option');
        option.value = role.id;
        option.textContent = role.name;
        roleSelector.appendChild(option);
      });
      const defaultRole = roles.find(role => role.isDefaultChecked);
      if(defaultRole) {
        roleSelector.value = defaultRole.id;
      }
    }

    // 添加事件监听
    this.addDialogEventListeners(dialog);
  }

  addDialogEventListeners(dialog) {
    const closeBtn = dialog.querySelector('.close-btn');
    const sendBtn = dialog.querySelector('.send-btn');
    const textarea = dialog.querySelector('textarea');

    closeBtn.addEventListener('click', () => {
      dialog.style.display = 'none';
    });

    sendBtn.addEventListener('click', () => this.handleSendMessage());

    textarea.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  async handleSendMessage() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    const sendBtn = this.chatDialog.querySelector('.send-btn');
    sendBtn.disabled = true;
    
    try {
      await this.sendMessage();
    } finally {
      this.isProcessing = false;
      sendBtn.disabled = false;
    }
  }

  async sendMessage() {
    const textarea = this.chatDialog.querySelector('textarea');
    const content = textarea.value.trim();
    if (!content) return;

    const roleSelector = this.chatDialog.querySelector('.role-selector');
    const selectedRole = roleSelector.value;
    const includeHistory = this.chatDialog.querySelector('.history-checkbox input').checked;

    this.appendMessage('user', content);
    textarea.value = '';

    try {
      const { aiConfig } = await chrome.storage.local.get('aiConfig');
      console.log(await chrome.storage.local.get());
      if (!aiConfig || !aiConfig.apiKey) {
        throw new Error('请先配置AI设置');
      }

      // 获取页面内容
      let title = '';
      const titleElement = document.querySelector(this.currentRule.selectors.title);
      if(titleElement.tagName === 'TEXTAREA' || titleElement.tagName === 'INPUT') {
        title = titleElement.value;
      } else {
        title = this.cleanHtmlContent(titleElement);
      }

      let postContent = '';
      const postContentElement = document.querySelector(this.currentRule.selectors.content);
      if(postContentElement.tagName === 'TEXTAREA' || postContentElement.tagName === 'INPUT') {
        postContent = postContentElement.value;
      } else {
        postContent = this.cleanHtmlContent(postContentElement);
      }
      
      const aiModel = AIModelFactory.createModel(aiConfig);
      const { roles } = await chrome.storage.local.get('roles');
      const selectedRoleConfig = roles.find(role => role.id === selectedRole);
 
      // 构建上下文，包含角色提示语和页面内容
      let rolePrompt = '';
      if(selectedRoleConfig) {
        rolePrompt = selectedRoleConfig.prompt;
      }
      let context = rolePrompt;
      const customTitleOrContent = rolePrompt.search('${title}') !== -1 || rolePrompt.search('${content}') !== -1;
      if(rolePrompt.search('${title}') === -1) {
        context = rolePrompt.replace('${title}', title);
      }
      if(rolePrompt.search('${content}') === -1) {
        context = rolePrompt.replace('${content}', postContent);
      }
      if(!customTitleOrContent) {
        if(title) {
          title = `标题：${title}`;
        }
        if(postContent) {
          postContent = `内容：${postContent}`;
        }
        context = `${rolePrompt}
当前页面内容：
${title}
${postContent}`;
      }

      // 准备消息历史
      const messages = [
        { role: 'system', content: context }
      ];
      
      if (includeHistory && this.messageHistory.length > 0) {
        messages.push(...this.messageHistory);
      }
      
      messages.push({ role: 'user', content: content });


      console.log('messages:', messages);
      
      const response = await aiModel.generateResponse(messages);

      // 更新消息历史
      this.messageHistory.push(
        { role: 'user', content },
        { role: 'assistant', content: response }
      );
      
      this.appendMessage('assistant', response);
    } catch (error) {
      this.appendMessage('error', `错误: ${error.message}`);
    }
  }

  appendMessage(type, content) {
    const messagesContainer = this.chatDialog.querySelector('.chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.innerHTML = content.replace(/\n/g, '<br>');
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  showDialog() {
    if (this.chatDialog) {
      this.chatDialog.style.display = 'flex';
    }
  }
}

// 初始化 content script
const contentScript = new ContentScript();
contentScript.initialize(); 