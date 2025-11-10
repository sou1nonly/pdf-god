# Sprint 1: Project Setup & Foundation

**Duration:** 2 weeks  
**Sprint Goal:** Establish development environment, project structure, and basic authentication system

---

## Sprint Planning

### User Stories

#### US-1.1: Development Environment Setup
**As a** developer  
**I want** a fully configured development environment  
**So that** I can start coding efficiently

**Story Points:** 3  
**Priority:** High

**Acceptance Criteria:**
- [ ] Node.js v18 LTS installed and verified
- [ ] Git repository initialized with proper .gitignore
- [ ] Package.json configured with all dependencies
- [ ] Development server runs without errors
- [ ] Hot reload works for frontend changes
- [ ] Environment variables configured (.env setup)

---

#### US-1.2: Project Structure Setup
**As a** developer  
**I want** a well-organized project structure  
**So that** code is maintainable and scalable

**Story Points:** 2  
**Priority:** High

**Acceptance Criteria:**
- [ ] Frontend folder structure (components, pages, hooks, utils)
- [ ] Backend folder structure (routes, controllers, models, middleware)
- [ ] Shared types/interfaces folder
- [ ] Test folder structure with sample tests
- [ ] Documentation folder with setup instructions

---

#### US-1.3: Database Connection
**As a** developer  
**I want** to connect to MongoDB  
**So that** I can store and retrieve user data

**Story Points:** 3  
**Priority:** High

**Acceptance Criteria:**
- [ ] MongoDB Atlas account created (or local MongoDB installed)
- [ ] Database connection established
- [ ] Connection error handling implemented
- [ ] Database schemas defined for User and Document models
- [ ] Test data seeded successfully

---

#### US-1.4: User Authentication System
**As a** user  
**I want** to register and log in  
**So that** I can access my documents securely

**Story Points:** 8  
**Priority:** Critical

**Acceptance Criteria:**
- [ ] User registration API endpoint (/api/auth/register)
- [ ] User login API endpoint (/api/auth/login)
- [ ] Password hashing with bcrypt (12 rounds minimum)
- [ ] JWT token generation and validation
- [ ] Protected route middleware
- [ ] Email validation
- [ ] Password strength validation
- [ ] Login/Register UI components
- [ ] Error handling and user feedback

---

#### US-1.5: Google OAuth Integration
**As a** user  
**I want** to sign in with Google  
**So that** I don't need to create a new password

**Story Points:** 5  
**Priority:** Medium

**Acceptance Criteria:**
- [ ] Firebase Authentication configured
- [ ] Google OAuth provider enabled
- [ ] OAuth callback handler implemented
- [ ] User profile synced with database
- [ ] "Sign in with Google" button in UI
- [ ] OAuth error handling

---

## Sprint Backlog (Tasks)

### Development Environment Setup (US-1.1)

**Task 1.1.1:** Install Node.js and verify installation
- Install Node.js v18 LTS from nodejs.org
- Verify: `node --version` and `npm --version`
- Install Yarn (optional): `npm install -g yarn`
- **Estimated:** 0.5 hours

**Task 1.1.2:** Initialize Git repository
- `git init`
- Create `.gitignore` (node_modules, .env, dist, build, .DS_Store)
- First commit: "Initial commit"
- **Estimated:** 0.5 hours

**Task 1.1.3:** Setup package.json
```bash
npm init -y
npm install express mongoose dotenv cors bcryptjs jsonwebtoken
npm install --save-dev nodemon typescript @types/node @types/express
npm install react react-dom vite @vitejs/plugin-react
npm install tailwindcss postcss autoprefixer
```
- Configure scripts in package.json
- **Estimated:** 1 hour

**Task 1.1.4:** Configure environment variables
- Create `.env.example` template
- Create `.env` with actual values (add to .gitignore)
- Required vars: `PORT`, `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV`
- **Estimated:** 0.5 hours

**Task 1.1.5:** Setup development server
- Configure Vite for frontend
- Configure Express for backend
- Test hot reload
- **Estimated:** 1.5 hours

---

### Project Structure (US-1.2)

**Task 1.2.1:** Create folder structure
```
pdf-god/
├── client/               # Frontend (React + Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── common/
│   │   │   ├── editor/
│   │   │   └── layout/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── services/
│   │   ├── context/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── server/               # Backend (Node.js + Express)
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── config/
│   │   ├── services/
│   │   └── server.ts
│   ├── tests/
│   └── package.json
├── shared/               # Shared types/interfaces
│   └── types/
├── documentation/        # (already exists)
└── README.md
```
- **Estimated:** 1 hour

**Task 1.2.2:** Create configuration files
- `tsconfig.json` for TypeScript
- `tailwind.config.ts` for TailwindCSS
- `.eslintrc.json` for code linting
- `.prettierrc` for code formatting
- **Estimated:** 1 hour

---

### Database Connection (US-1.3)

**Task 1.3.1:** Setup MongoDB Atlas
- Create account at mongodb.com
- Create cluster (free tier)
- Whitelist IP address (0.0.0.0/0 for development)
- Get connection string
- **Estimated:** 1 hour

**Task 1.3.2:** Create database connection module
```typescript
// server/src/config/database.ts
import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
```
- **Estimated:** 1 hour

**Task 1.3.3:** Define User schema
```typescript
// server/src/models/User.ts
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  avatar: String,
  storageUsed: { type: Number, default: 0 },
  storageLimit: { type: Number, default: 5368709120 }, // 5GB
  createdAt: { type: Date, default: Date.now }
});
```
- **Estimated:** 1.5 hours

**Task 1.3.4:** Define Document schema
```typescript
// server/src/models/Document.ts
const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileUrl: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: String,
  pages: Number,
  thumbnail: String,
  lastModified: { type: Date, default: Date.now },
  sharedWith: [{ user: ObjectId, permission: String }]
});
```
- **Estimated:** 1.5 hours

---

### User Authentication (US-1.4)

**Task 1.4.1:** Create auth controller
```typescript
// server/src/controllers/authController.ts
export const register = async (req, res) => {
  // 1. Validate input
  // 2. Check if user exists
  // 3. Hash password
  // 4. Create user
  // 5. Generate JWT
  // 6. Return token
};

export const login = async (req, res) => {
  // 1. Validate input
  // 2. Find user
  // 3. Compare password
  // 4. Generate JWT
  // 5. Return token
};
```
- **Estimated:** 3 hours

**Task 1.4.2:** Create auth routes
```typescript
// server/src/routes/authRoutes.ts
router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getCurrentUser);
```
- **Estimated:** 1 hour

**Task 1.4.3:** Create auth middleware
```typescript
// server/src/middleware/auth.ts
export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  next();
};
```
- **Estimated:** 1.5 hours

**Task 1.4.4:** Create Login UI component
```tsx
// client/src/components/auth/Login.tsx
// Form with email, password, submit button
// Validation, error display, loading state
```
- **Estimated:** 3 hours

**Task 1.4.5:** Create Register UI component
```tsx
// client/src/components/auth/Register.tsx
// Form with name, email, password, confirm password
// Password strength indicator
```
- **Estimated:** 3 hours

**Task 1.4.6:** Create auth service/API client
```typescript
// client/src/services/authService.ts
export const login = (email: string, password: string) => 
  fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
```
- **Estimated:** 2 hours

---

### Google OAuth (US-1.5)

**Task 1.5.1:** Setup Firebase project
- Create project in Firebase Console
- Enable Authentication
- Enable Google provider
- Get Firebase config
- **Estimated:** 1 hour

**Task 1.5.2:** Install Firebase SDK
```bash
npm install firebase
```
- Configure Firebase in client
- **Estimated:** 0.5 hours

**Task 1.5.3:** Implement OAuth handler
```typescript
// client/src/services/firebase.ts
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
```
- **Estimated:** 2 hours

**Task 1.5.4:** Create backend OAuth endpoint
```typescript
// server/src/controllers/authController.ts
export const googleAuth = async (req, res) => {
  const { idToken } = req.body;
  // Verify token with Firebase
  // Create or update user
  // Generate JWT
  // Return token
};
```
- **Estimated:** 2 hours

**Task 1.5.5:** Add Google Sign-In button to UI
- **Estimated:** 1 hour

---

## Definition of Done (DoD)

- [ ] Code is peer-reviewed
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] No console errors or warnings
- [ ] Code follows project style guide
- [ ] Documentation updated (if needed)
- [ ] Deployed to development environment
- [ ] Acceptance criteria met

---

## Sprint Ceremonies

### Daily Standup (15 min)
- What did I accomplish yesterday?
- What will I work on today?
- Are there any blockers?

### Sprint Review (2 hours)
- Demo completed features to stakeholders
- Show working authentication system
- Get feedback

### Sprint Retrospective (1.5 hours)
**What went well:**
- 

**What could be improved:**
- 

**Action items:**
- 

---

## Technical Debt & Risks

**Potential Risks:**
1. MongoDB Atlas connectivity issues
2. Firebase quota limits
3. JWT token expiration handling
4. Password reset flow not implemented (defer to Sprint 2)

**Technical Debt:**
- Add refresh token mechanism (Sprint 2)
- Implement rate limiting (Sprint 2)
- Add email verification (Sprint 3)

---

## Sprint Velocity

**Estimated Story Points:** 29 (Updated: Added US-1.6 Google Authentication +8 points)  
**Actual Story Points Completed:** 29  
**Velocity:** 100%

---

## ⭐ Sprint 1 Update - November 5, 2025

### US-1.6: Google Authentication System (NEW)
**Story Points:** 8  
**Priority:** Critical  
**Status:** ✅ Completed

**As a** user  
**I want** to sign in with my Google account  
**So that** I can securely access the PDF editor

**Implementation Details:**
- ✅ Created `src/contexts/AuthContext.tsx` - Authentication context with Google OAuth
- ✅ Created `src/components/auth/ProtectedRoute.tsx` - Route protection wrapper
- ✅ Created `src/pages/LoginPage.tsx` - Login page with Google sign-in button
- ✅ Updated `src/App.tsx` - Added AuthProvider and protected routes
- ✅ Updated `src/components/layout/TopBar.tsx` - Added user profile with avatar and logout
- ✅ Created `GOOGLE-AUTH-SETUP.md` - Complete OAuth configuration guide

**Files Created/Modified:**
1. `/src/contexts/AuthContext.tsx` (NEW)
2. `/src/components/auth/ProtectedRoute.tsx` (NEW)
3. `/src/pages/LoginPage.tsx` (NEW)
4. `/src/App.tsx` (MODIFIED)
5. `/src/components/layout/TopBar.tsx` (MODIFIED)
6. `/GOOGLE-AUTH-SETUP.md` (NEW)

**Acceptance Criteria:**
- ✅ Users can sign in with Google OAuth
- ✅ Authentication state persists across page refreshes
- ✅ Protected routes redirect unauthenticated users to login
- ✅ User profile displays in TopBar with avatar
- ✅ Users can sign out
- ⏳ Google OAuth configured in Supabase dashboard (requires manual setup)
- ⏳ RLS policies updated for authenticated users

**Configuration Required:**
See `GOOGLE-AUTH-SETUP.md` for:
- Google Cloud Console OAuth setup
- Supabase provider configuration
- RLS policy updates

**Technical Notes:**
- Uses Supabase Auth with Google provider
- JWT tokens for session management
- Avatar integration with shadcn/ui Avatar component
- Secure redirect flow after authentication

---

## Notes

- Keep environment variables secure
- Test authentication flow thoroughly
- Ensure proper error messages for users
- Document API endpoints with Postman/Swagger
- **NEW:** Google Authentication requires OAuth configuration - see GOOGLE-AUTH-SETUP.md
- **NEW:** Authentication is now required for all document operations (RLS enforced)
