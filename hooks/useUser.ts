"use client";

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { User } from '@/lib/types';
import { getCurrentUser } from '@/lib/api';

export function useUser() {
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      if (!firebaseUser) {
        setUserData(null);
        setLoading(false);
        return;
      }
      try {
        const token = await firebaseUser.getIdToken();
        const profile = await getCurrentUser(token);
        setUserData(profile);
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchUser();
    }
  }, [firebaseUser, authLoading]);

  return { user: userData, loading: authLoading || loading };
}
