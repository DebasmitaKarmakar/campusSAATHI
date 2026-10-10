# College Saathi

College Saathi is a browser-based campus management and student engagement platform built for National Forensic Sciences University (NFSU), Gandhinagar. It brings together the services students and staff need most in a single digital workspace: notifications, grievance handling, academic resources, attendance, canteen operations, lost-and-found items, and career opportunities.

Designed with a lightweight, low-infrastructure approach, the app runs entirely in the browser and stores data locally on the user's device. This makes it simple to deploy, easy to demo, and ideal for campus kiosks, lab terminals, or internal pilot deployments.

## Why College Saathi?

Campuses often rely on fragmented tools: notice boards in one place, grievance systems elsewhere, canteen orders on WhatsApp or manual registers, and academic resources spread across class groups. College Saathi addresses this fragmentation by creating a unified digital campus hub built around accessibility, transparency, and student convenience.

The platform combines operational utilities with community features so students, faculty, staff, and administrators can all work within the same system without needing a traditional backend or cloud database.

## Key Features

### 1. Notice Board
- Publish official notices for the campus community
- Prioritize announcements as Normal, Important, or Urgent
- Target notices to all users, students only, or faculty only
- Archive outdated notices without deleting them permanently
- Keep campus communication centralized and visible

### 2. Grievance Portal
- Students, faculty, and canteen staff can raise concerns
- Support for a wide range of campus issue categories
- Priority levels from Low to Urgent
- Optional anonymous reporting
- Upvoting to highlight the most widely felt problems
- Status tracking and admin replies for resolution workflows

### 3. Opportunity Window
- Display internships, placements, hackathons, and other opportunities
- Support student-submitted opportunities pending admin review
- Allow admins to approve, reject, or publish opportunities directly
- Flag deadlines and reminder notifications
- Prevent duplicate submissions for similar opportunities

### 4. Academic Resources
- Upload and browse question papers, notes, and academic materials
- Organize resources by year, semester, branch, and subject
- Request peer help or offer tutoring support
- Manage mentorship requests and skill-sharing connections
- Keep academic collaboration within the campus ecosystem

### 5. Attendance Management
- View subject-wise, weekly, monthly, and overall attendance
- Support faculty attendance sessions and class management
- Monitor attendance patterns for better academic planning

### 6. Canteen Ordering and Feedback
- Students can place meal orders during valid time slots
- Manage cart-based meal ordering with live order tracking
- View statuses such as Pending, Served, Cancelled, and Expired
- Canteen staff can manage menu items and order flow
- Collect feedback on food quality, service, hygiene, and pricing

### 7. Lost & Found
- Report lost or found items within campus premises
- Track item ownership claims and recovery processes
- Assist students and staff in asset recovery workflows

### 8. Campus Directory
- Centralize clubs, committees, services, and campus contacts
- Improve visibility into campus organizations and support units
- Give students an easier way to discover campus resources

### 9. MicroHelp
- Provide support for financial, material, or medical aid requests
- Allow community-based assistance for peer support needs
- Support moderation and approval workflows for campus help requests

### 10. Identity and Profile Management
- Maintain user identity profiles for students, faculty, staff, and admins
- Manage personal details, role-based access, and account governance
- Use device trust for simplified login experiences on trusted browsers

## Role-Based Access

College Saathi provides role-specific dashboards so users see the campus tools relevant to their responsibilities.

### Student
Students use College Saathi to stay informed and access day-to-day campus services. They can:
- Read campus notices and track their attendance
- Place canteen orders, follow order status, and submit feedback
- Report lost or found items and raise or upvote grievances
- Browse and submit opportunities, subject to review where required
- Share or request academic resources and peer support
- Browse the campus directory, request or offer MicroHelp, and manage their profile

### Faculty
Faculty members support teaching and campus oversight. They can:
- Publish notices for the campus community
- Manage class attendance and view relevant student attendance information
- Review and approve or reject verification requests and flagged content
- Review student-submitted opportunities
- Moderate MicroHelp requests and oversee relevant directory, lost-and-found, and grievance workflows
- Manage their faculty profile

### Canteen Staff
Canteen staff manage meal-service operations. They can:
- View incoming student orders and update their status
- Open or close ordering for breakfast, lunch, and dinner
- Add, remove, and update the availability of menu items
- Review order and general feedback reports
- Use campus lost-and-found and grievance views relevant to their role

### Administrator
Administrators oversee platform access and campus-wide operations. They can:
- Manage the authorized user list and account status
- Publish and oversee notices
- Configure attendance timetables and review schedule changes
- Review and manage grievances, opportunities, academic resources, and MicroHelp
- Monitor canteen orders and feedback
- Oversee lost-and-found records and campus directory information
- Access administrative governance and audit information

## Architecture and Design

College Saathi is intentionally lightweight:

- Frontend: React + TypeScript + Vite
- Data storage: browser localStorage and sessionStorage
- Persistence model: a local "database service" abstraction ensures state is managed consistently across the app
- Cross-tab sync: a custom DOM event keeps UI state in sync across tabs
- Deployment model: static build output that can be served from GitHub Pages, Netlify, Vercel, or any simple static hosting provider

This design keeps setup cost low and makes it easy to run in demo or pilot environments without server-side infrastructure.

For a feature-by-feature specification of the shared backend database tables,
fields, types, relationships, and file-storage requirements, see
[DATABASE_REQUIREMENTS.md](./DATABASE_REQUIREMENTS.md).

## How It Works

The application stores campus data in the user's browser instead of using a backend database. This keeps the project highly portable, but it also means:

- data is device-specific
- storage is tied to the browser and device used
- clearing browser storage removes saved application data
- cross-device sync requires a backend migration later

The codebase is structured so service-layer calls are centralized, which makes future backend conversion easier if the project needs to scale beyond local-only storage.

## Project Structure

```text
campus-saathi/
├── App.tsx
├── components/
│   ├── admin/
│   ├── attendance/
│   ├── canteen/
│   ├── directory/
│   ├── faculty/
│   ├── grievance/
│   ├── lostfound/
│   ├── microhelp/
│   ├── noticeboard/
│   ├── notifications/
│   ├── opportunity/
│   ├── profile/
│   ├── resources/
│   └── ...
├── hooks/
├── services/
├── src/
├── types.ts
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── README.md
└── ...
```

## Local Development

### Prerequisites
- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Run the app locally

```bash
npm run dev
```

The app will start in Vite development mode and can be opened in the browser at the local development URL displayed in the terminal.

### Build for production

```bash
npm run build
```

This generates a static production build in the `dist/` directory.

### Preview the production build

```bash
npm run preview
```

### Deployment

Because the app is static, it can be deployed to:

- Vercel
- Netlify
- GitHub Pages
- any web server that can serve static files

## Demo / Test Accounts

The app includes seeded demo accounts for testing the platform:

| Email | Role |
| --- | --- |
| ad@gmail.com | Admin |
| fac@gmail.com | Faculty |
| stu@gmail.com | Student |
| ct@gmail.com | Canteen |

When prompted for OTP during sign-in, the development flow can be used with the demo verification code, and the prompt appears in the browser console for easier testing.

## Sample Data

For demonstrations, the app seeds a small set of clearly marked `[DEMO]` records for notices, grievances, opportunities, academic resources, canteen orders and feedback, lost-and-found, MicroHelp, attendance, notifications, and review workflows. Sample student activity is associated with `stu@gmail.com`, while faculty and admin examples use `fac@gmail.com` and `ad@gmail.com`.

Most demo records are seeded once per browser, and only when their corresponding table is empty, so existing records are preserved. The directory separately keeps two fictional contacts labeled as samples alongside user-created entries. The initial canteen menu and campus organization directory also include starter records.

## Authentication Flow

The app uses a whitelist-based authentication model:

1. A user enters their email.
2. The system checks whether the email is authorized.
3. If valid, an OTP is generated for the login process.
4. The user completes verification.
5. A browser session is created for the active tab.
6. Trusted devices can skip repeated OTP checks for a limited period.

This login model is designed to support a campus environment without a dedicated backend auth service.

## Benefits

- Simple deployment and maintenance
- No server or database infrastructure required
- Fast setup for campus pilots and demos
- Unified communication and service management
- Role-based access for realistic campus workflows
- Easy future migration to a backend when cross-device sync is needed

## Notes

This application is intentionally built to prioritize simulation, usability, and rapid campus deployment over production-scale multi-device synchronization. It is a strong fit for demonstrations, internal prototypes, or campus-level use cases where a centralized backend is not yet required.

## License

This project does not currently declare a license in the repository. If you are planning to distribute or reuse it publicly, consider adding an appropriate open-source license.
