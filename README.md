# តោះឆាត (TOS Chat) - Real-time Chat Application

A modern, feature-rich real-time chat application built with Next.js and React. The application name "តោះឆាត" means "Let's Chat" in Khmer language.

## 🌟 Features

### Core Chat Features

- **Real-time messaging** with WebSocket connections
- **Private conversations** between users
- **Group chats** with multiple participants
- **File sharing** support for images and documents
- **Typing indicators** to show when users are typing
- **Message history** with pagination
- **Unread message counts** and notifications

### User Management

- **User authentication** (login/register)
- **Profile management** with avatar uploads
- **Contact management** (add/remove contacts)
- **User blocking** system
- **Online status** indicators
- **User search** functionality

### Group Features

- **Create and manage groups**
- **Add/remove group members**
- **Group messaging** with real-time updates
- **Group membership notifications**

### UI/UX Features

- **Dark theme** design
- **Responsive layout** for all screen sizes
- **Collapsible sidebar** for better space utilization
- **Toast notifications** for system messages
- **Modal dialogs** for various actions
- **Loading states** and error handling

### Admin Features

- **User management** (ban/unban users)
- **System statistics** monitoring
- **Broadcast messages** to all users
- **Admin dashboard** with user overview

## 🛠️ Technology Stack

### Frontend

- **Next.js 15.4.6** - React framework with App Router
- **React 19.1.0** - JavaScript library for building user interfaces
- **Tailwind CSS 4** - Utility-first CSS framework
- **Zustand 5.0.7** - State management library
- **React Hook Form 7.62.0** - Form handling and validation
- **Lucide React 0.539.0** - Icon library

### Real-time Communication

- **SockJS Client 1.6.1** - WebSocket fallback library
- **STOMP.js 7.1.1** - STOMP over WebSocket protocol
- **Axios 1.11.0** - HTTP client for API calls

### Development Tools

- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **date-fns 4.1.0** - Date manipulation library

## 📁 Project Structure

```
tos-chat/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Authentication group routes
│   │   ├── layout.js            # Auth layout wrapper
│   │   ├── login/               # Login page
│   │   └── register/            # Registration page
│   ├── dashboard/               # Main dashboard page
│   ├── settings/                # User settings page
│   ├── globals.css              # Global styles
│   ├── layout.js                # Root layout
│   └── page.js                  # Home page with redirect logic
├── components/                   # React components
│   ├── auth/                    # Authentication components
│   │   ├── LoginForm.js
│   │   └── RegisterForm.js
│   ├── chat/                    # Chat-related components
│   │   ├── ChatArea.js
│   │   ├── ChatHeader.js
│   │   ├── MessageBubble.js
│   │   ├── MessageInput.js
│   │   ├── MessageList.js
│   │   └── TypingIndicator.js
│   ├── dashboard/               # Dashboard components
│   │   ├── AddContactModal.js
│   │   ├── BlockedUsersList.js
│   │   ├── ContactList.js
│   │   ├── ConversationList.js
│   │   ├── CreateGroupModal.js
│   │   ├── DashboardLayout.js
│   │   ├── GroupList.js
│   │   ├── Header.js
│   │   ├── ProfileSettings.js
│   │   └── Sidebar.js
│   ├── ui/                      # Reusable UI components
│   │   ├── Modal.js
│   │   ├── NotificationToast.js
│   │   └── StatusIndicator.js
│   └── Logo.js                  # Application logo component
├── hooks/                       # Custom React hooks
│   └── useWebSocket.js          # WebSocket connection management
├── lib/                         # Utility libraries
│   ├── fonts.js                 # Font configurations
│   └── utils.js                 # Helper functions
├── services/                    # API and external services
│   ├── api.js                   # HTTP API service
│   └── websocket.js             # WebSocket service
├── store/                       # State management
│   └── useStore.js              # Zustand stores
└── Configuration files
    ├── next.config.mjs          # Next.js configuration
    ├── tailwind.config.js       # Tailwind CSS configuration
    ├── postcss.config.mjs       # PostCSS configuration
    ├── eslint.config.mjs        # ESLint configuration
    └── jsconfig.json            # JavaScript configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend API server running (default: http://localhost:8080)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd tos-chat
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env.local` file in the root directory:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   NEXT_PUBLIC_WS_URL=http://localhost:8080/ws
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint for code quality

## 🏗️ Architecture Overview

### State Management

The application uses **Zustand** for state management with multiple stores:

- **useAuthStore** - User authentication and profile data
- **useChatStore** - Chat messages and conversations
- **useContactStore** - User contacts and blocked users
- **useGroupStore** - Group management and membership
- **useUIStore** - UI state (notifications, modals, theme)
- **useAdminStore** - Admin functionality and statistics

### Real-time Communication

- **WebSocket connection** using SockJS and STOMP protocol
- **Automatic reconnection** handling
- **Topic-based subscriptions** for different message types
- **Message queuing** for private and group chats

### Routing Structure

- **App Router** with nested layouts
- **Route groups** for authentication pages
- **Middleware protection** for authenticated routes
- **Dynamic routing** for user profiles and groups

### API Integration

- **Axios-based HTTP client** with interceptors
- **Cookie-based authentication** with automatic session handling
- **File upload support** for avatars and message attachments
- **Error handling** with user-friendly messages

## 🎨 Design System

### Typography

- **Roboto** - Primary font for UI elements
- **Nunito Sans** - Alternative sans-serif font
- **Kantumruy Pro** - Khmer language support
- **Taprom** - Decorative Khmer font for branding

### Color Scheme

- **Dark theme** with gray-900 background
- **Amber accent color** (amber-500) for primary actions
- **Status colors** - green (online), red (error), yellow (warning)
- **High contrast** for accessibility

### Components

- **Consistent spacing** using Tailwind's spacing scale
- **Rounded corners** for modern appearance
- **Smooth transitions** for interactive elements
- **Responsive design** with mobile-first approach

## 🔧 Configuration

### Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API base URL
- `NEXT_PUBLIC_WS_URL` - WebSocket server URL

### Browser Support

- Modern browsers with WebSocket support
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Performance Optimizations

- **Code splitting** with dynamic imports
- **Image optimization** with Next.js Image component
- **Font optimization** with Google Fonts integration
- **Bundle analysis** available through Next.js

## 🧪 Development Guidelines

### Code Style

- **ESLint** configuration extends Next.js core web vitals
- **Consistent naming** conventions for components and functions
- **Component organization** by feature and functionality
- **Comment documentation** for complex logic

### State Management Best Practices

- **Single responsibility** for each store
- **Immutable updates** using Zustand patterns
- **Error boundaries** for component isolation
- **Loading states** for better user experience

### API Integration

- **Centralized service layer** for all HTTP requests
- **Consistent error handling** across all API calls
- **Request/response logging** for debugging
- **Automatic session management** with cookies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Next.js team for the excellent React framework
- Tailwind CSS for the utility-first CSS framework
- Zustand for the simple state management solution
- The open-source community for the amazing libraries used in this project

---

**តោះឆាត** - Building connections through conversation
