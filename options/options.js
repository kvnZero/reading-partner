class OptionsManager {
  constructor() {
    this.currentTab = 'ai-settings';
    this.syncRuleUrl = null;
    this.syncRoleUrl = null;
  }

  async initialize() {
    this.initializeTabs();
    await this.loadAISettings();
    await this.loadAndRenderRules();
    await this.loadAndRenderRoles();
    await this.loadAndRenderQuickQuestions();
    this.initializeEventListeners();
  }

  initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });
  }

  switchTab(tabId) {
    document.querySelector(`.tab-btn[data-tab="${this.currentTab}"]`).classList.remove('active');
    document.querySelector(`#${this.currentTab}`).classList.remove('active');
    
    this.currentTab = tabId;
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
    document.querySelector(`#${tabId}`).classList.add('active');
  }

  async loadAISettings() {
    const { aiConfig } = await chrome.storage.local.get('aiConfig');
    if (aiConfig) {
      document.querySelector('#ai-model-select').value = aiConfig.aiModel;
      document.querySelector('#api-key').value = aiConfig.apiKey;
      document.querySelector('#model').value = aiConfig.model;
      document.querySelector('#temperature').value = aiConfig.temperature || 1;
    }
  }

  async loadAndRenderRules() {
    const { pageRules } = await chrome.storage.local.get('pageRules');
    const customRules = pageRules?.filter(rule => !rule.isDefault) || [];
    const defaultRules = pageRules?.filter(rule => rule.isDefault) || [];
    
    this.renderRulesList(defaultRules, '.default-rules', false);
    this.renderRulesList(customRules, '.custom-rules', true);
  }

  async loadAndRenderRoles() {
    const { roles } = await chrome.storage.local.get('roles');
    const defaultRoles = roles?.filter(role => role.isDefault) || [];
    const customRoles = roles?.filter(role => !role.isDefault) || [];
    
    this.renderRolesList(defaultRoles, '.default-roles', false);
    this.renderRolesList(customRoles, '.custom-roles', true);
  }

  async loadAndRenderQuickQuestions() {
    const { quickQuestions } = await chrome.storage.local.get('quickQuestions');
    this.renderQuickQuestionsList(quickQuestions || [], '.quick-questions-list', true);
  }

  renderQuickQuestionsList(quickQuestions, containerSelector) {
    const container = document.querySelector(containerSelector);
    container.innerHTML = '';
    
    quickQuestions.forEach((question, index) => {
        const div = document.createElement('div');
        div.className = 'quick-question-item';
        div.innerHTML = `
            <span class="quick-question-text" data-id="${question.id}">${question.question}</span>
            <button class="delete-btn" data-id="${question.id}">删除</button>
        `;
        container.appendChild(div);
    });
    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if(confirm('确定要删除吗？')) { 
          await this.deleteQuickQuestion(btn.dataset.id);
        }
      });
    });
  }

  renderRulesList(rules, containerSelector, allowDelete) {
    const container = document.querySelector(containerSelector);
    container.innerHTML = '';

    rules.forEach(rule => {
      const ruleElement = document.createElement('div');
      ruleElement.className = `rule-item ${rule.isDefault ? 'default' : ''}`;
      ruleElement.innerHTML = `
        <span>${rule.urlPattern} | ${rule.selectors.title} | ${rule.selectors.content}</span>
        ${allowDelete ? `<button class="delete-btn" data-id="${rule.id}">删除</button>` : ''}
      `;
      container.appendChild(ruleElement);
    });

    if (allowDelete) {
      container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if(confirm('确定要删除吗？')) { 
            await this.deleteRule(btn.dataset.id);
          }
        });
      });
    }
  }

  renderRolesList(roles, containerSelector, allowDelete) {
    const container = document.querySelector(containerSelector);
    container.innerHTML = '';

    roles.forEach(role => {
      const roleElement = document.createElement('div');
      roleElement.className = `role-item ${role.isDefault ? 'default' : ''}`;
      roleElement.innerHTML = `
        <span>${role.name} | ${role.prompt}</span>
        <div class="role-item-actions">
          ${!role.isDefaultChecked ? `<button class="default-btn" data-id="${role.id}">设为默认</button>` : ''}
          ${allowDelete ? `<button class="delete-btn" data-id="${role.id}">删除</button>` : ''}
        </div>
      `;
      container.appendChild(roleElement);
    });

    if (allowDelete) {
      container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if(confirm('确定要删除吗？')) { 
            await this.deleteRole(btn.dataset.id);
          }
        });
      });
    }
    container.querySelectorAll('.default-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await this.setDefaultCheckedRole(btn.dataset.id);
      });
    });
  }

  initializeEventListeners() {
    // AI设置
    document.querySelector('#save-ai-settings').addEventListener('click', async () => {
      const aiConfig = {
        aiModel: document.querySelector('#ai-model-select').value,
        apiKey: document.querySelector('#api-key').value,
        model: document.querySelector('#model').value,
        temperature: document.querySelector('#temperature').value || 1
      };
      await chrome.storage.local.set({ aiConfig });
      console.log(await chrome.storage.local.get());
      this.showMessage('AI设置已保存', 'success');
    });

    // 页面规则
    document.querySelector('#add-rule').addEventListener('click', () => {
      document.querySelector('.rule-form').style.display = 'block';
    });

    document.querySelector('#sync-rule').addEventListener('click', () => {
      if(this.syncRuleUrl) {
        fetch(this.syncRuleUrl)
          .then(response => {
            let data = response.json();
            data = data.filter(rule => rule.isDefault);
            if(data.length > 0) {
              chrome.storage.local.get('pageRules').then(async (oldRules) => {
                oldRules.filter(rule => !rule.isDefault).forEach(rule => {
                  data.push(rule);
                });
                chrome.storage.local.set({
                  pageRules: data
                }).then(() => {
                  this.loadAndRenderRules();
                  this.showMessage('同步规则成功', 'success');
                });
              });
            } else {
              this.showMessage('远程规则为空,不进行同步', 'error');
            }
          })
          .catch(error => {
            this.showMessage('同步规则失败', 'error');
          });
      } else {
        this.showMessage('请先设置同步规则URL', 'error');
      }
    });

    document.querySelector('#cancel-rule').addEventListener('click', () => {
      document.querySelector('.rule-form').style.display = 'none';
    });

    document.querySelector('#save-rule').addEventListener('click', async () => {
      const rule = {
        id: Date.now().toString(),
        urlPattern: document.querySelector('#url-pattern').value,
        selectors: {
          title: document.querySelector('#title-selector').value,
          content: document.querySelector('#content-selector').value
        }
      };

      const { pageRules } = await chrome.storage.local.get('pageRules');
      const updatedRules = [...(pageRules || []), rule];
      await chrome.storage.local.set({ pageRules: updatedRules });
      
      document.querySelector('.rule-form').style.display = 'none';

      document.querySelector('#title-selector').value = '';
      document.querySelector('#content-selector').value = '';   
      document.querySelector('#url-pattern').value = '';

      await this.loadAndRenderRules();
      this.showMessage('规则已保存', 'success');
    });

    // 角色管理
    document.querySelector('#add-role').addEventListener('click', () => {
      document.querySelector('.role-form').style.display = 'block';
    });

    document.querySelector('#cancel-role').addEventListener('click', () => {
      document.querySelector('.role-form').style.display = 'none';
    });

    document.querySelector('#sync-role').addEventListener('click', () => {
      if(this.syncRoleUrl) {
        fetch(this.syncRoleUrl)
          .then(response => {
            let data = response.json();
            data = data.filter(role => role.isDefault);
            if(data.length > 0) {
              chrome.storage.local.get('roles').then(async (oldRoles) => {
                oldRoles.filter(role => !role.isDefault).forEach(role => {
                  data.push(role);
                });
                chrome.storage.local.set({
                  roles: data
                }).then(() => {
                  this.loadAndRenderRoles();
                  this.showMessage('同步角色成功', 'success');
                });
              });
            } else {
              this.showMessage('远程角色为空,不进行同步', 'error');
            }
          })
          .catch(error => {
            this.showMessage('同步角色失败', 'error');
          });
      } else {
        this.showMessage('请先设置同步角色URL', 'error');
      }
    });

    document.querySelector('#save-role').addEventListener('click', async () => {
      const role = {
        id: Date.now().toString(),
        name: document.querySelector('#role-name').value,
        prompt: document.querySelector('#role-prompt').value
      };

      const { roles } = await chrome.storage.local.get('roles');
      const updatedRoles = [...(roles || []), role];
      await chrome.storage.local.set({ roles: updatedRoles });
      
      document.querySelector('.role-form').style.display = 'none';

      document.querySelector('#role-name').value = '';
      document.querySelector('#role-prompt').value = '';

      await this.loadAndRenderRoles();
      this.showMessage('角色已保存', 'success');
    });

    // 快捷提问
    document.querySelector('#add-quick-question').addEventListener('click', () => {
      document.querySelector('.quick-question-form').style.display = 'block';
    });

    document.querySelector('#cancel-quick-question').addEventListener('click', () => {
      document.querySelector('.quick-question-form').style.display = 'none';
    });

    document.querySelector('#save-quick-question').addEventListener('click', async () => {
      const quickQuestion = {
        id: Date.now().toString(),
        question: document.querySelector('#quick-question').value
      };
      await this.addQuickQuestion(quickQuestion);
      document.querySelector('.quick-question-form').style.display = 'none';
      document.querySelector('#quick-question').value = '';
      document.querySelector('#quick-question').focus();
      this.showMessage('快捷提问已保存', 'success');
    });

    document.querySelector('#quick-question').addEventListener('keyup', () => {
      if(document.querySelector('#quick-question').value.length > 0) {
        document.querySelector('#save-quick-question').disabled = false;
      } else {
        document.querySelector('#save-quick-question').disabled = true;
      }
    });

    document.querySelector('#cancel-quick-question').addEventListener('click', () => {
      document.querySelector('.quick-question-form').style.display = 'none';
    });
  }

  async deleteRule(id) {
    const { pageRules } = await chrome.storage.local.get('pageRules');
    const updatedRules = pageRules.filter(rule => rule.id !== id);
    await chrome.storage.local.set({ pageRules: updatedRules });
    await this.loadAndRenderRules();
    this.showMessage('规则已删除', 'success');
  }

  async deleteRole(roleId) {
    const { roles } = await chrome.storage.local.get('roles');
    const updatedRoles = roles.filter(role => role.id !== roleId);
    await chrome.storage.local.set({ roles: updatedRoles });
    await this.loadAndRenderRoles();
    this.showMessage('角色已删除', 'success');
  }

  async setDefaultCheckedRole(roleId) {
    const { roles } = await chrome.storage.local.get('roles');
    const updatedRoles = roles.map(role => ({ ...role, isDefaultChecked: role.id === roleId }));
    await chrome.storage.local.set({ roles: updatedRoles });
    await this.loadAndRenderRoles();
    this.showMessage('角色已设为默认', 'success');
  }


  async deleteQuickQuestion(id) {
    const { quickQuestions } = await chrome.storage.local.get('quickQuestions');
    const updatedQuickQuestions = quickQuestions.filter(question => question.id !== id);
    await chrome.storage.local.set({ quickQuestions: updatedQuickQuestions });
    await this.loadAndRenderQuickQuestions();
    this.showMessage('快捷提问已删除', 'success');
  }


  async addQuickQuestion(newQuestion) {
    const { quickQuestions } = await chrome.storage.local.get('quickQuestions');
    const updatedQuickQuestions = [...(quickQuestions || []), newQuestion];
    await chrome.storage.local.set({ quickQuestions: updatedQuickQuestions });
    await this.loadAndRenderQuickQuestions();
    this.showMessage('快捷提问已添加', 'success');
  }

  showMessage(message, type) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    document.body.appendChild(messageElement);
    setTimeout(() => {
      messageElement.remove();
    }, 3000);
  }
}

const optionsManager = new OptionsManager();
optionsManager.initialize(); 