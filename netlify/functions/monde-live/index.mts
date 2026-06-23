import { Handler } from '@netlify/functions';

interface ResponseData {
  timestamp: string;
  message: string;
  status: string;
  environment: {
    runtime: string;
    region?: string;
  };
}

const handler: Handler = async (event, context) => {
  try {
    // Log request details
    console.log('Incoming request:', {
      httpMethod: event.httpMethod,
      path: event.path,
      headers: event.headers,
    });

    // Handle different HTTP methods
    if (event.httpMethod === 'GET') {
      const responseData: ResponseData = {
        timestamp: new Date().toISOString(),
        message: 'Welcome to Monde Live API',
        status: 'operational',
        environment: {
          runtime: 'Node.js',
          region: process.env.NETLIFY_REGION || 'us-east-1',
        },
      };

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: JSON.stringify(responseData),
      };
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};

      const responseData = {
        timestamp: new Date().toISOString(),
        message: 'Data received',
        status: 'processed',
        received: body,
        environment: {
          runtime: 'Node.js',
          region: process.env.NETLIFY_REGION || 'us-east-1',
        },
      };

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(responseData),
      };
    }

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      };
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        statusCode: 405,
        message: 'Method not allowed',
      }),
    };
  } catch (error) {
    console.error('Function error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        statusCode: 500,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export { handler };
