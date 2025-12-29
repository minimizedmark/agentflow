/**
 * Admin Authentication Utilities
 *
 * Helpers for checking admin permissions and protecting admin routes
 */

import { createClient } from './supabase/server';

export type UserRole = 'customer' | 'admin' | 'super_admin';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return false;
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return false;
    }

    return (
      userData.is_active &&
      (userData.role === 'admin' || userData.role === 'super_admin')
    );
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get the current admin user
 * Throws error if user is not admin
 */
export async function getAdminUser(): Promise<AdminUser> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, name, role, is_active')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    throw new Error('User not found');
  }

  if (!userData.is_active) {
    throw new Error('User account is inactive');
  }

  if (userData.role !== 'admin' && userData.role !== 'super_admin') {
    throw new Error('Insufficient permissions');
  }

  return userData as AdminUser;
}

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return false;
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return false;
    }

    return userData.is_active && userData.role === 'super_admin';
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
}

/**
 * Require admin authentication
 * Use this in API routes to protect admin endpoints
 */
export async function requireAdmin(): Promise<AdminUser> {
  const adminUser = await getAdminUser();
  return adminUser;
}

/**
 * Require super admin authentication
 */
export async function requireSuperAdmin(): Promise<AdminUser> {
  const adminUser = await getAdminUser();

  if (adminUser.role !== 'super_admin') {
    throw new Error('Super admin access required');
  }

  return adminUser;
}

/**
 * Log admin activity
 */
export async function logAdminActivity(params: {
  action: string;
  targetUserId?: string;
  targetResourceType?: string;
  targetResourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const adminUser = await getAdminUser();
    const supabase = await createClient();

    const { error } = await supabase.rpc('log_admin_activity', {
      p_admin_user_id: adminUser.id,
      p_action: params.action,
      p_target_user_id: params.targetUserId || null,
      p_target_resource_type: params.targetResourceType || null,
      p_target_resource_id: params.targetResourceId || null,
      p_details: params.details || {},
      p_ip_address: params.ipAddress || null,
      p_user_agent: params.userAgent || null,
    });

    if (error) {
      console.error('Failed to log admin activity:', error);
    }
  } catch (error) {
    console.error('Error logging admin activity:', error);
  }
}
