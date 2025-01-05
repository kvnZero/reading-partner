// 基础 AI 模型类
class BaseAIModel {
  constructor(apiKey, model, temperature) {
    this.apiKey = apiKey;
    this.model = model;
    this.temperature = temperature;
  }

  async generateResponse(messages) {
    throw new Error('Method not implemented');
  }
}

// OpenAI 模型实现
class OpenAIModel extends BaseAIModel {
  constructor(apiKey, model = 'gpt-4o-mini', temperature = 1) {
    super(apiKey, model, temperature);
  }

  async generateResponse(messages) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: parseFloat(this.temperature)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || '请求失败');
    }
    console.log(data);

    return data.choices[0].message.content;
  }
}

// Claude 模型实现
class ClaudeModel extends BaseAIModel {
  constructor(apiKey, model = 'claude-3-5-sonnet-20240620', temperature = 1) {
    super(apiKey, model, temperature);
  }
  async generateResponse(prompt, context) {
    // Claude API 实现
    throw new Error('Claude API not implemented yet');
  }
}

// Gemini 模型实现
class GeminiModel extends BaseAIModel {
  constructor(apiKey, model = 'gemini-1.5-flash', temperature = 1) {
    super(apiKey, model, temperature);
  }
  async generateResponse(messages) {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: parseFloat(this.temperature) 
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || '请求失败');
    }
    console.log(data);

    return data.choices[0].message.content;
  }
}

// DeepSeek 模型实现
class DeepSeekModel extends BaseAIModel {
  constructor(apiKey, model = 'deepseek-chat', temperature = 1.3) {
    super(apiKey, model, temperature);
  }
  async generateResponse(messages) {
    console.log('DeepSeekModel generateResponse', this.model, this.temperature);
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: parseFloat(this.temperature)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || '请求失败');
    }
    console.log(data);

    return data.choices[0].message.content;
  }
}

// Kimi 模型实现
class KimiModel extends BaseAIModel {
  constructor(apiKey, model = 'moonshot-v1-8k', temperature = 0.3) {
    super(apiKey, model, temperature);
  }
  async generateResponse(messages) {
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: parseFloat(this.temperature)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || '请求失败');
    }
    console.log(data);
    return data.choices[0].message.content;
  }
}

// 豆包模型实现
class DoubaoModel extends BaseAIModel {
  constructor(apiKey, model = 'doubao-pro-4k-240515', temperature = 1) {
    super(apiKey, model, temperature);
  }
  async generateResponse(messages) {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: parseFloat(this.temperature)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || '请求失败');
    }
    console.log(data);
    return data.choices[0].message.content;
  }
} 

// AI 模型工厂
class AIModelFactory {
  static createModel(config) {
    const { aiModel, apiKey, model, temperature } = config;

    if(!aiModel) {
      throw new Error('AI model is required');
    }
    if(!apiKey) {
      throw new Error('API key is required');
    }
    if(!model) {
      throw new Error('Model is required');
    }

    switch (aiModel) {
      case 'openai':
        return new OpenAIModel(apiKey, model, temperature);
      case 'claude':
        return new ClaudeModel(apiKey, model, temperature);
      case 'gemini':
        return new GeminiModel(apiKey, model, temperature);
      case 'doubao':
        return new DoubaoModel(apiKey, model, temperature);
      case 'deepseek':
        return new DeepSeekModel(apiKey, model, temperature);
      case 'kimi':
        return new KimiModel(apiKey, model, temperature);
      default:
        throw new Error('Unsupported AI model');
    }
  }
}

// 导出
window.AIModelFactory = AIModelFactory;
