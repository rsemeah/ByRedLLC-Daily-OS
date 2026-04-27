# ByRed OS — Claude Code Master Build Prompt
**Version:** 1.0  
**Date:** 2026-04-23  
**Stack:** Next.js 14 (App Router) · Tailwind CSS · Lucide-React · TypeScript

---

## MASTER PROMPT — PASTE THIS IN FULL

```
You are building the ByRed OS Team Dashboard — a multi-tenant task management interface. 
Execute with pixel-perfect precision. Zero deviation from the spec. No creative liberties. 
No placeholder colors. No component libraries except Lucide-React. Tailwind only.

---

## ARCHITECT PROFILE (NON-NEGOTIABLE)
- Stack: Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide-React
- No Shadcn. No Radix. No MUI. No external UI libraries.
- Single-responsibility components. Every component in its own file.
- All data consumed as JSON props — no hardcoded content inside components.
- Every component must handle: loading state, empty state, error state.
- Zero gradients. Zero shadows except 1px borders. Zero decorative elements.

---

## BRAND TOKENS (HARDCODE THESE EXACTLY — NO APPROXIMATIONS)

```ts
// lib/tokens.ts
export const tokens = {
  // Backgrounds
  bgBase: '#f7f7f7',       // Page canvas
  bgSurface: '#ffffff',    // Cards, rows, panels
  bgSidebar: '#ffffff',    // Sidebar background
  bgHover: '#fafafa',      // Row/nav hover state
  bgActiveNav: '#fff8f8',  // Active nav item background

  // Brand
  red: '#CC0000',          // PRIMARY ACCENT — CTA, active states, overdue, urgent
  redLight: '#fde8e8',     // Red tint backgrounds
  redBorder: '#f5c0c0',    // Red tint borders
  redSubtle: '#fff8f8',    // Chip/filter active bg

  // Text
  textPrimary: '#000000',   // Headings, task titles, nav active
  textSecondary: '#111111', // Body content
  textMuted: '#aaaaaa',     // Nav inactive, meta labels
  textFaint: '#cccccc',     // Timestamps, estimates, placeholders
  textPlaceholder: '#cccccc',

  // Borders & Dividers
  borderDefault: '#e8e8e8', // All card/row borders
  borderSubtle: '#ebebeb',  // Between rows
  borderStrong: '#dddddd',  // Hover borders

  // Status — Done
  doneText: '#2a7a3a',
  doneBg: '#f0faf4',
  doneBorder: '#c8e6d0',

  // Status — In Progress
  progressText: '#CC0000',
  progressBg: '#fff8f8',
  progressBorder: '#f5c0c0',

  // Status — Blocked
  blockedText: '#ffffff',
  blockedBg: '#CC0000',
  blockedBorder: '#CC0000',

  // Status — Not Started
  notStartedText: '#bbbbbb',
  notStartedBg: '#f7f7f7',
  notStartedBorder: '#e8e8e8',

  // Tenant chips
  hireWireText: '#3355bb',
  hireWireBg: '#f0f4ff',
  hireWireBorder: '#d0d8f5',

  paradiseText: '#2a7a3a',
  paradiseBg: '#f0faf4',
  paradiseBorder: '#c8e6d0',

  hadithText: '#aa5500',
  hadithBg: '#fff8f0',
  hadithBorder: '#f0d5b0',
}
```

---

## LAYOUT STRUCTURE

```
RootLayout
└── AppShell                          // flex row, h-screen, overflow-hidden
    ├── Sidebar                       // w-[210px] min-w-[210px], bg-white, border-r
    └── MainContent                   // flex-1 min-w-0, bg-[#f7f7f7], flex col
        ├── TopBar                    // h-[60px], bg-white, border-b
        ├── TabBar                    // h-[44px], bg-white, border-b
        ├── FilterBar                 // h-[50px], bg-white, border-b
        ├── TaskTable                 // flex-1, overflow-y-auto, px-6 py-3.5
        │   ├── TableHeader           // sticky top-0
        │   └── TaskRow[]             // one per task
        └── StatusFooter              // h-[52px], bg-white, border-t
```

---

## COMPONENT SPECS — BUILD EXACTLY AS WRITTEN

---

### 1. Sidebar — `components/Sidebar.tsx`

**Dimensions:** width 210px, fixed, full height, white background, 1px right border #e8e8e8

**Logo area:**
- Height: 60px
- Padding: 0 18px
- Bottom border: 1px solid #e8e8e8
- Logo element: `<span>` with background #CC0000, text "BY RED", color white, font-weight 800, font-size 13px, letter-spacing 2px, padding 6px 11px, border-radius 2px

**Section labels (WORK / TENANTS / SYSTEM):**
- Font-size: 9px
- Font-weight: 700
- Letter-spacing: 2px
- Color: #bbbbbb
- Text-transform: uppercase
- Padding: 16px 18px 5px

**Nav items:**
- Height: 34px
- Padding: 0 18px
- Font-size: 12px
- Default color: #aaaaaa
- Hover: color #333333, background #fafafa
- Active: color #000000, font-weight 600, background #fff8f8, border-left 2px solid #CC0000
- No icons — text only

**Tenant rows:**
- Height: 32px
- Padding: 0 18px
- Display: flex, align-items center, gap 8px
- Colored dot: 7px × 7px circle, color unique per tenant (HireWire: #CC0000, Paradise: #2a7a3a, Hadith: #aa5500)
- Tenant name: flex-1, font-size 11px, overflow hidden, text-ellipsis
- Count badge: font-size 9px, font-weight 700, padding 2px 6px, border-radius 2px
  - Default: background #f0f0f0, color #aaaaaa
  - Active: background #fde8e8, color #CC0000
- Active row: color #000000, font-weight 600, border-left 2px solid #CC0000

**Footer (pinned to bottom):**
- margin-top: auto
- Padding: 14px 18px
- Border-top: 1px solid #e8e8e8
- Avatar: 28px circle, background #CC0000, text white, font-size 10px, font-weight 700
- Name: font-size 11px, font-weight 600, color #111
- Role: font-size 9px, color #aaaaaa, uppercase, letter-spacing 0.5px

---

### 2. TopBar — `components/TopBar.tsx`

**Dimensions:** height 60px, full width, white background, border-bottom 1px #e8e8e8, padding 0 24px

**Left:**
- Page title: font-size 15px, font-weight 700, color #000000, letter-spacing -0.3px
- Subtitle: font-size 10px, color #bbbbbb, margin-top 2px

**Right (flex row, gap 10px):**
- Icon buttons: 30×30px, background #f7f7f7, border 1px #e8e8e8, border-radius 2px, Lucide icons (Bell, Settings) at 14px, color #bbbbbb
- Create Task button: height 32px, padding 0 16px, background #CC0000, color white, font-size 11px, font-weight 700, letter-spacing 0.5px, border-radius 2px, border none. Hover: background #aa0000. Label: "+ Create Task"

---

### 3. TabBar — `components/TabBar.tsx`

**Dimensions:** height 44px, white background, border-bottom 1px #e8e8e8, padding 0 24px, display flex, align-items flex-end, gap 0

**Tab item:**
- Height: 44px
- Padding: 0 14px
- Display: flex, align-items center, gap 6px
- Font-size: 11px
- Default: color #bbbbbb, border-bottom 2px solid transparent
- Hover: color #555555
- Active: color #000000, font-weight 600, border-bottom 2px solid #CC0000

**Count badge inside tab:**
- Font-size: 9px, font-weight 700, padding 2px 6px, border-radius 2px, line-height 1
- Default: background #f0f0f0, color #bbbbbb
- Active tab badge: background #fde8e8, color #CC0000

**Tabs in order:** "All Boards" (212), "Authentic Hadith" (28), "Paradise Property" (88), "HireWire" (96)

---

### 4. FilterBar — `components/FilterBar.tsx`

**Dimensions:** height 50px, white background, border-bottom 1px #e8e8e8, padding 0 24px, display flex, align-items center, gap 7px

**Search input:**
- Width: 180px, height 32px, flex-shrink 0
- Background: #f7f7f7, border: 1px solid #e8e8e8, border-radius 2px
- Padding: 0 12px, display flex, align-items center, gap 7px
- Lucide Search icon: 14px, color #cccccc
- Input: background none, no border, no outline, font-size 11px, color #000, placeholder color #cccccc

**Filter chips:**
- Height: 28px, padding 0 11px
- Display: flex, align-items center
- Font-size: 10px, font-weight 600
- Border-radius: 2px
- Default: background white, border 1px #e8e8e8, color #aaaaaa
- Hover: border-color #cccccc, color #555555
- Alert state (Overdue, Blocked): background #fff8f8, border 1px #f5c0c0, color #CC0000

**Chips in order:** My Tasks | Overdue (alert) | This Week | Blocked (alert) | Not Started

**Right end:** "More filters ▾" — font-size 10px, color #bbbbbb, margin-left auto

---

### 5. TaskTable — `components/TaskTable.tsx`

**Wrapper:** flex-1, overflow-y-auto, padding 14px 24px, display flex, flex-direction column, gap 2px, background #f7f7f7

**COLUMN GRID (apply to BOTH header and every row — must match exactly):**
```
grid-template-columns: 110px minmax(0, 1fr) 120px 60px 36px 44px 88px 72px 24px
```
Columns: Status | Title | Tenant | Due | Pri | Est | Owner | Mode | Menu

**Table Header row:**
- Height: 32px, padding 0 14px, transparent background
- Font-size: 9px, font-weight 700, color #cccccc, uppercase, letter-spacing 1px
- Pri column: text-align center
- Est column: text-align right, padding-right 6px

**Task Row:**
- Height: 46px
- Padding: 0 14px
- Background: white
- Border: 1px solid #ebebeb
- Border-radius: 3px
- Hover: border-color #dddddd
- Urgent rows (overdue/in-progress+overdue): border-left 3px solid #CC0000, padding-left 11px

**Cell alignment rules — NO EXCEPTIONS:**
- Status cell: `display flex; align-items center`
- Title cell: `display flex; align-items center; padding-right 8px; min-width 0`
- Tenant cell: `display flex; align-items center`
- Due cell: `display flex; align-items center`
- Pri cell: `display flex; align-items center; justify-content center`
- Est cell: `display flex; align-items center; justify-content flex-end; padding-right 6px`
- Owner cell: `display flex; align-items center; gap 5px`
- Mode cell: `display flex; align-items center`
- Menu cell: `display flex; align-items center; justify-content center`

---

### 6. Status Pills — `components/StatusPill.tsx`

**Base:** display inline-flex, align-items center, gap 4px, padding 0 8px, height 22px, border-radius 2px, font-size 9px, font-weight 700, letter-spacing 0.3px, white-space nowrap

**Done:** bg #f0faf4, color #2a7a3a, border 1px #c8e6d0, icon: Lucide Check 10px
**In Progress:** bg #fff8f8, color #CC0000, border 1px #f5c0c0, icon: Lucide RefreshCw 10px
**Blocked:** bg #CC0000, color white, no border, icon: Lucide Ban 10px
**Not Started:** bg #f7f7f7, color #bbbbbb, border 1px #e8e8e8, icon: Lucide Circle 10px

---

### 7. Task Title — inside TaskTable

- Font-size: 12px
- Color: #111111 (active tasks)
- Color: #bbbbbb + text-decoration line-through + text-decoration-color #dddddd (Done tasks)
- white-space: nowrap
- overflow: hidden
- text-overflow: ellipsis
- width: 100%

---

### 8. Tenant Chip — `components/TenantChip.tsx`

**Base:** display inline-flex, align-items center, height 20px, padding 0 8px, border-radius 2px, font-size 9px, font-weight 600, white-space nowrap, max-width 116px, overflow hidden

**HireWire:** bg #f0f4ff, color #3355bb, border 1px #d0d8f5
**Paradise Property:** bg #f0faf4, color #2a7a3a, border 1px #c8e6d0
**Authentic Hadith:** bg #fff8f0, color #aa5500, border 1px #f0d5b0

---

### 9. Due Date cell

- Default: font-size 10px, color #bbbbbb
- Overdue (past today): font-size 10px, font-weight 700, color #CC0000
- Due within 48h: font-size 10px, font-weight 600, color #cc7700
- Empty: render "—", color #cccccc

---

### 10. Priority Dot

- Size: 8px × 8px, border-radius 50%
- High: background #CC0000
- Medium: background #dddddd
- Low: background #eeeeee
- No text — dot only

---

### 11. Est column

- Font-size: 10px, color #cccccc, right-aligned

---

### 12. Owner cell

- Avatar: 22×22px circle, border-radius 50%
  - Has owner: bg #fde8e8, border 1px #f5c0c0, color #CC0000, font-size 8px, font-weight 700 (initials)
  - No owner: bg #f0f0f0, border 1px #e8e8e8, color #999999, render "—"
- Name: font-size 10px, color #bbbbbb, white-space nowrap, overflow hidden, text-overflow ellipsis

---

### 13. Mode tag — `components/ModeTag.tsx`

- Base: display inline-flex, height 20px, padding 0 7px, align-items center, border-radius 2px, font-size 9px, font-weight 600, white-space nowrap
- Human: bg #f7f7f7, color #cccccc, border 1px #e8e8e8
- AI: bg #f0f4ff, color #3355bb, border 1px #d0d8f5

---

### 14. StatusFooter — `components/StatusFooter.tsx`

**Dimensions:** height 52px, white background, border-top 1px #e8e8e8, padding 0 24px, display flex, align-items center, gap 0

**Stat block:**
- Value: font-size 18px, font-weight 700, line-height 1
  - Default: color #000000
  - Overdue: color #CC0000
  - Done: color #2a7a3a
- Label: font-size 9px, color #bbbbbb, uppercase, letter-spacing 0.8px, margin-top 3px
- Each stat: padding 0 20px, first-child padding-left 0

**Dividers between stats:** 1px wide, height 30px, background #e8e8e8

**Stats in order:** Total Tasks | Overdue | In Progress | Done | Not Started

---

## DATA TYPES

```ts
// types/index.ts

export type TaskStatus = 'done' | 'in_progress' | 'blocked' | 'not_started'
export type Priority = 'high' | 'medium' | 'low'
export type Mode = 'human' | 'ai'
export type TenantId = 'hirewire' | 'paradise_property' | 'authentic_hadith'

export interface Owner {
  id: string
  initials: string
  name: string
}

export interface Task {
  id: string
  title: string
  status: TaskStatus
  tenantId: TenantId
  dueDate: string | null      // ISO date string or null
  priority: Priority
  estimateMinutes: number | null
  owner: Owner | null
  mode: Mode
  isUrgent: boolean           // true if overdue or flagged
}

export interface Tenant {
  id: TenantId
  name: string
  dotColor: string
  taskCount: number
}

export interface DashboardStats {
  total: number
  overdue: number
  inProgress: number
  done: number
  notStarted: number
}
```

---

## ROUTING

```
app/
├── layout.tsx              // AppShell wrapping all pages
├── page.tsx                // Redirect to /tasks
├── tasks/
│   └── page.tsx            // TaskTable page
├── command-center/
│   └── page.tsx            // KPI dashboard (Phase 2)
├── today/
│   └── page.tsx            // Today view (Phase 2)
└── leads/
    └── page.tsx            // Leads view (Phase 2)
```

---

## BUILD ORDER — EXECUTE IN THIS SEQUENCE

1. `lib/tokens.ts` — brand token constants
2. `types/index.ts` — all TypeScript interfaces
3. `lib/mock-data.ts` — 10 mock tasks matching the exact data structure
4. `components/StatusPill.tsx`
5. `components/TenantChip.tsx`
6. `components/ModeTag.tsx`
7. `components/Sidebar.tsx`
8. `components/TopBar.tsx`
9. `components/TabBar.tsx`
10. `components/FilterBar.tsx`
11. `components/TaskTable.tsx` (imports StatusPill, TenantChip, ModeTag)
12. `components/StatusFooter.tsx`
13. `app/layout.tsx` (AppShell with Sidebar + main slot)
14. `app/tasks/page.tsx` (assembles all components)
15. `tailwind.config.ts` (extend theme with brand tokens)

---

## QUALITY GATES — VERIFY BEFORE MARKING DONE

- [ ] Every task row is exactly 46px tall
- [ ] Grid columns match header to every row — no misalignment at any column edge
- [ ] Status pills are all 22px tall with identical padding
- [ ] Tenant chips are all 20px tall
- [ ] Mode tags are all 20px tall
- [ ] Owner avatars are all 22×22px
- [ ] Done tasks have strikethrough title + muted color
- [ ] Urgent/overdue rows have red left border (3px) with padding adjusted to 11px
- [ ] Due dates: overdue = #CC0000 bold, within 48h = #cc7700 semibold, else muted
- [ ] Sidebar footer is pinned to bottom (margin-top: auto on flex column)
- [ ] No external UI libraries imported anywhere
- [ ] No hardcoded hex values outside of lib/tokens.ts
- [ ] All components accept typed props — no `any`
- [ ] Filter chips are 28px tall, search input is 32px tall
- [ ] TopBar Create button is 32px tall
- [ ] Tab bar active state has exactly 2px bottom border in #CC0000

---

## WHAT NOT TO DO

- Do NOT use Shadcn, Radix, or any component library
- Do NOT use gradients or box-shadows on rows or cards
- Do NOT use colors outside the brand token file
- Do NOT hardcode task data inside components
- Do NOT round corners beyond border-radius 3px on rows/chips
- Do NOT add animations or transitions except border-color on hover
- Do NOT add extra columns or change the column order
- Do NOT render raw UUIDs anywhere in the UI — always resolve to name

---

Execute in the build order above. After each component, verify it renders correctly in isolation before moving to the next. Do not skip steps.
```
