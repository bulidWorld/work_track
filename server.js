const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 10512;
const FRONTEND_DIR = path.join(__dirname, 'frontend', 'dist');
const BACKEND_DIR = path.join(__dirname, 'backend');

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// 服务前端静态文件
app.use(express.static(FRONTEND_DIR));

// API 代理到后端 - 简单实现
app.use('/api', (req, res) => {
  // 重建完整路径（因为 app.use('/api') 会去掉前缀）
  const fullPath = '/api' + req.url;
  console.log(`[Proxy] ${req.method} ${fullPath}`);
  
  const headers = {};
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
  if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];
  
  const options = {
    hostname: '127.0.0.1',
    port: 10513,
    path: fullPath,
    method: req.method,
    headers: headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    console.log(`[Proxy] Response: ${proxyRes.statusCode}`);
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: 'Backend service unavailable', details: err.message });
  });

  proxyReq.setTimeout(30000, () => {
    proxyReq.destroy();
    res.status(504).json({ error: 'Backend timeout' });
  });

  if (req.body && Object.keys(req.body).length > 0) {
    proxyReq.write(JSON.stringify(req.body));
  }
  
  req.pipe(proxyReq);
});

// 健康检查（绕过代理，直接响应）
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    frontend: FRONTEND_DIR,
    backend: `http://localhost:10513`,
    port: PORT
  });
});

// SPA 回退 - 所有非 API 请求都返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// 启动服务
async function start() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     Work Track Unified Server Starting...                 ║');
  console.log(`║     URL:      http://0.0.0.0:${PORT}`.padEnd(59) + '║');
  console.log(`║     API:      http://0.0.0.0:${PORT}/api/*`.padEnd(59) + '║');
  console.log(`║     Frontend: ${FRONTEND_DIR}`.padEnd(59) + '║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  
  // 启动后端服务进程
  console.log('\n[Unified Server] Starting backend service...');
  const backend = spawn('node', ['dist/index.js'], {
    cwd: BACKEND_DIR,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PORT: 10513 }
  });

  backend.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });

  backend.stderr.on('data', (data) => {
    console.error(`[Backend Error] ${data.toString().trim()}`);
  });

  backend.on('error', (err) => {
    console.error('[Backend] Failed to start:', err);
  });

  backend.on('exit', (code) => {
    console.log(`[Backend] Process exited with code ${code}`);
  });

  // 等待后端启动
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log('[Unified Server] Backend started');

  // 启动统一服务
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Unified Server] Listening on port ${PORT}`);
  });
}

start();
