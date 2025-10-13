# BTK Medical Platform

A full-stack web platform for a Biological Medicine Clinic, enabling internal Managers to coordinate their Field Representatives who promote medical products to Doctors in external hospitals.

## Features

### User Roles
- **Super Admin**: Manages managers and views global platform activity
- **Manager**: Manages representatives, doctors, brands, products, and assignments
- **Representative**: Views daily schedule, tracks visits, and manages visit logs

### Key Functionality
- Role-based authentication and authorization
- Doctor and representative management
- Brand and product catalog management
- Visit scheduling and assignment system
- Real-time visit tracking and logging
- Performance reporting and analytics
- Map integration for doctor locations

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Routing**: React Router v7
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Supabase account
- (Optional) Google Maps API key for location features

### 2. Clone and Install Dependencies

```bash
cd btk-clinic-platform
npm install
```

### 3. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your project URL and anon key
3. Go to SQL Editor in your Supabase dashboard
4. Copy and paste the contents of `database-setup.sql` into the SQL editor and run it
5. This will create all tables, RLS policies, and indexes

### 4. Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_optional
```

### 5. Create Demo Users (Optional)

In your Supabase dashboard:

1. Go to Authentication > Users
2. Create test users with these emails:
   - `admin@btk.com` (Super Admin)
   - `manager@btk.com` (Manager)  
   - `rep@btk.com` (Representative)

3. After creating users, you'll need to manually insert their profiles into the database using the SQL editor:

```sql
-- Insert user profiles (replace the UUIDs with actual user IDs from auth.users)
INSERT INTO users (id, email, role) VALUES 
('actual-uuid-from-auth-users', 'admin@btk.com', 'super_admin'),
('actual-uuid-from-auth-users', 'manager@btk.com', 'manager'),
('actual-uuid-from-auth-users', 'rep@btk.com', 'rep');

-- Insert manager profile
INSERT INTO managers (user_id, full_name) VALUES 
('manager-user-uuid', 'Demo Manager');

-- Insert representative profile  
INSERT INTO representatives (user_id, manager_id, full_name) VALUES 
('rep-user-uuid', 'manager-record-id', 'Demo Representative');
```

### 6. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Database Schema

The application uses the following main tables:

- `users` - User authentication and role information
- `managers` - Manager profiles
- `representatives` - Representative profiles  
- `doctors` - Doctor information and categorization
- `brands` - Medicine brands (Heel, Sanum, etc.)
- `products` - Products under each brand
- `rep_doctor_assignments` - Visit scheduling assignments
- `rep_doctor_products` - Product assignments per doctor/rep
- `visit_goals` - Weekly visit targets
- `visit_logs` - Actual visit tracking and completion

## Row-Level Security (RLS)

The database implements comprehensive RLS policies ensuring:

- Super Admins can manage all managers and view global data
- Managers can only access their own representatives, doctors, and related data
- Representatives can only view their assignments and manage their own visit logs
- No user can access data outside their authorization scope

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components for routing
├── hooks/              # Custom React hooks (auth, etc.)
├── lib/                # Supabase client and utilities  
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

## Development Status

### ✅ Completed
- Project setup with React + TypeScript + Tailwind CSS
- Supabase integration and database schema
- Authentication system with role-based access
- Basic dashboard layouts for all user roles
- Navigation and routing system
- Core component structure

### 🚧 In Progress
- Database table creation and RLS policies
- Full dashboard functionality
- CRUD operations for all entities

### 📋 To Do
- Doctor management (create, edit, delete, assign)
- Representative management 
- Brand and product management
- Visit assignment system
- Real-time visit tracking
- Performance reporting with charts
- Google Maps integration
- Mobile responsiveness optimization

## Contributing

This project follows the user requirements for a medical representative coordination platform. The codebase emphasizes:

- Type safety with TypeScript
- Clean, modern UI with Tailwind CSS
- Proper authentication and authorization
- Scalable database design
- Real-time capabilities via Supabase

## License

Private project for BTK Medical Platform.