import serverless from 'serverless-http';
import app from '../../server/server.js';

const serverlessHandler = serverless(app);

export const handler = async (event, context) => {
  // Normalize event.path for Express route matching
  if (event.path) {
    let cleanPath = event.path.replace(/^\/\.netlify\/functions\/api/, '');
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }
    if (!cleanPath.startsWith('/api')) {
      cleanPath = '/api' + cleanPath;
    }
    cleanPath = cleanPath.replace(/^\/api\/api\//, '/api/');
    event.path = cleanPath;
  }

  try {
    return await serverlessHandler(event, context);
  } catch (err) {
    console.error('Netlify function execution error:', err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Serverless execution error', details: err.message })
    };
  }
};
