# Sparq Connection MVP - Deployment Runbook

## 🚀 Quick Start Commands

### 1. Apply Database Migration
```bash
cd /Users/chrisouimet/Sparq-Aug/sparq
supabase db push
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Verify Migration Applied
```bash
# Check migration status
supabase migration list

# Verify tables exist
supabase db shell
\dt connection_invites
```

### 4. Test the Feature
```bash
# Open browser and navigate to:
open http://localhost:3000/connections
```

## 📁 Files Created/Modified

### Database
- `supabase/migrations/004_connections_invites.sql` - New migration

### API Routes
- `src/app/api/connections/invite/route.ts` - POST invite endpoint
- `src/app/api/connections/accept/route.ts` - POST accept endpoint
- `src/app/api/connections/route.ts` - GET list connections
- `src/app/api/connections/[id]/route.ts` - DELETE connection

### UI Components  
- `src/app/(app)/connections/page.tsx` - Main connections page
- `src/app/accept-connection/page.tsx` - Accept invite page

### Documentation
- `TEST_CONNECTIONS.md` - Complete testing guide
- `RUNBOOK.md` - This deployment runbook

## 🔧 Environment Setup

### Required Environment Variables
Ensure these are set in your `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Database Requirements
- Supabase project with existing tables (profiles, pairs, etc.)
- RLS enabled on all tables
- Auth configured

## 🧪 Testing Commands

### Manual UI Testing
```bash
# 1. Open connections page
open http://localhost:3000/connections

# 2. Test invite flow
# - Enter email and send invite
# - Note the 6-digit code

# 3. Test accept flow (new browser/incognito)
open http://localhost:3000/accept-connection?code=123456

# 4. Verify connection appears in both users' lists
```

### API Testing with cURL
```bash
# First extract session token from browser dev tools

# Send invite
curl -X POST "http://localhost:3000/api/connections/invite" \
  -H "Content-Type: application/json" \
  -H "Cookie: supabase-auth-token=YOUR_TOKEN" \
  -d '{"email": "test@example.com"}'

# Accept invite  
curl -X POST "http://localhost:3000/api/connections/accept" \
  -H "Content-Type: application/json" \
  -H "Cookie: supabase-auth-token=YOUR_TOKEN" \
  -d '{"invite_code": "123456"}'

# List connections
curl -X GET "http://localhost:3000/api/connections" \
  -H "Cookie: supabase-auth-token=YOUR_TOKEN"
```

### Database Verification
```sql
-- Connect to Supabase database
supabase db shell

-- Check invite was created
SELECT * FROM connection_invites WHERE status = 'pending';

-- Check connection was created
SELECT * FROM pairs WHERE status = 'active';

-- Test RLS is working (should only see your own data)
SELECT * FROM user_connections;
```

## 🛡️ Security Verification

### RLS Policy Testing
```sql
-- These queries should only return data for authenticated user
SELECT * FROM connection_invites;
SELECT * FROM pairs;  
SELECT * FROM user_connections;
```

### Input Validation Testing
Test these invalid inputs via UI or API:
- Invalid email formats
- Non-numeric invite codes  
- Expired invite codes
- Self-invitations
- Duplicate invitations

## 🐛 Troubleshooting

### Migration Issues
```bash
# If migration fails, check logs
supabase db push --debug

# Reset migration if needed
supabase migration repair --status reverted

# Check current migration status
supabase migration list
```

### API Issues
```bash
# Check server logs
npm run dev
# Look for console errors in terminal

# Verify auth is working
curl -X GET "http://localhost:3000/api/connections" \
  -H "Cookie: supabase-auth-token=INVALID"
# Should return 401 Unauthorized
```

### UI Issues
- Check browser console for JavaScript errors
- Verify all imports are correct
- Ensure Supabase provider is working
- Check network tab for API call failures

## 📊 Expected Database Schema

After migration, you should have:

### `connection_invites` table:
- `id` (UUID, primary key)
- `inviter_id` (UUID, references profiles.user_id)
- `invitee_email` (TEXT)
- `invite_code` (TEXT, unique 6-digit)
- `status` (pending/accepted/expired/cancelled)
- `expires_at` (TIMESTAMPTZ, 7 days from creation)
- `accepted_at` (TIMESTAMPTZ, nullable)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### `user_connections` view:
- Combines `pairs` and `connection_invites` 
- Shows active connections and pending invites per user
- Respects RLS policies

### New Functions:
- `generate_invite_code()` - Creates unique 6-digit codes
- `expire_old_invites()` - Marks expired invites

## 🚦 Success Criteria Checklist

- [ ] Database migration applies without errors
- [ ] All API endpoints return expected responses
- [ ] UI loads and functions correctly
- [ ] Users can send invites and receive codes
- [ ] Users can accept invites and create connections
- [ ] Connections appear in both users' lists
- [ ] Users can remove connections
- [ ] RLS policies prevent unauthorized access
- [ ] Input validation works for all edge cases
- [ ] Error messages are user-friendly
- [ ] No TypeScript compilation errors

## 🔄 Rollback Plan

If issues occur, rollback with:

```bash
# Revert database migration
supabase migration repair --status reverted

# Or manually drop new objects
supabase db shell
DROP VIEW IF EXISTS user_connections;
DROP TABLE IF EXISTS connection_invites;
DROP FUNCTION IF EXISTS generate_invite_code();
DROP FUNCTION IF EXISTS expire_old_invites();
```

## 📈 Next Steps (Future Enhancements)

1. **Email Integration**: Send actual email invites instead of manual code sharing
2. **Push Notifications**: Notify users of new invites and acceptances  
3. **Invite Links**: Generate shareable URLs for easier acceptance
4. **Connection Requests**: Allow users to request connections without email
5. **Bulk Invites**: Support inviting multiple users at once
6. **Connection Groups**: Support multi-user connections beyond pairs

## 🎯 MVP Scope Reminder

This implementation provides:
✅ Partner invitation via email  
✅ 6-digit invite codes (manual sharing)
✅ Accept/decline invitation flow
✅ Active connections management
✅ Remove connections functionality
✅ Proper RLS and data security
✅ Basic UI for all operations

Not included in MVP:
❌ Automated email sending
❌ Push notifications
❌ Advanced UI polish
❌ Mobile app integration