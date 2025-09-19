# Phygital Frontend

React frontend for the Phygital platform built with Vite and Tailwind CSS.

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your API URL
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable components
│   │   ├── Auth/      # Authentication components
│   │   ├── Layout/    # Layout components
│   │   └── UI/        # UI components
│   ├── pages/         # Page components
│   │   ├── Auth/      # Login/Register pages
│   │   ├── Dashboard/ # Dashboard page
│   │   ├── Upload/    # Upload page
│   │   ├── QRCode/    # QR code page
│   │   ├── Analytics/ # Analytics page
│   │   ├── Profile/   # Profile page
│   │   └── User/      # User page (personalized domains)
│   ├── contexts/      # React contexts
│   │   └── AuthContext.jsx
│   ├── utils/         # Utility functions
│   │   └── api.js
│   ├── main.jsx       # App entry point
│   ├── App.jsx        # Main app component
│   └── index.css      # Global styles
├── public/            # Static assets
├── package.json       # Dependencies
├── vite.config.js     # Vite configuration
├── tailwind.config.js # Tailwind configuration
└── vercel.json        # Vercel deployment config
```

## 🎨 Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications
- **Lucide React** - Icons
- **Framer Motion** - Animations

## 🔧 Environment Variables

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# For production
VITE_API_URL=https://your-backend-url.com/api
```

## 📱 Pages & Features

### Public Pages
- **Home** - Landing page with features and CTA
- **Login** - User authentication
- **Register** - User registration
- **User Page** - Personalized domain pages

### Protected Pages
- **Dashboard** - Overview and quick actions
- **Upload** - File upload and configuration
- **QR Code** - QR code generation and download
- **Analytics** - Performance tracking
- **Profile** - Account settings

## 🎯 Key Features

### 1. Authentication System
- JWT-based authentication
- Protected routes
- User context management
- Automatic token refresh

### 2. File Upload
- Drag and drop interface
- Progress tracking
- File validation
- Multiple file types support

### 3. QR Code Management
- QR code generation
- Download in multiple formats
- Position configuration
- Sharing functionality

### 4. Analytics Dashboard
- Real-time metrics
- Interactive charts
- Performance insights
- Export capabilities

### 5. Responsive Design
- Mobile-first approach
- Tailwind CSS utilities
- Custom components
- Dark mode support (ready)

## 🎨 UI Components

### Layout Components
- `Layout` - Main layout with navigation
- `ProtectedRoute` - Route protection wrapper

### UI Components
- `LoadingSpinner` - Loading indicators
- Form components with validation
- Card components
- Button variants

### Page Components
- Authentication pages
- Dashboard with overview
- Upload interface
- Analytics dashboard
- Profile management

## 🚀 Build & Deployment

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Production Build
```bash
npm run build
```

### Vercel Deployment
```bash
npx vercel --prod
```

## 📱 Responsive Design

- **Mobile First** - Optimized for mobile devices
- **Breakpoints** - sm, md, lg, xl responsive design
- **Touch Friendly** - Large touch targets
- **Performance** - Optimized images and assets

## 🎨 Styling

### Tailwind CSS
- Utility-first approach
- Custom color palette
- Responsive utilities
- Component classes

### Custom Styles
- Global styles in `index.css`
- Component-specific styles
- Animation utilities
- Custom utilities

## 🔧 Configuration

### Vite Configuration
- React plugin
- Development server
- Build optimization
- Environment variables

### Tailwind Configuration
- Custom colors
- Font families
- Animations
- Utilities

## 📊 State Management

### React Context
- Authentication context
- User state management
- Global error handling

### React Query
- API data fetching
- Caching and synchronization
- Background updates
- Error handling

## 🧪 Testing (Ready for Implementation)

```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# Run tests
npm test
```

## 🚀 Performance

- **Code Splitting** - Route-based splitting
- **Lazy Loading** - Component lazy loading
- **Image Optimization** - Optimized images
- **Bundle Analysis** - Build analysis tools

## 🔒 Security

- **Input Validation** - Client-side validation
- **XSS Protection** - React's built-in protection
- **CSRF Protection** - Token-based protection
- **Secure Headers** - Security headers

## 📱 PWA Features (Ready for Implementation)

- Service worker
- Offline support
- App manifest
- Push notifications

## 🤝 Contributing

1. Follow React best practices
2. Use TypeScript for new components (optional)
3. Follow Tailwind CSS conventions
4. Write responsive components
5. Add proper error handling

## 📄 License

MIT License
