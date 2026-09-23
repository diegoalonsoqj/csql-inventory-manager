import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const client = await auth.getClient();
const { token } = await client.getAccessToken();

const project = 'is-production-384419';
const res = await fetch(`https://sqladmin.googleapis.com/v1/projects/${project}/instances`, {
  headers: { Authorization: `Bearer ${token}` }
});
const data = await res.json();

for (const inst of (data.items ?? []).slice(0, 3)) {
  console.log(`\n--- ${inst.name} ---`);
  console.log('userLabels:', inst.userLabels ?? 'ninguno');
  console.log('settings.userLabels:', inst.settings?.userLabels ?? 'ninguno');
}
