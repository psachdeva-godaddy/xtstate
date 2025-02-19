const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/graphql',
    createProxyMiddleware({
      target: 'https://localhost:8443',
      changeOrigin: true,
      secure: false,
      ws: true,
      onProxyReq: (proxyReq, req) => {
        // Add the cookie to the proxy request
        // proxyReq.setHeader(
        //   'Cookie',
        //   'auth_jomax='
        // );
      },
      headers: {
        'Connection': 'keep-alive'
      }
    })
  );
}; 