# Vision AI

Vision AI is a real-time collaborative system design workspace that combines AI-powered architecture generation with collaborative editing and technical specification generation.

## Overview

Users describe a system in plain English, an AI agent maps that system onto a shared canvas, collaborators refine the architecture, and the app generates a technical specification from the resulting graph.

## Features

### Authentication and Projects
- User sign-in and route protection via Clerk
- Project creation, ownership, and collaborator access
- Project list and workspace navigation

### Collaborative Canvas
- Shared real-time canvas using Liveblocks and React Flow
- Live cursors, presence indicators, and node/edge editing
- Canvas snapshots persisted to the filesystem

### Starter System Designs
- Curated library of prebuilt system design templates
- Users can import starter templates into the canvas at any point
- Covers common patterns: monolith, microservices, event-driven, serverless, and more

### AI Architecture Generation
- AI generates system designs from natural language prompts
- Output structured as canvas nodes and edges written to the shared room
- Generation runs as durable background tasks via Trigger.dev

### Spec Generation
- Converts canvas graphs into Markdown technical specifications
- Specs persisted as files and linked to projects
- Users can view and download generated specifications

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The application will redirect you to the editor where you can:
1. Sign in with your authentication provider
2. Create or select a project
3. Enter the project workspace
4. Import starter templates or prompt the AI to generate architectures
5. Collaborate with others in real-time
6. Generate technical specifications from your designs

## Project Structure

- `/app` - Next.js application routes and pages
- `/components` - Reusable UI components
- `/editor` - Editor-specific components (canvas, shapes, templates)
- `/hooks` - Custom React hooks
- `/lib` - Utility functions and services
- `/trigger` - Trigger.dev tasks for AI operations
- `/types` - TypeScript type definitions
- `/context` - Documentation and project context files

## Key Technologies

- **Next.js 16** - React framework
- **Liveblocks** - Real-time collaboration infrastructure
- **React Flow** - Diagramming and canvas library
- **Trigger.dev** - Background task execution for AI operations
- **Clerk** - Authentication and user management
- **Google Gemini** - AI model for architecture generation and spec creation
- **XYFlow** - React Flow implementation
- **Prisma** - Database ORM
- **PostgreSQL** - Database

## Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

GOOGLE_AI_API_KEY=your_google_ai_api_key
GEMINI_MODEL=gemini-3-flash-preview  # optional

DATABASE_URL=your_postgresql_connection_string
DIRECT_DATABASE_URL=your_direct_postgresql_connection_string  # for migrations

NEXT_PUBLIC_TRIGGER_DEV_PUBLIC_KEY=your_trigger_dev_public_key
TRIGGER_DEV_API_KEY=your_trigger_dev_api_key
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production (includes Prisma generation)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run trigger:dev` - Start Trigger.dev development server
- `npm run trigger:deploy` - Deploy Trigger.dev tasks

## Learn More

To learn more about the technologies used, check out:

- [Next.js Documentation](https://nextjs.org/docs)
- [Liveblocks Documentation](https://liveblocks.io/docs)
- [React Flow Documentation](https://reactflow.dev/)
- [Trigger.dev Documentation](https://trigger.dev/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

## Deploy on Vercel

The easiest way to deploy your Vision AI app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.