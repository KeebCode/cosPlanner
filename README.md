# CosPlanner

A cosplay project management app for users to track their garments (design), inventory, checklists, and pattern planning.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite |
| Backend | Express.js + Node.js |
| Database | MySQL 8.0 via Drizzle ORM |
| Auth | Firebase Authentication |

---

## Getting Started

### Prerequisites
- Gmail account for user
- Node.js 22+
- MySQL 8.0
- ES Module 6 with Express framework
- Firebase Authentication

## Features

### Projects
- Create and manage cosplay projects
- Each project has measurements, inventory, a checklist, and a garment layout

### Garment Planning
- Drag-and-drop pattern pieces onto a scaled fabric canvas
- Set grain alignment per piece (grainline, cross grain, true bias)
- Auto-optimize layout using bin-packing algorithm
- Export to DXF (CAD format for cutting machines)
- Pan with Alt+drag, zoom with Ctrl+scroll

### Inventory
- Track materials with status: Owned / Need to Buy / Low on Stock
- Color-coded by status
- Quick add from sidebar

### Checklist
- Per-project task lists with categories, due dates, urgency, and flags
- Dashboard view across all projects (Today / Scheduled / Overdue / Completed)
- Auto-generate checklist items from "Need to Buy" inventory

### Profile
- Circular avatar in the header — click to view profile
- Edit display name, bio, and profile picture
- Accessible at `/profile`

---

## API Routes

All routes require `Authorization: Bearer <firebase-token>` header.

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/sync-user` | Sync Firebase user to DB |

### Projects
| Method | Route | Description |
|---|---|---|
| GET | `/api/projects` | Get all projects for user |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project by ID |
| DELETE | `/api/projects/:id` | Delete project |
| PATCH | `/api/projects/:id/description` | Update description |
| PATCH | `/api/projects/:id/measurements` | Save measurements |

### Inventory
| Method | Route | Description |
|---|---|---|
| GET | `/api/projects/:id/inventory` | Get all items |
| POST | `/api/projects/:id/inventory` | Create item |
| PATCH | `/api/inventory/:id` | Update item |
| DELETE | `/api/inventory/:id` | Delete item |

### Checklist
| Method | Route | Description |
|---|---|---|
| GET | `/api/projects/:id/checklist` | Get project checklist |
| POST | `/api/projects/:id/checklist` | Add item |
| PATCH | `/api/checklist/:id` | Update item |
| DELETE | `/api/checklist/:id` | Delete item |
| GET | `/api/projects/:id/checklist/summary` | Per-project counts |
| GET | `/api/checklists/summary` | All-projects counts |
| GET | `/api/checklists/all` | All items for user |
| GET | `/api/checklists/today` | Due today |
| GET | `/api/checklists/scheduled` | Future dated |
| GET | `/api/checklists/completed` | Completed |
| GET | `/api/checklists/overdue` | Overdue |

### Profile
| Method | Route | Description |
|---|---|---|
| GET | `/api/profile` | Get own profile |
| PATCH | `/api/profile` | Update name / bio / picture |

### Garment Planning
| Method | Route | Description |
|---|---|---|
| GET | `/api/garment/layouts/:costumeId` | Get layouts for project |
| POST | `/api/garment/layout` | Create layout |
| PUT | `/api/garment/layout/:id` | Update layout |
| DELETE | `/api/garment/layout/:id` | Delete layout |
| GET | `/api/garment/layout/:id/blocks` | Get pattern blocks |
| POST | `/api/garment/block` | Add pattern block |
| PUT | `/api/garment/block/:id` | Update block |
| DELETE | `/api/garment/block/:id` | Delete block |
| POST | `/api/garment/layout/:id/optimize` | Auto-arrange blocks |
| GET | `/api/garment/layout/:id/export/dxf` | Download DXF file |

---
