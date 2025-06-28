# 🧪 TEAM-BASED ARCHITECTURE TESTING GUIDE

## 📋 PRE-MIGRATION CHECKLIST

1. **Backup your current database** (recommended)
2. **Ensure you have admin access to Supabase**
3. **Stop the development server** if running

## 🚀 STEP 1: Apply the Migration

### Option A: Using Supabase Dashboard (Recommended)
1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Copy the entire content from `team_migration_complete.sql`
3. Paste it into the SQL Editor
4. Click **"Run"** button
5. Check the output for success messages

### Option B: Using Supabase CLI
```bash
# Make sure you're logged in
npx supabase login

# Apply the migration
npx supabase db push

# If you want to start fresh with new schema
npx supabase db reset
```

### ✅ Migration Success Indicators
- You should see messages like:
  ```
  ============================================================================
  MIGRATION COMPLETED SUCCESSFULLY!
  ============================================================================
  Teams created: 1
  Users migrated: 2
  Jobs migrated: 0
  Clients migrated: 0
  ```

## 🧪 STEP 2: Test the Application

### Start the Development Server
```bash
npm run dev
```

### 1. Test New Business Signup Flow

**Go to:** `http://localhost:3000/auth/signup`

**Test Case 1: Business Owner Signup**
- Business Name: "Test Construction Co"
- Owner Name: "John Doe"
- Email: "john@testconstruction.com"
- Password: "SecurePass123!"

**Expected Result:**
- ✅ User is created and automatically signed in
- ✅ Team is created with the business name
- ✅ User is redirected to dashboard
- ✅ Dashboard shows team name and stats

### 2. Test Dashboard Functionality

**Expected Dashboard Elements:**
- ✅ Team name displayed at top (e.g., "Test Construction Co")
- ✅ Stats cards showing: Total Jobs, Active Jobs, Team Members, Clients
- ✅ Empty state messages for jobs/team members
- ✅ Quick action buttons working

**Test Actions:**
- Click "Create Job" → Should go to `/dashboard/jobs/new`
- Click "Invite Member" → Should go to `/dashboard/team/invite`
- Click "View Schedule" → Should go to `/dashboard/jobs`
- Click "Team Settings" → Should go to `/dashboard/settings`

### 3. Test Team Invitation System

**Go to:** `/dashboard/team/invite`

**Test Case 2: Invite Team Member**
- Email: "worker@testconstruction.com"
- Role: "Worker"
- Name: "Mike Worker"

**Expected Results:**
- ✅ Success message displayed
- ✅ Invitation email logged to console (check terminal)
- ✅ Database has new record in `team_invitations` table

**Test Case 3: Accept Invitation**
- Copy the invitation URL from console logs
- Open in incognito/private browser
- Fill out signup form with name and password
- **Expected:** User is added to team automatically

### 4. Test Jobs Management

**Go to:** `/dashboard/jobs/new`

**Test Case 4: Create Client First**
- You may need to create a client first
- Go to database and manually insert a client:
```sql
INSERT INTO clients (name, email, phone, team_id) 
VALUES ('ABC Company', 'contact@abc.com', '555-0123', 
    (SELECT id FROM teams LIMIT 1));
```

**Test Case 5: Create Job**
- Client: Select the created client
- Title: "Install New Windows"
- Description: "Replace 5 windows on second floor"
- Scheduled Start: Tomorrow at 9 AM
- Quote Amount: 2500

**Expected Results:**
- ✅ Job is created successfully
- ✅ Redirected to jobs list or job detail
- ✅ Job appears in dashboard recent jobs
- ✅ Stats are updated

### 5. Test Real-time Updates

**Test Case 6: Real-time Dashboard**
- Open dashboard in two browser tabs
- In one tab, create a job
- **Expected:** Other tab updates automatically without refresh

### 6. Test Role-Based Permissions

**Test Case 7: Worker Permissions**
- Sign in as the invited worker
- Try to access `/dashboard/jobs/new`
- **Expected:** Should show permission denied or redirect

**Test Case 8: Admin Functions**
- As admin, try to delete a job
- **Expected:** Only admins can delete jobs

## 🔍 STEP 3: Database Verification

### Check Data Integrity
```sql
-- Verify team structure
SELECT t.name, t.owner_id, u.email as owner_email 
FROM teams t 
JOIN users u ON u.id = t.owner_id;

-- Verify all users have teams
SELECT email, name, role, team_id IS NOT NULL as has_team 
FROM users;

-- Verify RLS is working
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('teams', 'users', 'jobs', 'clients', 'team_invitations');
```

## 🐛 TROUBLESHOOTING

### Common Issues & Solutions

**Issue 1: Migration Fails**
```
ERROR: column "team_id" already exists
```
**Solution:** The migration is idempotent, this is safe to ignore.

**Issue 2: Dashboard Shows No Data**
```
Error: Failed to get user profile
```
**Solution:** 
- Check if user has `team_id` set
- Run this SQL: `UPDATE users SET team_id = (SELECT id FROM teams LIMIT 1) WHERE team_id IS NULL;`

**Issue 3: RLS Blocking Queries**
```
Error: new row violates row-level security policy
```
**Solution:**
- Temporarily disable RLS: `ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;`
- Fix the data, then re-enable: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`

**Issue 4: Invitation Links Not Working**
- Check `NEXT_PUBLIC_SITE_URL` environment variable
- Verify token is being generated correctly
- Check invitation hasn't expired

### Debug Commands
```sql
-- Check team structure
SELECT * FROM teams;

-- Check user-team relationships
SELECT u.email, u.name, u.role, t.name as team_name 
FROM users u 
LEFT JOIN teams t ON t.id = u.team_id;

-- Check pending invitations
SELECT * FROM team_invitations WHERE expires_at > NOW();

-- Check jobs with relations
SELECT j.title, j.status, c.name as client, u.name as worker 
FROM jobs j 
LEFT JOIN clients c ON c.id = j.client_id 
LEFT JOIN users u ON u.id = j.assigned_worker_id;
```

## ✅ SUCCESS CRITERIA

Your migration is successful if:

1. **✅ Database Migration**
   - All SQL commands executed without errors
   - New tables created (`teams`, `team_invitations`)
   - Existing tables have new columns (`team_id`, etc.)

2. **✅ Authentication Flow**
   - Business signup creates team + admin user
   - Team member signup via invitations works
   - Users are properly scoped to teams

3. **✅ Dashboard Functionality**
   - Team name displayed correctly
   - Stats show team-scoped data only
   - Real-time updates working

4. **✅ Permissions**
   - Users only see their team's data
   - Role-based access working
   - RLS policies preventing cross-team access

5. **✅ Core Features**
   - Jobs, clients, users CRUD operations working
   - Team invitations functional
   - No data leakage between teams

## 🎯 PERFORMANCE VERIFICATION

Run these queries to verify performance improvements:

```sql
-- Should be fast (single index lookup)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM jobs WHERE team_id = 'your-team-id';

-- Should show index usage
EXPLAIN (ANALYZE, BUFFERS)
SELECT j.*, c.name, u.name 
FROM jobs j 
JOIN clients c ON c.id = j.client_id 
JOIN users u ON u.id = j.assigned_worker_id 
WHERE j.team_id = 'your-team-id';
```

**Expected:** Query plans should show index scans, not full table scans.

## 📞 NEED HELP?

If you encounter issues:
1. Check the console logs in browser dev tools
2. Check the terminal where `npm run dev` is running
3. Verify database schema matches expected structure
4. Test with fresh browser session (clear cookies)
5. Ensure environment variables are set correctly

**You now have a fully functional team-based multi-tenant scheduler system! 🎉** 