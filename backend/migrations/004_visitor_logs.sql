CREATE TABLE IF NOT EXISTS visitor_logs (
    id BIGSERIAL PRIMARY KEY,
    path VARCHAR(255) NOT NULL,
    referrer VARCHAR(500) NOT NULL DEFAULT '',
    ip_hash VARCHAR(64) NOT NULL,
    user_agent TEXT NOT NULL DEFAULT '',
    device_type VARCHAR(20) NOT NULL DEFAULT 'desktop',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at ON visitor_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_path ON visitor_logs (path);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_ip_created ON visitor_logs (created_at, ip_hash);

