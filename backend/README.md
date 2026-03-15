# 🚀 TaskFlow Elite - Backend Setup

This folder contains the database schema for the Task Manager application.

## 🛠️ Database Schema (Supabase)

To set up your database, follow these steps:

1.  **Create a New Project** on [Supabase.com](https://supabase.com).
2.  **Open the SQL Editor** in your Supabase dashboard.
3.  **Run the SQL script** found in `supabase/migrations/01_initial.sql`.
4.  **Automatic Trigger**: The script includes a trigger that automatically creates a `profile` for every user who signs up.

## 🔑 Authentication Settings

Ensure **Email Auth** is enabled in `Authentication -> Providers`.

## 🛡️ RLS (Row Level Security)

RLS is enabled by default in the script:
-   **Profiles**: Publicly readable (to search employees), owner-updatable.
-   **Tasks**: Viewable by Requesters, assigned Employees, and Managers/Presidents.
-   **Creation**: Restrictive to Client/Manager/President roles.
