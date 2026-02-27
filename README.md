# Employee Management System (Next.js + MongoDB)

Production-ready internal employee management platform with role-based access for `boss`, `manager`, and `employee`.

## Tech Stack

- Next.js (App Router)
- MongoDB + Mongoose
- Tailwind CSS
- JWT (`httpOnly` cookie)
- date-fns (calendar generation)
- Zod (API payload validation)

## Features

### Authentication

- Login with JWT stored in `httpOnly` cookie
- Logout endpoint
- `GET /api/auth/me` for session profile
- No public signup
- Boss creates users

### Role Permissions

- Boss:
  - View all employees
  - View all tasks
  - View analytics (total/completed/pending)
  - Create manager/employee users
  - Add/edit/delete public holidays
  - View holiday calendar
  - View attendance and break records
  - View leave applications
  - Generate monthly attendance reports + CSV export
  - Broadcast message to managers/employees
  - Access notification center
- Manager:
  - Assign tasks to employees
  - View tasks assigned by them
  - View holiday calendar
  - View attendance and break records
  - Approve/reject leave applications
  - Manage leave balance + policy automation (accrual/carry-forward/encashment)
  - Generate monthly attendance reports + CSV export
  - Broadcast message to employees
  - Access notification center
- Employee:
  - View assigned tasks only
  - Update task status
  - View holiday calendar
  - Shift start / shift end attendance
  - Track morning/lunch/afternoon breaks
  - Apply/cancel leaves with balance validation
  - Fixed shift auto-assigned by gender:
    - female: 9:00 AM - 6:00 PM
    - male/other: 10:00 AM - 7:00 PM
  - Access notification center

### Calendar Rules

- Saturday and Sunday auto-detected as holidays (`Date.getDay()`)
- Public holidays fetched from MongoDB
- Weekend cells: `bg-gray-100`
- Public holidays: `bg-red-100 text-red-600`
- Today: `border-2 border-blue-500`
- Click holiday cell to open details modal
- Month navigation + year selector
- Month/year-based holiday fetching

## Folder Structure

```text
employee-management/
|- app/
|  |- api/
|  |  |- auth/
|  |  |  |- login/route.js
|  |  |  |- logout/route.js
|  |  |  `- me/route.js
|  |  |- users/route.js
|  |  |- tasks/
|  |  |  |- route.js
|  |  |  `- [id]/route.js
|  |  `- holidays/
|  |     |- route.js
|  |     `- [id]/route.js
|  |- login/page.js
|  |- boss/
|  |  |- layout.js
|  |  |- dashboard/page.js
|  |  |- users/page.js
|  |  `- holidays/page.js
|  |- manager/
|  |  |- layout.js
|  |  |- dashboard/page.js
|  |  |- assign/page.js
|  |  `- calendar/page.js
|  |- employee/
|  |  |- layout.js
|  |  |- dashboard/page.js
|  |  `- calendar/page.js
|  |- globals.css
|  |- layout.js
|  `- page.js
|- components/
|  |- auth/LoginForm.jsx
|  |- layout/AppShell.jsx
|  |- calendar/HolidayCalendar.jsx
|  |- users/UserManagementPanel.jsx
|  |- holidays/HolidayManagementPanel.jsx
|  `- tasks/
|     |- AssignTaskPanel.jsx
|     `- EmployeeTasksPanel.jsx
|- lib/
|  |- api.js
|  |- auth.js
|  |- constants.js
|  |- date.js
|  |- db.js
|  `- session.js
|- models/
|  |- User.js
|  |- Task.js
|  |- Holiday.js
|  |- Attendance.js
|  |- BreakLog.js
|  |- Leave.js
|  |- LeaveBalance.js
|  |- Notification.js
|  `- AuditLog.js
|- scripts/
|  `- seed.js
|- proxy.js
|- .env.local.example
`- package.json
```

## Database Models

### User

- `name`
- `email` (unique)
- `password` (hashed)
- `role` (`boss | manager | employee`)
- `createdAt`

### Task

- `title`
- `description`
- `assignedTo` (User ref)
- `assignedBy` (User ref)
- `status` (`pending | in-progress | completed`)
- `priority` (`low | medium | high`)
- `taskDate`
- `createdAt`

### Holiday

- `title`
- `date`
- `description` (optional)
- `createdBy` (User ref)
- `createdAt`

## API Routes

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Users

- `POST /api/users` (boss only)
- `GET /api/users` (boss only)

### Tasks

- `POST /api/tasks` (manager only)
- `GET /api/tasks` (role-based filtering)
- `PATCH /api/tasks/:id` (employee updates status)

### Holidays

- `POST /api/holidays` (boss only)
- `GET /api/holidays` (all authenticated roles)
- `PATCH /api/holidays/:id` (boss only)
- `DELETE /api/holidays/:id` (boss only)

### Attendance / Breaks

- `GET /api/attendance`
- `POST /api/attendance/check-in` (employee, backward compatibility)
- `POST /api/attendance/check-out` (employee, backward compatibility)
- `POST /api/attendance/shift-start` (employee, preferred)
- `POST /api/attendance/shift-end` (employee, preferred)
- `GET /api/breaks`
- `POST /api/breaks/start` (employee)
- `POST /api/breaks/end` (employee)

### Leaves

- `GET /api/leaves`
- `POST /api/leaves` (employee)
- `PATCH /api/leaves/:id` (employee cancel, manager approve-reject)
- `GET /api/leaves/balance`
- `PATCH /api/leaves/balance` (manager)
- `POST /api/leaves/policy` (manager)
- `POST /api/leaves/encash` (manager)

### Notifications

- `GET /api/notifications`
- `PATCH /api/notifications/:id`
- `POST /api/notifications/read-all`
- `POST /api/notifications/broadcast` (boss/manager)

### Reports

- `GET /api/reports/attendance`
- `GET /api/reports/attendance/export` (CSV)

## Middleware Protection

`proxy.js` protects:

- Role pages: `/boss/*`, `/manager/*`, `/employee/*`
- Role APIs: `/api/users/*`, `/api/tasks/*`, `/api/holidays/*`, `/api/attendance/*`, `/api/breaks/*`, `/api/leaves/*`, `/api/notifications/*`, `/api/reports/*`, `/api/auth/me`
- Redirects authenticated users away from `/login`
- Enforces CSRF token checks on authenticated mutating API calls

## Security Hardening

- CSRF protection using double-submit token:
  - cookie: `csrf_token`
  - header: `x-csrf-token`
- Rate limiting on sensitive write/auth endpoints
- Standard security response headers via Next config:
  - `Content-Security-Policy`
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
- Audit log persistence for key actions (task/holiday/attendance/break/leave/user mutations)

## Pagination

List APIs now support:

- `?page=<number>`
- `?limit=<number>`

Included in responses:

- `pagination.page`
- `pagination.limit`
- `pagination.total`
- `pagination.totalPages`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` using `.env.local.example` as template.

3. Update `.env.local` values:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/employee_management
JWT_SECRET=replace-with-a-long-random-secret
SEED_DEFAULT_PASSWORD=replace-with-a-strong-password
SEED_ALLOW_RESET=false
EMAIL_FROM=no-reply@company.local
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
LEAVE_CASUAL_DAYS=12
LEAVE_SICK_DAYS=8
LEAVE_PAID_DAYS=15
LEAVE_UNPAID_DAYS=365
LEAVE_ACCRUAL_CASUAL_MONTHLY=1
LEAVE_ACCRUAL_SICK_MONTHLY=0.6
LEAVE_ACCRUAL_PAID_MONTHLY=1.25
LEAVE_CARRY_FORWARD_MAX_PAID=10
SHIFT_LATE_GRACE_MINUTES=10
SHIFT_HALF_DAY_MINUTES=240
```

4. Seed default users + holidays:

```bash
SEED_ALLOW_RESET=true npm run seed
```

or set `SEED_ALLOW_RESET=true` in `.env.local` and run:

```bash
npm run seed
```

5. Start development server:

```bash
npm run dev
```

6. Open `http://localhost:3000/login`

## Seed Output

`npm run seed` creates:

- 1 boss (`boss@company.local`)
- 1 manager (`manager@company.local`)
- 10 employees (`employee01..employee10@company.local`)
- 5 default Indian public holidays

Default password is from `SEED_DEFAULT_PASSWORD`.

## Notes

- Saturdays and Sundays are never stored in DB.
- Only public holidays are persisted in MongoDB.
- Calendar data auto-refreshes by selected month/year.
