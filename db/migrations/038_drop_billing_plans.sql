-- Billing plans are owned by the Vyntrise Billing microservice.
DROP INDEX IF EXISTS billing_plans_active_sort_idx;
DROP TABLE IF EXISTS billing_plans;
