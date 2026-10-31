const { spawn, execSync } = require('child_process');
const path = require('path');

const WORKSPACE = path.resolve(__dirname);

function getCredential() {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', ['credential', 'fill']);
    proc.stdin.write('protocol=https\nhost=github.com\n\n');
    let out = '';
    proc.stdout.on('data', d => out += d);
    proc.on('close', code => {
      if (code !== 0) return reject(new Error('Failed to query git credential'));
      let username = '';
      let password = '';
      out.split('\n').forEach(line => {
        if (line.startsWith('username=')) username = line.replace('username=', '').trim();
        if (line.startsWith('password=')) password = line.replace('password=', '').trim();
      });
      resolve({ username, password });
    });
  });
}

async function main() {
  console.log('1. Fetching GitHub credentials from Windows Credential Manager...');
  const { username, password } = await getCredential();
  console.log('✓ Found authenticated account:', username);

  console.log('\n2. Creating new repository on GitHub: qr-code-manager...');
  const createRes = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      'Authorization': 'token ' + password,
      'User-Agent': 'Node-Git-Client',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'qr-code-manager',
      description: 'Universal QR Code Manager SaaS — Multi-tenant standalone platform with no-code system builder, live QR studio, and Hostinger deployment suite.',
      private: false
    })
  });

  const repoData = await createRes.json();
  if (createRes.status === 201) {
    console.log('✓ Repository successfully created on GitHub:', repoData.html_url);
  } else if (createRes.status === 422) {
    console.log('Repository already exists or name taken. Using existing repo URL.');
  } else {
    console.error('GitHub API error:', repoData);
    process.exit(1);
  }

  console.log('\n3. Initializing local git repository...');
  execSync('git init -b main', { cwd: WORKSPACE, stdio: 'inherit' });
  execSync(`git config user.name "${username}"`, { cwd: WORKSPACE });
  execSync(`git config user.email "${username}@users.noreply.github.com"`, { cwd: WORKSPACE });

  console.log('\n4. Staging and committing files...');
  execSync('git add .', { cwd: WORKSPACE, stdio: 'inherit' });
  
  try {
    execSync('git commit -m "Initial commit: Universal QR Code Manager SaaS production suite"', { cwd: WORKSPACE, stdio: 'inherit' });
  } catch(e) {
    console.log('Commit already exists or nothing to commit.');
  }

  console.log('\n5. Setting remote origin...');
  const remoteUrl = `https://${username}:${password}@github.com/${username}/qr-code-manager.git`;
  try {
    execSync('git remote remove origin', { cwd: WORKSPACE, stdio: 'ignore' });
  } catch(e) {}
  execSync(`git remote add origin ${remoteUrl}`, { cwd: WORKSPACE });

  console.log('\n6. Pushing to GitHub (main branch)...');
  execSync('git push -u origin main --force', { cwd: WORKSPACE, stdio: 'inherit' });

  // Reset remote URL to clean URL (without embedded token in config)
  const cleanRemoteUrl = `https://github.com/${username}/qr-code-manager.git`;
  execSync(`git remote set-url origin ${cleanRemoteUrl}`, { cwd: WORKSPACE });

  console.log('\n🎉 SUCCESS! Project pushed to GitHub:');
  console.log(`🔗 https://github.com/${username}/qr-code-manager`);
}

main().catch(err => {
  console.error('Error during git push:', err);
  process.exit(1);
});
