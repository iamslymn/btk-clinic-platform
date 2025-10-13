// Data Access Configuration
// Single place to configure which backend provider to use

import type { DataAccessProvider } from './interfaces';
import { supabaseDataAccess } from './supabase-provider';

// Environment-based configuration
const DATA_ACCESS_PROVIDER = import.meta.env.VITE_DATA_PROVIDER || 'supabase';

// Provider registry - easily add new backends here
const providers: Record<string, DataAccessProvider> = {
  supabase: supabaseDataAccess,
  // Future backends can be added here:
  // graphql: graphqlDataAccess,
  // rest: restApiDataAccess,
  // postgres: postgresDataAccess,
};

// Get the current data access provider
export function getDataAccessProvider(): DataAccessProvider {
  const provider = providers[DATA_ACCESS_PROVIDER];
  
  if (!provider) {
    throw new Error(`Unknown data access provider: ${DATA_ACCESS_PROVIDER}`);
  }
  
  return provider;
}

// For testing or manual override
export function setDataAccessProvider(providerName: string): void {
  if (!providers[providerName]) {
    throw new Error(`Provider ${providerName} not registered`);
  }
  // In a real app, you'd update a global config here
  console.log(`Data provider switched to: ${providerName}`);
}

// Export current provider as default
export const dataAccess = getDataAccessProvider();
