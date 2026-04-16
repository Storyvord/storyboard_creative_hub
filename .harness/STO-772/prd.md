# PRD: STO-772 — Project Module Frontend

## Problem Statement
The current frontend has a bare dashboard that lists projects and links directly into Creative Hub. There is no project creation flow, no project overview/detail page, no team/member management, no RBAC settings, and no clear visual hierarchy showing Creative Hub as a sub-section of a project. Users cannot create projects from the UI, manage their team, or configure roles and permissions.

## Acceptance Criteria

### Dashboard
- [ ] Dashboard lists all projects with cards (name, description, status badge, member count)
- [ ] "New Project" button opens a multi-step creation modal (not disabled/coming-soon)
- [ ] Theme toggle (Sun/Moon) persists and applies `data-theme` attribute correctly
- [ ] Clicking a project navigates to `/projects/[projectId]/overview`

### Project Layout (Left Sidebar)
- [ ] Persistent left sidebar with collapsible support for all project pages
- [ ] Sidebar shows: Project name at top, then nav sections: Overview, Team, Settings (RBAC), and a "Creative Hub" section with sub-items (Script, Scenes, Characters, Locations, Wardrobe, Storyboarding)
- [ ] Active route is highlighted
- [ ] Breadcrumb shows: Dashboard > [Project Name] > [Section]
- [ ] Back to Dashboard link at bottom of sidebar

### Project Creation Flow (`/dashboard` → modal)
- [ ] Step 1: Project name, brief (textarea), content_type (select: Film, TV, Commercial, etc.)
- [ ] Step 2: Budget (currency + amount), status (select from StatusChoices)
- [ ] On submit: `POST /api/project/v2/projects/` — redirect to new project overview on success
- [ ] Form validation (required fields, budget must be number)
- [ ] Loading state and error handling

### Project Overview Page (`/projects/[projectId]/overview`)
- [ ] Shows: project name, brief, content_type, status badge, budget, created_at
- [ ] Edit button for project owners — opens edit modal (same form, pre-filled, `PUT /api/project/v2/projects/<id>/`)
- [ ] Delete project button (owner only) with confirmation dialog — `DELETE /api/project/v2/projects/<id>/`
- [ ] Members preview (up to 5 avatars) with "View All" → Team page
- [ ] Status badge colors: PLANNING=blue, IN_PROGRESS=yellow, COMPLETED=green, CANCELLED=red, etc.

### Team & Members Page (`/projects/[projectId]/team`)
- [ ] List all crew members: avatar, name, email, role badge
- [ ] Data from `GET /api/project/crew/<project_id>/`
- [ ] Change role dropdown (role owner only): calls `POST /api/project/v2/roles/<project_id>/change_member_role/`
- [ ] Remove member button (owner only): calls `POST /api/project/v2/remove_from_project/`
- [ ] Invite section: pending invites list from `GET /api/project/v2/get_invites/`
- [ ] Send invite form (email + role): `POST /api/project/onboard-requests/send/`

### RBAC Settings Page (`/projects/[projectId]/settings/rbac`)
- [ ] List all roles for the project: `GET /api/project/v2/roles/`
- [ ] Each role card shows name, description, permissions grouped by module, member count
- [ ] "Create Role" button: form (name, description, permissions matrix) → `POST /api/project/v2/roles/`
- [ ] Edit role → `PUT /api/project/v2/roles/<id>/`
- [ ] Permission matrix shows modules (jobs, crew, documents, etc.) with checkboxes for create/read/update/delete
- [ ] Current user's permissions shown via `GET /api/project/v2/user_permissions/<project_id>/`
- [ ] Admin-only actions gated by checking user permissions

### Creative Hub Integration
- [ ] Creative Hub section is visually nested under project in the sidebar (indented sub-items)
- [ ] Breadcrumb: Dashboard > [Project] > Creative Hub > [Section]
- [ ] The existing creative-hub layout is replaced/wrapped by the new project layout
- [ ] All existing creative-hub pages remain functional

### Theme
- [ ] All new pages use CSS custom properties: `var(--background)`, `var(--surface)`, `var(--surface-raised)`, `var(--border)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--accent)`
- [ ] No hardcoded colors except for status badges
- [ ] ThemeContext toggle works across all new pages

## Technical Approach

### File Structure
```
app/
  dashboard/page.tsx                        ← update: add create modal, card click → /overview
  projects/
    [projectId]/
      layout.tsx                            ← NEW: project-level layout with left sidebar
      overview/page.tsx                     ← NEW
      team/page.tsx                         ← NEW
      settings/
        rbac/page.tsx                       ← NEW
      creative-hub/
        layout.tsx                          ← UPDATE: remove standalone sidebar (parent layout handles it)
        ... existing pages unchanged

components/
  project/
    CreateProjectModal.tsx                  ← NEW
    EditProjectModal.tsx                    ← NEW
    ProjectSidebar.tsx                      ← NEW (used by [projectId]/layout.tsx)
    MemberCard.tsx                          ← NEW
    RoleCard.tsx                            ← NEW
    PermissionMatrix.tsx                    ← NEW
    InviteForm.tsx                          ← NEW
    StatusBadge.tsx                         ← NEW

services/
  project.ts                               ← UPDATE: add all missing API calls

types/
  project.ts                               ← UPDATE: extend with full types
```

### Key APIs
- `GET /api/project/v2/projects/` → list
- `POST /api/project/v2/projects/` → create `{ name, brief, additional_details, content_type, budget_currency, budget_amount, status }`
- `GET /api/project/v2/projects/<id>/` → detail
- `PUT /api/project/v2/projects/<id>/` → update
- `DELETE /api/project/v2/projects/<id>/` → delete
- `GET /api/project/crew/<project_id>/` → crew list
- `POST /api/project/v2/remove_from_project/` → remove member `{ project_id, user_id }`
- `GET /api/project/v2/roles/?project_id=<id>` → roles
- `POST /api/project/v2/roles/` → create role
- `PUT /api/project/v2/roles/<id>/` → update role
- `POST /api/project/v2/roles/<project_id>/change_member_role/` → change role
- `GET /api/project/v2/get_invites/?project_id=<id>` → pending invites
- `POST /api/project/onboard-requests/send/` → send invite
- `GET /api/project/v2/permissions/` → all permissions
- `GET /api/project/v2/user_permissions/<project_id>/` → my permissions

### RBAC-Gated UI
- Use `GET /api/project/v2/user_permissions/<project_id>/` on page load
- Store result in a `useProjectPermissions` hook
- Hide/disable: Edit Project, Delete Project, Remove Member, Change Role, Create/Edit Role buttons based on returned permissions

## Edge Cases
- Empty states for all lists
- API errors shown via toast
- Loading spinners on all data fetches
- Unauthenticated redirects (handled by existing interceptor)
- Project not found → 404 message

## Out of Scope
- Equipment management
- Job posting / contracts
- Report generation
- Backend code changes
