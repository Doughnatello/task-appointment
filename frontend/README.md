# Task Manager Elite

A modern, enterprise-grade task management system built with Next.js, Tailwind CSS v4, and Supabase.

## Features

- **Advanced Authentication**: Secure login and signup powered by Supabase Auth with custom user roles (Admin, Manager, Employee).
- **Enterprise Dashboard**: Unified oversight of tasks, personnel management, and operational summaries.
- **Dynamic Task Tracking**: Grid and Calendar views for monitoring mission-critical objectives.
- **Real-time Updates**: Live synchronization of task statuses and assignments.
- **Premium Design System**: Dark-themed, glassmorphic UI using Tailwind CSS v4 and Framer Motion.

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Database & Auth**: Supabase
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Toast Notifications**: React Hot Toast
