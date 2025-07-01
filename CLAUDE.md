1. First think through the problem, read the codebase for relevant files, and write a plan to todo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the todo.md file with a summary of the changes you made and any other relevant information.

whenever there is soemthign that has to deal directly with databse, always use the mcp sfor supabase as it helps, and you can use it to validate eerything including rsl policies and logs to fix or help debug an issue, then find a solution for.

# 🔧 CRITICAL DEBUGGING RULESET - API Route & RLS Issues

## Problem Pattern: "404 Not Found" on PUT/DELETE operations when GET works
### Symptoms:
- GET requests work fine (200 status)
- PUT/DELETE requests fail with 404 "Not Found" 
- Data exists in database
- Authentication is working
- Error message: "Capability not found" or similar

### Root Cause:
**RLS (Row Level Security) policies blocking ownership verification queries in API routes**

### The Issue:
API routes often verify ownership BEFORE performing operations:
```typescript
// ❌ PROBLEMATIC PATTERN:
const { data: record, error } = await supabase
  .from('table')
  .select('*, related_table(team_id)')  // ← RLS blocks this query
  .eq('id', id)
  .single()

if (!record) return 404  // ← Fails here due to RLS
```

### The Fix:
**Let RLS policies handle access control during the actual operation:**
```typescript
// ✅ CORRECT PATTERN:
const { data: updated, error } = await supabase
  .from('table')
  .update(data)
  .eq('id', id)
  .select()
  .single()

// If RLS blocks access, no rows are returned
if (!updated) return 404
```

### Debugging Steps:
1. **Add debug endpoint** to test GET/PUT/DELETE separately
2. **Check auth context** - log `user.id` in API routes
3. **Use mcp__supabase__execute_sql** to verify data exists
4. **Check RLS policies** with mcp__supabase__get_logs
5. **Simplify verification** - remove pre-checks, let RLS handle access

### Key Learnings:
- **Pre-verification queries can fail due to RLS even when the actual operation would succeed**
- **Always test API endpoints separately** (GET vs PUT vs DELETE)
- **RLS policies should be the primary access control mechanism**
- **Avoid complex ownership verification queries in API routes**

### Prevention:
- Design RLS policies to handle all access scenarios
- Test API routes with actual user sessions, not admin queries
- Use direct operations and let RLS fail gracefully
- Always add comprehensive logging to API routes

# 🔧 CRITICAL DEBUGGING RULESET - Table Reference Issues

## Problem Pattern: "No Workers 0/0" in job creation despite workers having roles
### Symptoms:
- Job creation shows "Role coverage incomplete" with "No Workers 0/0"
- Workers have roles assigned in the database
- Worker role management pages work correctly
- Error message: "Complete role coverage required to create job"

### Root Cause:
**Incorrect table references in scheduling and validation logic**

### The Issue:
Two similar tables serve different purposes:
- `worker_capabilities`: General worker abilities/roles they CAN perform
- `worker_role_assignments`: Specific assignments to particular JOBS

When checking worker availability for job creation, code incorrectly queries `worker_role_assignments` instead of `worker_capabilities`:

```typescript
// ❌ PROBLEMATIC PATTERN (checks job assignments):
const { data: workersWithRole } = await supabase
  .from('worker_role_assignments')  // ← Wrong table!
  .select('worker_id, worker:users(name)')
  .eq('job_role_id', roleId)

// ✅ CORRECT PATTERN (checks worker capabilities):
const { data: workersWithRole } = await supabase
  .from('worker_capabilities')  // ← Correct table!
  .select('worker_id, worker:users(name)')
  .eq('job_role_id', roleId)
  .eq('is_active', true)  // ← Also filter for active capabilities
```

### Files That Needed Fixing:
1. `src/lib/intelligent-scheduling.ts` - validateWorkerRoles() and validateSingleRole()
2. `src/lib/job-validation.ts` - role requirement validation
3. `src/lib/job-recommendations.ts` - training and hiring recommendations
4. `src/lib/worker-availability.ts` - was already correct (uses both appropriately)
5. `src/lib/job-assignment.ts` - was already correct (creates job assignments)

### Key Learnings:
- **worker_capabilities = what workers CAN do (for scheduling)**
- **worker_role_assignments = what workers ARE assigned to do (for specific jobs)**
- **Always use worker_capabilities for availability checking**
- **Always include .eq('is_active', true) when querying capabilities**
- **Job creation logic should never check job assignments for availability**

### Prevention:
- Document table purposes clearly in schema
- Use consistent naming patterns for similar queries
- Add database comments explaining table usage
- Test job creation flow after any role-related changes