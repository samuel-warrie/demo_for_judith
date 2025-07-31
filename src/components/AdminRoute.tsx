import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Checking admin status for user:', user.id);
        console.log('👤 User email:', user.email);
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (error || !profile) {
          console.error('❌ Profile not found or error:', error);
          console.log('🔧 Creating profile for user...');
          
          // Try to create a profile for this user
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              role: 'user'
            })
            .select('role')
            .single();
            
          if (createError) {
            console.error('❌ Failed to create profile:', createError);
            setIsAdmin(false);
          } else {
            console.log('✅ Profile created successfully:', newProfile);
            setIsAdmin(newProfile.role === 'admin');
          }
          setIsAdmin(false);
        } else {
          console.log('✅ Profile found:', profile);
          console.log('👑 User role:', profile.role);
          setIsAdmin(profile.role === 'admin');
        }
      } catch (err) {
        console.error('Admin check failed:', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}