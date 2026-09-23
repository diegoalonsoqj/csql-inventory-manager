import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

console.log('Getting credentials...');
try {
  const client = await auth.getClient();
  console.log('Client type:', client.constructor.name);
  const token = await client.getAccessToken();
  console.log('Token obtained:', token.token ? token.token.substring(0, 20) + '...' : 'null');

  // Make a raw API call
  const projectId = 'is-production-384419';
  const url = `https://sqladmin.googleapis.com/v1/projects/${projectId}/instances`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token.token}` }
  });
  const data = await response.json();
  if (!response.ok) {
    console.error('API error:', response.status, JSON.stringify(data));
  } else {
    console.log('SUCCESS - instances:', data.items?.length ?? 0);
  }
} catch (err) {
  console.error('Error:', err.message);
}
