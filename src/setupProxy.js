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
         proxyReq.setHeader(
          'Cookie',
           'auth_jomax=eyJhbGciOiAiUlMyNTYiLCAia2lkIjogIlYwcWZscE9sRGcifQ.eyJhdXRoIjogImJhc2ljIiwgImZ0YyI6IDIsICJpYXQiOiAxNzM5OTQ4OTUxLCAianRpIjogImdMREdLWEJfQy1FTm93WmliQU1ORlEiLCAidHlwIjogImpvbWF4IiwgInZhdCI6IDE3Mzk5NDg5NTEsICJmYWN0b3JzIjogeyJrX2ZlZCI6IDE3Mzk5NDg5NTEsICJwX29rdGEiOiAxNzM5OTQ4OTUxfSwgImN0eCI6ICIiLCAiYWNjb3VudE5hbWUiOiAicHNhY2hkZXZhIiwgInN1YiI6ICI0NDA2MjciLCAidXR5cCI6IDEwMSwgImdyb3VwcyI6IFtdfQ.MMNri3asVxqPaN-hHQi5HgHyxjPSHfOCJ5aNhoxtELD8TKcp9IWW9YMxDGVt3bk8sE0eUSvkSds9Z6HsOQWwr1iMPbPuAjVnIyXnt-qFI6-OkH9h5d5Wq0Rl0GKmkJIwfV9kutyo2oiuqReDSt99X18zCMvDPs3HCa_GFPLmwH0GCmuYoU_ukUj_AIIn4gIYjuo5HfS4rxg4q5vtoVy0LIJ9iAsnk6pc9uKHBY1lO2zT8MkNNafUBXd3InQJvmFl6M6GoToDW4LH-Z4-nBLbtXq47f2GXIZzBgMrpoNIKy4qz4kHOqDVmeIWh5hWSgpQvj3PMNJ-lVbcK3bFNQn1EA'
         );
      },
      headers: {
        'Connection': 'keep-alive'
      }
    })
  );
}; 