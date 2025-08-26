# Sparq Connection MVP Testing Guide

## Prerequisites
1. Database migration applied: `004_connections_invites.sql`
2. Dev server running: `npm run dev`
3. Two test user accounts (or create them during testing)
4. Supabase project configured with environment variables

## Manual Testing Steps

### 1. Setup Test Users
Create two test users if you don't have them:
- User A: `userA@test.com`
- User B: `userB@test.com`

### 2. Test Invite Flow (User A invites User B)

#### Step 2.1: Login as User A
1. Navigate to `http://localhost:3000/auth`
2. Login as User A
3. Navigate to `http://localhost:3000/connections`

#### Step 2.2: Send Invite
1. Enter User B's email in the invite form
2. Click "Send Invite"
3. **Expected:** Success message with 6-digit invite code
4. **Verify:** Invite appears in "Pending Invites" section

#### Step 2.3: Test Invite Validation
Try these invalid cases:
- Empty email → Should show validation error
- Invalid email format → Should show validation error  
- Your own email → Should show "Cannot invite yourself"
- Duplicate invite → Should cancel old invite and create new one

### 3. Test Accept Flow (User B accepts invite)

#### Step 3.1: Login as User B
1. Open new incognito/private window
2. Navigate to `http://localhost:3000/auth`
3. Login as User B

#### Step 3.2: Accept Invite via URL
1. Navigate to `http://localhost:3000/accept-connection?code=XXXXXX` (use code from step 2.2)
2. **Expected:** Auto-accept and success message
3. **Expected:** Auto-redirect to connections page after 3 seconds

#### Step 3.3: Manual Code Entry
1. Navigate to `http://localhost:3000/accept-connection`
2. Enter the 6-digit code manually
3. Click "Accept Invite"
4. **Expected:** Success message and connection created

#### Step 3.4: Test Accept Validation
Try these invalid cases:
- Invalid code format → Should show validation error
- Expired code → Should show "expired" error
- Non-existent code → Should show "invalid" error

### 4. Test Connections List

#### Step 4.1: Verify User A's View
1. As User A, navigate to `/connections`
2. **Expected:** User B appears in "Active Connections"
3. **Expected:** No more pending invite for User B

#### Step 4.2: Verify User B's View
1. As User B, navigate to `/connections`
2. **Expected:** User A appears in "Active Connections"
3. **Expected:** Connection shows correct email/name and date

### 5. Test Remove Connection

#### Step 5.1: Remove Active Connection
1. As either user, click "Remove" on active connection
2. Confirm deletion in browser dialog
3. **Expected:** Connection removed from both users' lists
4. **Expected:** Pair status updated to 'ended' in database

#### Step 5.2: Cancel Pending Invite
1. As User A, send new invite to User C
2. Before User C accepts, click "Cancel" on pending invite
3. **Expected:** Invite disappears from pending list
4. **Expected:** User C cannot accept the cancelled code

### 6. Test Edge Cases

#### Step 6.1: Duplicate Connection
1. After users are connected, try sending another invite
2. **Expected:** Should show "Already connected" error

#### Step 6.2: Expired Invites
1. Create invite, wait 7 days (or modify expires_at in DB for testing)
2. Try to accept expired invite
3. **Expected:** "Invite code has expired" error

#### Step 6.3: RLS Verification
1. Try to access another user's invites via direct DB query
2. **Expected:** RLS should prevent unauthorized access

## API Testing with cURL

### Get User Session Token
First, login via the UI and extract the session token from browser dev tools (Application > Cookies > supabase-auth-token)

```bash
# Set your session token
export SESSION_TOKEN="your-session-token-here"
export API_BASE="http://localhost:3000"
```

### 1. Send Invite
```bash
curl -X POST "$API_BASE/api/connections/invite" \
  -H "Content-Type: application/json" \
  -H "Cookie: supabase-auth-token=$SESSION_TOKEN" \
  -d '{"email": "test@example.com"}'
```

**Expected Response:**
```json
{
  "message": "Invite created successfully",
  "invite": {
    "id": "uuid",
    "invitee_email": "test@example.com", 
    "invite_code": "123456",
    "expires_at": "2024-01-15T...",
    "created_at": "2024-01-08T..."
  },
  "instructions": "Share this invite code with test@example.com: 123456"
}
```

### 2. Accept Invite
```bash
curl -X POST "$API_BASE/api/connections/accept" \
  -H "Content-Type: application/json" \
  -H "Cookie: supabase-auth-token=$SESSION_TOKEN" \
  -d '{"invite_code": "123456"}'
```

**Expected Response:**
```json
{
  "message": "Connection accepted successfully",
  "connection": {
    "id": "uuid",
    "partner_email": "inviter@example.com",
    "partner_name": "Inviter Name",
    "connected_at": "2024-01-08T...",
    "status": "active"
  }
}
```

### 3. List Connections
```bash
curl -X GET "$API_BASE/api/connections" \
  -H "Cookie: supabase-auth-token=$SESSION_TOKEN"
```

**Expected Response:**
```json
{
  "active_connections": [
    {
      "id": "uuid",
      "partner_id": "uuid",
      "partner_email": "partner@example.com",
      "partner_name": "Partner Name",
      "status": "active",
      "connected_at": "2024-01-08T...",
      "connection_type": "active"
    }
  ],
  "outgoing_invites": [],
  "incoming_invites": []
}
```

### 4. Remove Connection
```bash
# Remove active connection
curl -X DELETE "$API_BASE/api/connections/CONNECTION_ID?type=pair" \
  -H "Cookie: supabase-auth-token=$SESSION_TOKEN"

# Cancel pending invite  
curl -X DELETE "$API_BASE/api/connections/INVITE_ID?type=invite" \
  -H "Cookie: supabase-auth-token=$SESSION_TOKEN"
```

**Expected Response:**
```json
{
  "message": "Connection ended successfully"
}
```

## Error Cases to Test

### 1. Authentication Errors
```bash
# Test without session token
curl -X GET "$API_BASE/api/connections"
# Expected: 401 Unauthorized
```

### 2. Validation Errors
```bash
# Invalid email format
curl -X POST "$API_BASE/api/connections/invite" \
  -H "Content-Type: application/json" \
  -H "Cookie: supabase-auth-token=$SESSION_TOKEN" \
  -d '{"email": "invalid-email"}'
# Expected: 400 Bad Request

# Invalid invite code
curl -X POST "$API_BASE/api/connections/accept" \
  -H "Content-Type: application/json" \
  -H "Cookie: supabase-auth-token=$SESSION_TOKEN" \
  -d '{"invite_code": "invalid"}'  
# Expected: 400 Bad Request
```

### 3. Business Logic Errors
```bash
# Self-invite
curl -X POST "$API_BASE/api/connections/invite" \
  -H "Content-Type: application/json" \
  -H "Cookie: supabase-auth-token=$SESSION_TOKEN" \
  -d '{"email": "your-own-email@example.com"}'
# Expected: 400 "Cannot invite yourself"

# Non-existent invite code
curl -X POST "$API_BASE/api/connections/accept" \
  -H "Content-Type: application/json" \
  -H "Cookie: supabase-auth-token=$SESSION_TOKEN" \
  -d '{"invite_code": "999999"}'
# Expected: 404 "Invalid or expired invite code"
```

## Database Verification Queries

### Check RLS is Working
```sql
-- This should only show your own invites
SELECT * FROM connection_invites;

-- This should only show connections you're part of  
SELECT * FROM pairs;

-- This view should only show your connections
SELECT * FROM user_connections;
```

### Check Data Integrity
```sql
-- Verify invite codes are unique
SELECT invite_code, COUNT(*) 
FROM connection_invites 
WHERE status = 'pending' AND expires_at > NOW()
GROUP BY invite_code 
HAVING COUNT(*) > 1;
-- Expected: No results

-- Verify no duplicate active pairs
SELECT user_a, user_b, COUNT(*)
FROM pairs 
WHERE status = 'active'
GROUP BY user_a, user_b
HAVING COUNT(*) > 1;
-- Expected: No results
```

## Success Criteria
- [ ] User A can invite User B via email
- [ ] User B receives invite code and can accept  
- [ ] Both users see the connection in their connections list
- [ ] Either user can remove the connection
- [ ] All API endpoints return correct responses
- [ ] RLS policies prevent unauthorized access
- [ ] Input validation works correctly
- [ ] Edge cases are handled gracefully
- [ ] UI shows appropriate loading, success, and error states