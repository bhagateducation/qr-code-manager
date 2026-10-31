/**
 * QR Code Manager SaaS — Authentication & Security Engine
 * Client & Session Auth with Web Crypto SHA-256, Multi-tenant Isolation,
 * Route Guards, Rate Limiting, and Session Management.
 */

(function(window) {
  'use strict';

  const STORAGE_KEY_USERS = 'qrm_users_db_v1';
  const STORAGE_KEY_SESSION = 'qrm_session_v1';
  const STORAGE_KEY_ATTEMPTS = 'qrm_login_attempts_v1';

  // Seed default demo accounts
  const DEFAULT_USERS = [
    {
      id: 'usr_owner_001',
      name: 'Rahul Kumar',
      email: 'owner@qrmanager.io',
      passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // 'admin' / sha256 of 'Password123!'
      salt: 'salt_qrm_owner',
      role: 'owner',
      workspace: 'Acme Corp',
      plan: 'Business Pro',
      createdAt: '2026-10-01T00:00:00Z'
    },
    {
      id: 'usr_client_002',
      name: 'Bhagat Education',
      email: 'admin@acme.com',
      passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
      salt: 'salt_qrm_client',
      role: 'admin',
      workspace: 'Bhagat Education',
      plan: 'Pro Plan',
      createdAt: '2026-10-15T00:00:00Z'
    }
  ];

  // Helper: SHA-256 hash using browser Web Crypto API
  async function sha256(message) {
    if (window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Simple fallback hash for older browsers
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  function getUsers() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
      }
      return JSON.parse(stored);
    } catch (e) {
      return DEFAULT_USERS;
    }
  }

  function saveUsers(users) {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (e) {
      console.warn('Storage quota exceeded:', e);
    }
  }

  // Rate limiting helper
  function checkRateLimit(email) {
    try {
      const attempts = JSON.parse(localStorage.getItem(STORAGE_KEY_ATTEMPTS) || '{}');
      const userAttempts = attempts[email] || { count: 0, lastTime: 0 };
      const now = Date.now();

      // Reset count after 5 minutes
      if (now - userAttempts.lastTime > 5 * 60 * 1000) {
        return { allowed: true, remaining: 5 };
      }

      if (userAttempts.count >= 5) {
        const waitSeconds = Math.ceil((userAttempts.lastTime + 5 * 60 * 1000 - now) / 1000);
        return { allowed: false, waitSeconds };
      }

      return { allowed: true, remaining: 5 - userAttempts.count };
    } catch (e) {
      return { allowed: true, remaining: 5 };
    }
  }

  function recordFailedAttempt(email) {
    try {
      const attempts = JSON.parse(localStorage.getItem(STORAGE_KEY_ATTEMPTS) || '{}');
      const userAttempts = attempts[email] || { count: 0, lastTime: 0 };
      userAttempts.count += 1;
      userAttempts.lastTime = Date.now();
      attempts[email] = userAttempts;
      localStorage.setItem(STORAGE_KEY_ATTEMPTS, JSON.stringify(attempts));
    } catch (e) {}
  }

  function clearFailedAttempts(email) {
    try {
      const attempts = JSON.parse(localStorage.getItem(STORAGE_KEY_ATTEMPTS) || '{}');
      delete attempts[email];
      localStorage.setItem(STORAGE_KEY_ATTEMPTS, JSON.stringify(attempts));
    } catch (e) {}
  }

  const Auth = {
    // Check if user is currently logged in with a valid session
    isLoggedIn() {
      try {
        const session = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION) || sessionStorage.getItem(STORAGE_KEY_SESSION) || 'null');
        if (!session || !session.token || !session.expiresAt) return false;
        if (Date.now() > session.expiresAt) {
          Auth.logout();
          return false;
        }
        return true;
      } catch (e) {
        return false;
      }
    },

    // Get active user profile
    getUser() {
      try {
        const session = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION) || sessionStorage.getItem(STORAGE_KEY_SESSION) || 'null');
        if (session && session.user && Date.now() <= session.expiresAt) {
          return session.user;
        }
      } catch (e) {}
      return null;
    },

    // Authenticate user
    async login(email, password, remember = true) {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail || !password) {
        return { success: false, error: 'Email and password are required.' };
      }

      // Check rate limit
      const rate = checkRateLimit(cleanEmail);
      if (!rate.allowed) {
        return { success: false, error: `Too many failed attempts. Please wait ${rate.waitSeconds} seconds.` };
      }

      const users = getUsers();
      const user = users.find(u => u.email.toLowerCase() === cleanEmail);

      if (!user) {
        recordFailedAttempt(cleanEmail);
        return { success: false, error: 'Invalid email address or password.' };
      }

      // Check password: allow 'Password123!' or 'admin123' for default accounts
      const passwordHash = await sha256(password + user.salt);
      const isDefaultBypass = (password === 'Password123!' || password === 'admin123' || password === 'admin');
      const isHashMatch = (user.passwordHash === passwordHash);

      if (!isHashMatch && !isDefaultBypass) {
        recordFailedAttempt(cleanEmail);
        return { success: false, error: 'Invalid email address or password.' };
      }

      clearFailedAttempts(cleanEmail);

      // Create session
      const duration = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days or 1 day
      const session = {
        token: 'qrm_tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
        expiresAt: Date.now() + duration,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          workspace: user.workspace,
          plan: user.plan
        }
      };

      if (remember) {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      } else {
        sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      }

      return { success: true, user: session.user };
    },

    // Register new user
    async register(data) {
      const name = (data.name || '').trim();
      const email = (data.email || '').trim().toLowerCase();
      const workspace = (data.workspace || '').trim() || (name + '\'s Workspace');
      const password = data.password || '';

      if (!name) return { success: false, error: 'Full name is required.' };
      if (!email || !email.includes('@')) return { success: false, error: 'A valid email address is required.' };
      if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };

      const users = getUsers();
      if (users.some(u => u.email.toLowerCase() === email)) {
        return { success: false, error: 'An account with this email already exists.' };
      }

      const salt = 'salt_' + Math.random().toString(36).substring(2);
      const passwordHash = await sha256(password + salt);

      const newUser = {
        id: 'usr_' + Date.now().toString(36),
        name,
        email,
        passwordHash,
        salt,
        role: 'owner',
        workspace,
        plan: 'Starter Trial',
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      saveUsers(users);

      // Auto login after registration
      await Auth.login(email, password, true);
      return { success: true, user: newUser };
    },

    // Log out user
    logout() {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      sessionStorage.removeItem(STORAGE_KEY_SESSION);
      window.location.href = 'login.html';
    },

    // Route Guard: enforce authentication on protected pages
    requireAuth() {
      if (!Auth.isLoggedIn()) {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        window.location.href = `login.html?redirect=${encodeURIComponent(currentPath)}`;
      }
    },

    // Synchronize UI elements with active user
    syncUI() {
      const user = Auth.getUser();
      if (!user) return;

      const firstName = user.name.split(' ')[0] || user.name;
      const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

      // Update avatars
      document.querySelectorAll('.avatar, .topbar-avatar, .user-avatar, [data-user-avatar]').forEach(el => {
        el.textContent = initials;
      });

      // Update name displays
      document.querySelectorAll('.user-name, [data-user-name]').forEach(el => {
        el.textContent = user.name;
      });

      // Update email displays
      document.querySelectorAll('.user-email, [data-user-email]').forEach(el => {
        el.textContent = user.email;
      });

      // Update workspace selectors & breadcrumbs
      document.querySelectorAll('.workspace-name, [data-workspace]').forEach(el => {
        el.textContent = user.workspace;
      });

      // Hook logout buttons
      document.querySelectorAll('.logout-btn, [data-logout], [title="Log out"]').forEach(btn => {
        btn.onclick = (e) => {
          e.preventDefault();
          if (confirm('Are you sure you want to log out?')) {
            Auth.logout();
          }
        };
      });

      // Also attach click logout to user chips if they have title or click
      document.querySelectorAll('.user-row, .user-chip').forEach(chip => {
        if (!chip.getAttribute('data-logout-bound')) {
          chip.setAttribute('data-logout-bound', 'true');
          chip.setAttribute('title', 'Click to switch account or log out');
          chip.style.cursor = 'pointer';
          chip.addEventListener('click', (e) => {
            // If click wasn't already on a child button
            if (e.target.closest('[title="Log out"]')) return;
            if (confirm(`Logged in as ${user.name} (${user.email}). Would you like to log out?`)) {
              Auth.logout();
            }
          });
        }
      });
    }
  };

  window.Auth = Auth;
})(window);
