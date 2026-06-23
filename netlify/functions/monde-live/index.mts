import { Handler } from '@netlify/functions';

const handler: Handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Fonction Monde Live active ✓',
      timestamp: new Date().toISOString(),
    }),
  };
};

export { handler };
