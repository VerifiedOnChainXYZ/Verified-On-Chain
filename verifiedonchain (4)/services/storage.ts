import { supabase } from './supabase';
import { UserProfile } from '../types';

export const storageService = {
  // Fetch all profiles from Supabase
  getAllProfiles: async (): Promise<UserProfile[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        // Log explicit error message
        console.error('Supabase Error (getAllProfiles):', error.message, error.details || '');
        return [];
      }
      
      // Map database columns (snake_case) to app types (camelCase)
      return (data || []).map((row: any) => ({
        id: row.id,
        username: row.username,
        address: row.address,
        chain: row.chain,
        createdAt: Number(row.created_at), // Ensure number
        logoUrl: row.logo_url,
        socials: row.socials,
        cachedStats: undefined // Stats are always fetched live
      }));
    } catch (e: any) {
      console.error('Supabase connection exception:', e.message || e);
      return [];
    }
  },

  // Fetch single profile
  getProfileByUsername: async (username: string): Promise<UserProfile | undefined> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', username) // Case-insensitive search
        .single();

      if (error) {
        // PGRST116 means "No rows found", which is expected for new lookups
        if (error.code !== 'PGRST116') {
           console.error('Supabase Error (getProfile):', error.message);
        }
        return undefined;
      }

      if (!data) return undefined;

      return {
        id: data.id,
        username: data.username,
        address: data.address,
        chain: data.chain,
        createdAt: Number(data.created_at),
        logoUrl: data.logo_url,
        socials: data.socials
      };
    } catch (e) {
      console.error(e);
      return undefined;
    }
  },

  // Create new profile
  createProfile: async (profile: Omit<UserProfile, 'id' | 'createdAt'>): Promise<UserProfile> => {
    const newProfile = {
      id: Math.random().toString(36).substr(2, 9), // Or let Supabase handle UUID
      username: profile.username,
      address: profile.address,
      chain: profile.chain,
      created_at: Date.now(),
      logo_url: profile.logoUrl || null,
      socials: profile.socials || {}
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert([newProfile])
      .select()
      .single();

    if (error) {
      console.error("Supabase Create Error:", error.message);
      throw new Error(error.message || 'Failed to create profile');
    }

    return {
      id: data.id,
      username: data.username,
      address: data.address,
      chain: data.chain,
      createdAt: Number(data.created_at),
      logoUrl: data.logo_url,
      socials: data.socials
    };
  }
};