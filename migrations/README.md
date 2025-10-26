# GCash Payment Migration Guide

## Quick Start

### Run the Migration Script

```bash
cd D:\brgy_docu_hub\rhai_backend
node migrations/run-migration.js
```

### Options

1. **LOCAL database only** - Migrates your local MySQL database
2. **RAILWAY database only** - Migrates production database
3. **BOTH databases** - Migrates both local and production
4. **Exit** - Cancel migration

## What the Migration Does

### Adds to `document_requests` table:
- `gcash_proof_path` - File path to payment proof
- `gcash_proof_name` - Filename
- `gcash_proof_uploaded_at` - Upload timestamp
- `gcash_verification_status` - Status (pending/verified/rejected)
- `gcash_verified_by` - Admin ID who verified
- `gcash_verified_at` - Verification timestamp
- `gcash_rejection_reason` - Rejection reason
- `gcash_reference_number` - Optional GCash reference

### Adds to `payment_methods` table:
- New payment method: "GCash Manual Upload" (code: GCASH_MANUAL)

### Creates:
- Index on `gcash_verification_status` for performance
- Foreign key constraint on `gcash_verified_by`

## Manual Migration (Alternative)

If you prefer to run the SQL manually:

### For LOCAL Database:

1. Open MySQL Workbench
2. Connect to `barangay_management_system`
3. Open `add_gcash_payment_proof_fields.sql`
4. Execute the SQL

### For RAILWAY Database:

1. Go to https://railway.app
2. Open your MySQL database service
3. Click "Query" tab
4. Copy and paste SQL from `add_gcash_payment_proof_fields.sql`
5. Execute

## Verification

After migration, verify with these queries:

```sql
-- Check columns
DESCRIBE document_requests;
SHOW COLUMNS FROM document_requests LIKE 'gcash%';

-- Check payment method
SELECT * FROM payment_methods WHERE method_code = 'GCASH_MANUAL';
```

You should see:
- 8 new columns starting with `gcash_`
- 1 payment method row with code 'GCASH_MANUAL'

## Rollback

If you need to rollback the migration:

```bash
node migrations/run-migration.js
# Then manually run: rollback_gcash_payment_proof_fields.sql
```

Or manually execute `rollback_gcash_payment_proof_fields.sql` in MySQL.

## Troubleshooting

### Connection Error
- **LOCAL**: Check MySQL is running, verify password
- **RAILWAY**: Check internet connection, verify credentials

### Column Already Exists
- Migration was already run
- Check with verification queries above
- If needed, run rollback first

### Permission Denied
- Ensure user has ALTER TABLE privileges
- For LOCAL: root user should have full privileges
- For RAILWAY: provided credentials have full access

## Database Credentials

### LOCAL
- Host: localhost
- Port: 3306
- User: root
- Database: barangay_management_system
- Password: (you will be prompted)

### RAILWAY
- Host: hopper.proxy.rlwy.net
- Port: 26646
- User: root
- Database: railway
- Password: dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh (hardcoded in script)

## After Migration

1. ✅ Test backend locally
2. ✅ Deploy backend to Railway (if migrated production)
3. ✅ Deploy frontend
4. ✅ Test GCash payment flow end-to-end

## Support

If migration fails:
1. Check error messages in console
2. Verify database connection
3. Check if tables exist
4. Try manual migration as alternative
5. Check logs in Railway dashboard (for production)
