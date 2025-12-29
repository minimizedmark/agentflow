-- Admin Panel Database Migration
-- Adds admin roles and admin-specific tables

-- Add admin role to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create admin activity log table
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50), -- 'user', 'service', 'promo_code', 'transaction'
    target_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON admin_activity_log(created_at DESC);

-- Create platform statistics table (cached stats for performance)
CREATE TABLE IF NOT EXISTS platform_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stat_date DATE NOT NULL UNIQUE,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    services_enabled INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_platform_stats_date ON platform_stats(stat_date DESC);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = user_id
        AND role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin activity
CREATE OR REPLACE FUNCTION log_admin_activity(
    p_admin_user_id UUID,
    p_action VARCHAR,
    p_target_type VARCHAR DEFAULT NULL,
    p_target_id VARCHAR DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    -- Verify user is admin
    IF NOT is_admin(p_admin_user_id) THEN
        RAISE EXCEPTION 'User is not authorized to perform admin actions';
    END IF;

    INSERT INTO admin_activity_log (
        admin_user_id,
        action,
        target_type,
        target_id,
        details
    ) VALUES (
        p_admin_user_id,
        p_action,
        p_target_type,
        p_target_id,
        p_details
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get platform overview stats
CREATE OR REPLACE FUNCTION get_platform_overview()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_users', (SELECT COUNT(*) FROM users WHERE role = 'user'),
        'total_admins', (SELECT COUNT(*) FROM users WHERE role IN ('admin', 'super_admin')),
        'active_services', (SELECT COUNT(*) FROM services WHERE is_active = true),
        'total_revenue_today', COALESCE((
            SELECT SUM(amount)
            FROM wallet_transactions
            WHERE type = 'topup'
            AND created_at >= CURRENT_DATE
        ), 0),
        'total_revenue_month', COALESCE((
            SELECT SUM(amount)
            FROM wallet_transactions
            WHERE type = 'topup'
            AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0),
        'total_revenue_all_time', COALESCE((
            SELECT SUM(amount)
            FROM wallet_transactions
            WHERE type = 'topup'
        ), 0),
        'transactions_today', (
            SELECT COUNT(*)
            FROM wallet_transactions
            WHERE created_at >= CURRENT_DATE
        ),
        'new_users_today', (
            SELECT COUNT(*)
            FROM users
            WHERE created_at >= CURRENT_DATE
        ),
        'new_users_month', (
            SELECT COUNT(*)
            FROM users
            WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
        ),
        'promo_codes_active', (
            SELECT COUNT(*)
            FROM promo_codes
            WHERE is_active = true
            AND (expires_at IS NULL OR expires_at > NOW())
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_activity(UUID, VARCHAR, VARCHAR, VARCHAR, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_overview() TO authenticated;

-- Add RLS policies for admin tables
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_activity_log_admin_read ON admin_activity_log
    FOR SELECT
    USING (is_admin(auth.uid()));

-- Comments
COMMENT ON TABLE admin_activity_log IS 'Logs all administrative actions for audit trail';
COMMENT ON TABLE platform_stats IS 'Cached platform statistics for performance';
COMMENT ON FUNCTION is_admin(UUID) IS 'Checks if a user has admin privileges';
COMMENT ON FUNCTION log_admin_activity IS 'Logs admin actions with automatic permission check';
COMMENT ON FUNCTION get_platform_overview IS 'Returns key platform metrics for admin dashboard';
