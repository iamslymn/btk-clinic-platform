import { supabase } from './supabase';

// Custom Auth Implementation - Bypasses Supabase Client
// Since direct HTTP works but Supabase client hangs

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    email_confirmed_at: string;
    created_at: string;
  };
}

interface UserProfile {
  id: string;
  email: string;
  role: 'super_admin' | 'manager' | 'rep';
  manager?: any;
  representative?: any;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

class CustomAuth {
  private accessToken: string | null = null;
  private user: any = null;
  private userProfile: UserProfile | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load from localStorage if exists
    const stored = localStorage.getItem('customAuth');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken || null;
        this.user = data.user;
        this.userProfile = data.userProfile;
        // Restore Supabase session if this is a real token (not mock)
        if (this.accessToken && !this.accessToken.startsWith('mock_token_') && this.refreshToken) {
          supabase.auth.setSession({ access_token: this.accessToken, refresh_token: this.refreshToken });
        }
      } catch (e) {
        console.warn('Failed to parse stored auth data');
      }
    }
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {

    try {
      // Try Supabase auth first (for managers and super admins)
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const authData: AuthResponse = await response.json();
        
        // Store auth data
        this.accessToken = authData.access_token;
        this.refreshToken = authData.refresh_token;
        this.user = authData.user;

        // Set Supabase client session so Storage and DB calls are authenticated
        await supabase.auth.setSession({
          access_token: authData.access_token,
          refresh_token: authData.refresh_token
        });

        // Load user profile
        await this.loadUserProfile(authData.user.id);

        // Store in localStorage
        this.saveToStorage();

        return authData;
      }
    } catch (error) {
      // Supabase auth failed, trying database-only login
    }

    // Try database-only login (for representatives)
    try {
      const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${email}&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error('User not found');
      }

      const users = await userResponse.json();
      if (!users || users.length === 0) {
        throw new Error('Invalid email or password');
      }

      const userData = users[0];

      // For database-only users, we'll create a mock auth response
      // Note: In production, you'd want to implement proper password hashing
      const mockAuthData: AuthResponse = {
        access_token: `mock_token_${userData.id}`,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        refresh_token: `refresh_${userData.id}`,
        user: {
          id: userData.id,
          email: userData.email,
          email_confirmed_at: new Date().toISOString(),
          created_at: userData.created_at
        }
      };

      // Store auth data (mock)
      this.accessToken = mockAuthData.access_token;
      this.refreshToken = mockAuthData.refresh_token;
      this.user = mockAuthData.user;

      // Do NOT set Supabase session for mock tokens

      // Load user profile
      await this.loadUserProfile(userData.id);

      // Store in localStorage
      this.saveToStorage();

      return mockAuthData;
    } catch (error) {
      throw new Error('Invalid email or password');
    }
  }

  async loadUserProfile(userId: string): Promise<UserProfile> {

    // Prepare headers (for mock tokens, we'll use anonymous access)
    const isMockToken = this.accessToken?.startsWith('mock_token_');
    const headers: Record<string, string> = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };

    if (!isMockToken && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Get basic user data
    const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*`, {
      headers
    });

    if (!userResponse.ok) {
      throw new Error('Failed to load user profile');
    }

    const users = await userResponse.json();
    if (!users || users.length === 0) {
      throw new Error('User not found in database');
    }

    const userData = users[0];

    // Load manager profile if needed
    let managerData = null;
    if (userData.role === 'manager' || userData.role === 'super_admin') {
      const managerResponse = await fetch(`${SUPABASE_URL}/rest/v1/managers?user_id=eq.${userId}&select=*`, {
        headers
      });

      if (managerResponse.ok) {
        const managers = await managerResponse.json();
        managerData = managers[0] || null;
      }
    }

    // Load representative profile if needed
    let representativeData = null;
    if (userData.role === 'rep') {
      
      try {
        // Try auth_user_id first (new way)
        let repResponse = await fetch(`${SUPABASE_URL}/rest/v1/representatives?auth_user_id=eq.${userId}&select=*`, {
          headers
        });

        let reps = [] as any[];
        if (repResponse.ok) {
          reps = await repResponse.json();
        }

        // Fallback: Try user_id (old way) if auth_user_id doesn't return results
        if (!reps || reps.length === 0) {
          repResponse = await fetch(`${SUPABASE_URL}/rest/v1/representatives?user_id=eq.${userId}&select=*`, {
            headers
          });

          if (repResponse.ok) {
            reps = await repResponse.json();
          }
        }

        // Try the view as a final fallback
        if (!reps || reps.length === 0) {
          repResponse = await fetch(`${SUPABASE_URL}/rest/v1/representatives_with_auth?user_id=eq.${userId}&select=*`, {
            headers
          });

          if (repResponse.ok) {
            reps = await repResponse.json();
          }
        }

        representativeData = reps[0] || null;
      } catch (error) {
        representativeData = null;
      }
    }

    this.userProfile = {
      ...userData,
      manager: managerData,
      representative: representativeData,
    };

    return this.userProfile;
  }

  signOut(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    this.userProfile = null;
    localStorage.removeItem('customAuth');
    try { supabase.auth.signOut(); } catch {}
  }

  getCurrentUser() {
    return this.user;
  }

  getUserProfile() {
    return this.userProfile;
  }

  getRole() {
    return this.userProfile?.role || null;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return !!(this.accessToken && this.user && this.userProfile);
  }

  private saveToStorage(): void {
    const data = {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      user: this.user,
      userProfile: this.userProfile
    };
    localStorage.setItem('customAuth', JSON.stringify(data));
  }
}

export const customAuth = new CustomAuth();