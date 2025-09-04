// cloudflare-worker.js
// Cloudflare Workers 缓存和优化脚本

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cache = caches.default;
    
    // 处理CORS预检请求
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }
    
    // 静态资源缓存策略
    if (isStaticAsset(url.pathname)) {
      return handleStaticAsset(request, cache, ctx);
    }
    
    // API请求缓存策略
    if (url.pathname.startsWith('/api/')) {
      return handleAPIRequest(request, cache, ctx);
    }
    
    // HTML页面缓存策略
    if (isHTMLPage(url.pathname)) {
      return handleHTMLPage(request, cache, ctx);
    }
    
    // 默认处理
    return fetch(request);
  }
};

/**
 * 处理CORS预检请求
 */
function handleCORS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * 判断是否为静态资源
 */
function isStaticAsset(pathname) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

/**
 * 判断是否为HTML页面
 */
function isHTMLPage(pathname) {
  return pathname.endsWith('.html') || pathname === '/' || !pathname.includes('.');
}

/**
 * 处理静态资源
 */
async function handleStaticAsset(request, cache, ctx) {
  const cacheKey = new Request(request.url, request);
  let response = await cache.match(cacheKey);
  
  if (!response) {
    response = await fetch(request);
    
    if (response.status === 200) {
      const headers = new Headers(response.headers);
      
      // 设置长期缓存
      headers.set('Cache-Control', 'public, max-age=31536000'); // 1年
      headers.set('Expires', new Date(Date.now() + 31536000000).toUTCString());
      
      // 添加CORS头
      headers.set('Access-Control-Allow-Origin', '*');
      
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
      
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }
  }
  
  return response;
}

/**
 * 处理API请求
 */
async function handleAPIRequest(request, cache, ctx) {
  const url = new URL(request.url);
  
  // 只缓存GET请求
  if (request.method !== 'GET') {
    return addCORSHeaders(await fetch(request));
  }
  
  // 可缓存的API端点
  const cacheableEndpoints = [
    '/api/database/status',
    '/api/user/profile',
    '/api/cache/stats'
  ];
  
  const shouldCache = cacheableEndpoints.some(endpoint => 
    url.pathname.startsWith(endpoint)
  );
  
  if (!shouldCache) {
    return addCORSHeaders(await fetch(request));
  }
  
  const cacheKey = new Request(request.url, request);
  let response = await cache.match(cacheKey);
  
  if (!response) {
    response = await fetch(request);
    
    if (response.status === 200) {
      const headers = new Headers(response.headers);
      
      // 设置短期缓存
      if (url.pathname.includes('/user/profile')) {
        headers.set('Cache-Control', 'private, max-age=300'); // 5分钟
      } else {
        headers.set('Cache-Control', 'public, max-age=60'); // 1分钟
      }
      
      response = addCORSHeaders(new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      }));
      
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }
  }
  
  return addCORSHeaders(response);
}

/**
 * 处理HTML页面
 */
async function handleHTMLPage(request, cache, ctx) {
  const cacheKey = new Request(request.url, request);
  let response = await cache.match(cacheKey);
  
  if (!response) {
    response = await fetch(request);
    
    if (response.status === 200) {
      const headers = new Headers(response.headers);
      
      // 设置中等缓存时间
      headers.set('Cache-Control', 'public, max-age=3600'); // 1小时
      headers.set('Vary', 'Accept-Encoding');
      
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
      
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }
  }
  
  return response;
}

/**
 * 添加CORS头
 */
function addCORSHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

/**
 * 错误处理
 */
function handleError(error) {
  console.error('Worker错误:', error);
  return new Response('服务暂时不可用', { 
    status: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
