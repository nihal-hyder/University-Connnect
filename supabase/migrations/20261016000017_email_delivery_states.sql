-- =============================================================================
-- 0017 EMAIL DELIVERY STATES
-- Statuses reported by the email provider's webhooks after a message was
-- accepted ("sent"). Kept in its own migration: new enum values cannot be used
-- in the same transaction that adds them.
-- =============================================================================

alter type public.email_status add value if not exists 'delivered';
alter type public.email_status add value if not exists 'bounced';
alter type public.email_status add value if not exists 'complained';
