const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8080);
const DIST_DIR = path.join(__dirname, 'dist');
const NOT_FOUND_PAGE = path.join(DIST_DIR, '+not-found.html');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function safeResolve(relativePath) {
  const resolvedPath = path.resolve(DIST_DIR, relativePath);

  if (!resolvedPath.startsWith(DIST_DIR)) {
    return null;
  }

  return resolvedPath;
}

function resolveFilePath(requestPath) {
  const normalizedPath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const candidates = [
    normalizedPath,
    `${normalizedPath}.html`,
    path.join(normalizedPath, 'index.html'),
  ];

  for (const candidate of candidates) {
    const filePath = safeResolve(candidate);

    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return { filePath, statusCode: 200 };
    }
  }

  return {
    filePath: NOT_FOUND_PAGE,
    statusCode: fs.existsSync(NOT_FOUND_PAGE) ? 404 : 404,
  };
}

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function getCacheControl(filePath) {
  return path.extname(filePath).toLowerCase() === '.html'
    ? 'public, max-age=0, must-revalidate'
    : 'public, max-age=31536000, immutable';
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const { filePath, statusCode } = resolveFilePath(decodeURIComponent(requestUrl.pathname));

  fs.readFile(filePath, (error, body) => {
    if (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('The app bundle could not be loaded.');
      return;
    }

    response.writeHead(statusCode, {
      'Cache-Control': getCacheControl(filePath),
      'Content-Type': getContentType(filePath),
    });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    response.end(body);
  });
});

server.listen(PORT, () => {
  console.log(`Sunshine Driver App web server listening on ${PORT}`);
});
