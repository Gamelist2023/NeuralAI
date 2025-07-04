const endpointBase = 'https://neuralai-jbwc.onrender.com';

const endpoints = [
  { label: 'Chat (POST /chat)', value: '/chat', method: 'POST', description: 'AIチャット/画像生成' },
  { label: 'モデル/プロバイダー一覧 (POST /models)', value: '/models', method: 'POST', description: '利用可能なモデル/プロバイダー取得' },
  { label: 'ヘルスチェック (GET /health)', value: '/health', method: 'GET', description: 'サーバーヘルス確認' },
  { label: 'ルート (GET /)', value: '/', method: 'GET', description: 'README/トップページ取得' },
];

window.addEventListener('DOMContentLoaded', () => {
  // 共通要素の取得
  const endpointSelect = document.getElementById('endpoint');
  const methodLabel = document.getElementById('method-label');
  const requestArea = document.getElementById('request-area');
  const sendBtn = document.getElementById('send-btn');
  const responseArea = document.getElementById('response-area');
  const urlInput = document.getElementById('url-input');
  const chatForm = document.getElementById('chat-form');
  const chatMessage = document.getElementById('chat-message');
  const chatLog = document.getElementById('chat-log');
  const chatModel = document.getElementById('chat-model');
  const toggleBtn = document.getElementById('toggle-mode-btn');
  const devPanel = document.getElementById('dev-panel');
  const chatDemo = document.getElementById('chat-demo');
  
  // チャットログを初期化
  chatLog.textContent = '';

  // エンドポイント選択設定
  endpoints.forEach(ep => {
    const opt = document.createElement('option');
    opt.value = ep.value;
    opt.textContent = `${ep.label} [${ep.method}]`;
    endpointSelect.appendChild(opt);
  });

  endpointSelect.addEventListener('change', () => {
    const ep = endpoints[endpointSelect.selectedIndex];
    methodLabel.textContent = ep.method;
    urlInput.value = endpointBase + ep.value;
    if (ep.method === 'GET') {
      requestArea.value = '';
      requestArea.disabled = true;
    } else {
      requestArea.disabled = false;
    }
  });

  // 初期設定
  endpointSelect.dispatchEvent(new Event('change'));

  // API送信ボタンの設定
  sendBtn.addEventListener('click', async () => {
    const ep = endpoints[endpointSelect.selectedIndex];
    const url = urlInput.value;
    let reqBody = requestArea.value;
    responseArea.textContent = 'リクエスト送信中...';
    try {
      let res;
      if (ep.method === 'GET') {
        res = await fetch(url);
      } else {
        res = await fetch(url, {
          method: ep.method,
          headers: { 'Content-Type': 'application/json' },
          body: reqBody
        });
      }
      const contentType = res.headers.get('content-type') || '';
      let text = await res.text();
      if (contentType.includes('application/json')) {
        try {
          text = JSON.stringify(JSON.parse(text), null, 2);
        } catch {}
      }
      responseArea.textContent = text;
    } catch (e) {
      responseArea.textContent = 'エラー: ' + e;
    }
  });

  // チャットデモ機能の設定
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = chatMessage.value.trim();
    const model = chatModel.value;
    if (!msg) return;
    
    chatLog.textContent += `\nユーザー: ${msg}`;
    chatMessage.value = '';
    chatMessage.disabled = true;
    chatForm.querySelector('button').disabled = true;
    chatLog.textContent += `\nAI: ...応答中...`;
    
    // チャットの最新部分が見えるようスクロール
    chatLog.scrollTop = chatLog.scrollHeight;
    
    // ストリーミングAPIリクエスト
    try {
      const res = await fetch('https://neuralai-jbwc.onrender.com/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({ model, message: msg, stream: true })
      });
      
      if (!res.body) throw new Error('ストリーミング未対応ブラウザ');
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let aiText = '';
      let done = false;
      
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          let lines = buffer.split('\n\n');
          buffer = lines.pop();
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.delta) {
                  aiText += data.delta;
                  chatLog.textContent = chatLog.textContent.replace(/AI: \.\.\.応答中\.\.\.$/, `AI: ${aiText}_`);
                  chatLog.scrollTop = chatLog.scrollHeight;
                } else if (data.end_of_stream) {
                  chatLog.textContent = chatLog.textContent.replace(/AI: .+_$/, `AI: ${aiText}`);
                  chatLog.scrollTop = chatLog.scrollHeight;
                }
              } catch {}
            }
          }
        }
      }
      
      if (!aiText) {
        chatLog.textContent = chatLog.textContent.replace(/AI: \.\.\.応答中\.\.\.$/, 'AI: [応答なし]');
      }
    } catch (e) {
      chatLog.textContent = chatLog.textContent.replace(/AI: \.\.\.応答中\.\.\.$/, `AI: [通信エラー]`);
    }
    
    chatMessage.disabled = false;
    chatForm.querySelector('button').disabled = false;
    chatMessage.focus();
  });

  // モード切り替え機能の設定
  let devMode = false;
  
  function updateMode() {
    if (devMode) {
      devPanel.style.display = 'block';
      chatDemo.style.display = 'none';
      toggleBtn.textContent = '一般ユーザーモードに切り替え';
    } else {
      devPanel.style.display = 'none';
      chatDemo.style.display = 'block';
      toggleBtn.textContent = '開発者モードに切り替え';
    }
  }
  
  toggleBtn.addEventListener('click', () => {
    devMode = !devMode;
    updateMode();
  });
  
  // 初期モード設定
  updateMode();
});
