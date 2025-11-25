# Altinget Layout Prototype

A responsive layout prototype built with Next.js, React, and Tailwind CSS featuring a resizable sidebar and mobile-friendly design.

## Features

- **Resizable Sidebar**: Drag the sidebar edge to resize it (desktop mode only)
- **Responsive Design**: Switch between desktop and mobile views
- **Configurable Layout**: Toggle between narrow/wide containers and 1/2 column forms
- **Interactive Controls**: Control panel to adjust layout settings in real-time

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

### Build

Build the application for production:

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

## Usage

### Resizable Sidebar

In desktop mode, hover over the right edge of the sidebar to see the resize cursor. Click and drag to adjust the sidebar width (200px - 500px).

### Control Panel

The control panel at the bottom of the screen allows you to:

- **View Mode**: Switch between desktop and mobile viewport
- **Container Width**: Toggle between narrow (860px max-width) and wide (full-width) containers
- **Columns**: Switch between 1 or 2 column form layouts

### Mobile Features

In mobile view, the sidebar becomes a slide-out drawer that can be toggled via the hamburger menu button.

## Project Structure

```
altinget-prototype/
├── app/
│   ├── globals.css         # Global styles and Tailwind imports
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/
│   └── LayoutPrototype.tsx # Main prototype component
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── next.config.ts
```

## Technologies

- [Next.js 15](https://nextjs.org/)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)

## License

MIT
