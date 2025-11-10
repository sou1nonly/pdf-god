# Sprint 7: Polish, Testing & Deployment

**Duration:** 2 weeks  
**Sprint Goal:** Finalize UI/UX, complete comprehensive testing, optimize performance, and deploy to production

---

## Sprint Planning

### User Stories

#### US-7.1: UI/UX Polish & Responsiveness
**As a** user  
**I want** a polished, professional interface  
**So that** the app is enjoyable to use

**Story Points:** 8  
**Priority:** High

**Acceptance Criteria:**
- [ ] Mobile responsive (375px - 1920px)
- [ ] Tablet optimization
- [ ] Loading states for all async operations
- [ ] Error states with helpful messages
- [ ] Consistent design system
- [ ] Smooth animations and transitions

---

#### US-7.2: Comprehensive Testing
**As a** development team  
**We want** full test coverage  
**So that** bugs are caught before production

**Story Points:** 13  
**Priority:** Critical

**Acceptance Criteria:**
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests for API endpoints
- [ ] End-to-end tests for user flows
- [ ] Performance tests (load, stress)
- [ ] Security audit completed
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)

---

#### US-7.3: Accessibility (WCAG 2.1)
**As a** user with disabilities  
**I want** accessible features  
**So that** I can use the app effectively

**Story Points:** 5  
**Priority:** Medium

**Acceptance Criteria:**
- [ ] Keyboard navigation complete
- [ ] Screen reader support
- [ ] ARIA labels on all interactive elements
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Alt text for images

---

#### US-7.4: Performance Optimization
**As a** user  
**I want** fast load times  
**So that** I can work efficiently

**Story Points:** 8  
**Priority:** High

**Acceptance Criteria:**
- [ ] Lighthouse score 90+ (Performance)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Bundle size optimized (< 500KB gzipped)
- [ ] Images lazy-loaded
- [ ] API response times < 500ms

---

#### US-7.5: Production Deployment & Monitoring
**As a** system administrator  
**I want** reliable deployment and monitoring  
**So that** the system is stable in production

**Story Points:** 8  
**Priority:** Critical

**Acceptance Criteria:**
- [ ] CI/CD pipeline configured
- [ ] Production environment deployed
- [ ] SSL certificates installed
- [ ] Monitoring and alerting active
- [ ] Backup strategy implemented
- [ ] Documentation complete

---

## Sprint Backlog (Tasks)

### UI/UX Polish (US-7.1)

**Task 7.1.1:** Implement responsive design
```tsx
// client/src/components/layout/ResponsiveLayout.tsx
import { useMediaQuery } from '@/hooks/use-media-query';

export const ResponsiveLayout = ({ children }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  return (
    <div className={`layout ${isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'}`}>
      {isMobile ? (
        <MobileLayout>{children}</MobileLayout>
      ) : (
        <DesktopLayout>{children}</DesktopLayout>
      )}
    </div>
  );
};
```

```css
/* Mobile-first responsive styles */
.editor-container {
  width: 100%;
  padding: 1rem;
}

@media (min-width: 768px) {
  .editor-container {
    padding: 2rem;
  }
}

@media (min-width: 1024px) {
  .editor-container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```
- **Estimated:** 6 hours

**Task 7.1.2:** Add loading skeletons
```tsx
// client/src/components/ui/Skeleton.tsx
export const DocumentSkeleton = () => (
  <div className="skeleton-container">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-toolbar" />
    <div className="skeleton skeleton-canvas" />
  </div>
);

// Usage
{loading ? <DocumentSkeleton /> : <DocumentViewer />}
```

```css
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```
- **Estimated:** 3 hours

**Task 7.1.3:** Improve error states
```tsx
// client/src/components/ui/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
    // Send to error tracking service
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-state">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```
- **Estimated:** 2 hours

**Task 7.1.4:** Add smooth transitions
```css
/* Global transitions */
* {
  transition: all 0.2s ease-in-out;
}

.fade-enter {
  opacity: 0;
}

.fade-enter-active {
  opacity: 1;
  transition: opacity 300ms;
}

.fade-exit {
  opacity: 1;
}

.fade-exit-active {
  opacity: 0;
  transition: opacity 300ms;
}

/* Page transitions */
.page-transition {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```
- **Estimated:** 2 hours

**Task 7.1.5:** Create onboarding tour
```tsx
// client/src/components/onboarding/Tour.tsx
import Joyride from 'react-joyride';

export const OnboardingTour = () => {
  const steps = [
    {
      target: '.upload-button',
      content: 'Upload your first PDF here',
    },
    {
      target: '.toolbar',
      content: 'Use these tools to edit your PDF',
    },
    {
      target: '.ai-panel',
      content: 'Get AI-powered summaries and chat',
    },
    // ... more steps
  ];
  
  return (
    <Joyride
      steps={steps}
      continuous
      showSkipButton
      styles={{
        options: {
          primaryColor: '#4F46E5',
        }
      }}
    />
  );
};
```
- **Estimated:** 3 hours

---

### Comprehensive Testing (US-7.2)

**Task 7.2.1:** Set up testing infrastructure
```bash
# Frontend testing
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event

# Backend testing
npm install --save-dev jest supertest

# E2E testing
npm install --save-dev @playwright/test
```

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  }
};
```
- **Estimated:** 2 hours

**Task 7.2.2:** Write unit tests
```typescript
// client/src/components/PDFViewer.test.tsx
import { render, screen } from '@testing-library/react';
import { PDFViewer } from './PDFViewer';

describe('PDFViewer', () => {
  it('renders PDF document', async () => {
    render(<PDFViewer documentId="123" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByTestId('pdf-canvas')).toBeInTheDocument();
    });
  });
  
  it('handles zoom controls', async () => {
    const { getByLabelText } = render(<PDFViewer documentId="123" />);
    const zoomIn = getByLabelText('Zoom In');
    
    await userEvent.click(zoomIn);
    
    expect(getZoomLevel()).toBe(1.25);
  });
  
  it('navigates between pages', async () => {
    const { getByLabelText } = render(<PDFViewer documentId="123" />);
    
    await userEvent.click(getByLabelText('Next Page'));
    
    expect(getCurrentPage()).toBe(2);
  });
});

// server/src/services/pdfService.test.ts
import { mergePDFs } from './pdfMergeService';

describe('PDF Merge Service', () => {
  it('merges two PDFs correctly', async () => {
    const pdf1 = await readFile('test1.pdf');
    const pdf2 = await readFile('test2.pdf');
    
    const merged = await mergePDFs([pdf1, pdf2]);
    
    expect(merged).toBeInstanceOf(Buffer);
    expect(merged.length).toBeGreaterThan(0);
    
    // Verify page count
    const pdfDoc = await PDFDocument.load(merged);
    expect(pdfDoc.getPageCount()).toBe(10); // 5 + 5 pages
  });
});
```
- **Estimated:** 12 hours

**Task 7.2.3:** Write integration tests
```typescript
// server/src/routes/document.test.ts
import request from 'supertest';
import { app } from '../app';

describe('Document API', () => {
  let authToken: string;
  
  beforeAll(async () => {
    // Create test user and get token
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });
    authToken = res.body.token;
  });
  
  it('POST /api/documents/upload - uploads PDF', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', 'test.pdf')
      .expect(201);
    
    expect(res.body).toHaveProperty('documentId');
    expect(res.body.filename).toBe('test.pdf');
  });
  
  it('GET /api/documents/:id - retrieves document', async () => {
    const res = await request(app)
      .get('/api/documents/123')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body).toHaveProperty('title');
  });
  
  it('GET /api/documents - lists user documents', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(Array.isArray(res.body.documents)).toBe(true);
  });
});
```
- **Estimated:** 8 hours

**Task 7.2.4:** Write E2E tests
```typescript
// e2e/tests/editor.spec.ts
import { test, expect } from '@playwright/test';

test.describe('PDF Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.fill('input[name=email]', 'test@example.com');
    await page.fill('input[name=password]', 'password123');
    await page.click('button[type=submit]');
  });
  
  test('upload and edit PDF', async ({ page }) => {
    // Upload
    await page.click('text=Upload PDF');
    await page.setInputFiles('input[type=file]', 'test.pdf');
    
    // Wait for editor
    await page.waitForSelector('.pdf-canvas');
    
    // Edit text
    await page.click('.tool-text-edit');
    await page.click('.pdf-canvas', { position: { x: 100, y: 100 } });
    await page.keyboard.type('Hello World');
    
    // Save
    await page.click('text=Save');
    
    await expect(page.locator('.toast-success')).toContainText('Saved');
  });
  
  test('AI summarization', async ({ page }) => {
    await page.goto('http://localhost:3000/editor/123');
    
    await page.click('text=AI Summary');
    await page.click('text=Summarize');
    
    await expect(page.locator('.summary-content')).toBeVisible();
    await expect(page.locator('.summary-content')).toContainText(/\w+/);
  });
  
  test('collaboration', async ({ page, context }) => {
    // Open document in first tab
    await page.goto('http://localhost:3000/editor/123');
    
    // Open in second tab
    const page2 = await context.newPage();
    await page2.goto('http://localhost:3000/editor/123');
    
    // Type in first tab
    await page.keyboard.type('Test');
    
    // Verify in second tab
    await expect(page2.locator('.editor-content')).toContainText('Test');
  });
});
```
- **Estimated:** 10 hours

**Task 7.2.5:** Performance testing
```typescript
// performance/load-test.ts
import autocannon from 'autocannon';

const runLoadTest = async () => {
  const result = await autocannon({
    url: 'http://localhost:5000/api/documents',
    connections: 100,
    duration: 30,
    headers: {
      'Authorization': 'Bearer test-token'
    }
  });
  
  console.log(autocannon.printResult(result));
  
  // Assert performance criteria
  expect(result.requests.average).toBeGreaterThan(100); // 100 req/s
  expect(result.latency.p99).toBeLessThan(1000); // 99th percentile < 1s
};
```
- **Estimated:** 4 hours

**Task 7.2.6:** Security audit
```bash
# Frontend dependencies
npm audit --production

# Backend dependencies
npm audit --production

# OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3000

# Check for common vulnerabilities
npm install -g snyk
snyk test
```

```typescript
// Security checklist
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF tokens on forms
- [ ] Rate limiting on API endpoints
- [ ] Secure password hashing (bcrypt)
- [ ] JWT token expiration
- [ ] HTTPS enforced
- [ ] Content Security Policy headers
- [ ] Input validation on all endpoints
```
- **Estimated:** 6 hours

---

### Accessibility (US-7.3)

**Task 7.3.1:** Add keyboard navigation
```tsx
// client/src/hooks/useKeyboardNav.ts
export const useKeyboardNavigation = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Arrow keys for navigation
      if (e.key === 'ArrowRight') {
        nextPage();
      } else if (e.key === 'ArrowLeft') {
        previousPage();
      }
      
      // Tab for focus management
      if (e.key === 'Tab') {
        // Ensure focus is visible
        document.body.classList.add('keyboard-nav');
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        closeAllModals();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
```

```css
/* Focus indicators */
.keyboard-nav *:focus {
  outline: 2px solid #4F46E5;
  outline-offset: 2px;
}

/* Skip to main content */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```
- **Estimated:** 4 hours

**Task 7.3.2:** Add ARIA labels
```tsx
// client/src/components/Toolbar.tsx
<button
  aria-label="Zoom in"
  aria-keyshortcuts="Control+Plus"
  onClick={handleZoomIn}
>
  <ZoomInIcon aria-hidden="true" />
</button>

<button
  aria-label="Save document"
  aria-keyshortcuts="Control+S"
  aria-describedby="save-status"
  onClick={handleSave}
>
  Save
</button>
<div id="save-status" role="status" aria-live="polite">
  {saveStatus}
</div>

// Live regions for screen readers
<div role="alert" aria-live="assertive" aria-atomic="true">
  {errorMessage}
</div>
```
- **Estimated:** 3 hours

**Task 7.3.3:** Color contrast audit
```css
/* Ensure WCAG AA compliance (4.5:1 for normal text) */
:root {
  --color-text: #1a1a1a;        /* 16:1 on white */
  --color-text-muted: #4a4a4a;   /* 7:1 on white */
  --color-primary: #4F46E5;      /* 4.5:1 on white */
  --color-error: #DC2626;        /* 4.5:1 on white */
  --color-success: #059669;      /* 4.5:1 on white */
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --color-text: #000;
    --color-primary: #0000FF;
    --color-border: #000;
  }
}
```
- **Estimated:** 2 hours

---

### Performance Optimization (US-7.4)

**Task 7.4.1:** Code splitting
```tsx
// client/src/App.tsx
import { lazy, Suspense } from 'react';

const EditorPage = lazy(() => import('./pages/EditorPage'));
const HomePage = lazy(() => import('./pages/HomePage'));

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/editor/:id" element={<EditorPage />} />
      </Routes>
    </Suspense>
  );
}
```

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'pdf': ['pdf-lib', 'pdfjs-dist'],
          'fabric': ['fabric'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  }
});
```
- **Estimated:** 3 hours

**Task 7.4.2:** Image optimization
```tsx
// Lazy load images
import { LazyLoadImage } from 'react-lazy-load-image-component';

<LazyLoadImage
  src={thumbnailUrl}
  alt={`Page ${pageNumber}`}
  effect="blur"
  threshold={100}
/>

// Use WebP format
export const optimizeImage = async (imageBuffer: Buffer): Promise<Buffer> => {
  return await sharp(imageBuffer)
    .webp({ quality: 80 })
    .toBuffer();
};
```
- **Estimated:** 2 hours

**Task 7.4.3:** Database query optimization
```typescript
// Add indexes
documentSchema.index({ owner: 1, createdAt: -1 });
documentSchema.index({ 'tags': 1 });

// Use lean() for read-only queries
const documents = await Document.find({ owner: userId })
  .lean()
  .select('title createdAt fileSize')
  .limit(50);

// Implement pagination
const getPaginatedDocuments = async (page: number, limit: number = 20) => {
  const skip = (page - 1) * limit;
  
  const [documents, total] = await Promise.all([
    Document.find().skip(skip).limit(limit),
    Document.countDocuments()
  ]);
  
  return {
    documents,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};
```
- **Estimated:** 3 hours

**Task 7.4.4:** Implement caching
```typescript
// Redis caching
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

export const getCachedDocument = async (documentId: string) => {
  const cached = await redis.get(`doc:${documentId}`);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const document = await Document.findById(documentId);
  
  await redis.set(
    `doc:${documentId}`,
    JSON.stringify(document),
    'EX',
    3600 // 1 hour
  );
  
  return document;
};

// Frontend caching with React Query
import { useQuery } from '@tanstack/react-query';

const { data: document } = useQuery({
  queryKey: ['document', documentId],
  queryFn: () => fetchDocument(documentId),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 30 * 60 * 1000  // 30 minutes
});
```
- **Estimated:** 4 hours

---

### Production Deployment (US-7.5)

**Task 7.5.1:** Set up CI/CD pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linter
        run: npm run lint
      
      - name: Build
        run: npm run build
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to DigitalOcean
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/unipdf-studio
            git pull origin main
            npm install --production
            npm run build
            pm2 restart all
```
- **Estimated:** 4 hours

**Task 7.5.2:** Configure production server
```bash
# Install dependencies
sudo apt update
sudo apt install nginx nodejs npm mongodb redis-server

# Install PM2
npm install -g pm2

# Configure Nginx
sudo nano /etc/nginx/sites-available/unipdf-studio
```

```nginx
# /etc/nginx/sites-available/unipdf-studio
server {
    listen 80;
    server_name unipdfstudio.com www.unipdfstudio.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name unipdfstudio.com www.unipdfstudio.com;
    
    ssl_certificate /etc/letsencrypt/live/unipdfstudio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/unipdfstudio.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend
    location / {
        root /var/www/unipdf-studio/client/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
- **Estimated:** 4 hours

**Task 7.5.3:** Set up monitoring
```bash
# Install monitoring tools
npm install --save prom-client express-prom-bundle
```

```typescript
// server/src/monitoring.ts
import promClient from 'prom-client';
import promBundle from 'express-prom-bundle';

// Enable default metrics
promClient.collectDefaultMetrics({ timeout: 5000 });

// Custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

export const activeUsers = new promClient.Gauge({
  name: 'active_users',
  help: 'Number of active users'
});

// Middleware
export const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  customLabels: { app: 'unipdf-studio' }
});

// Expose metrics endpoint
app.use('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

```yaml
# docker-compose.monitoring.yml
version: '3'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```
- **Estimated:** 4 hours

**Task 7.5.4:** Implement logging
```typescript
// server/src/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Usage
logger.info('User logged in', { userId: user.id });
logger.error('Failed to process PDF', { error: error.message, documentId });
```
- **Estimated:** 2 hours

**Task 7.5.5:** Set up backups
```bash
#!/bin/bash
# backup.sh - Run daily at 2 AM

DATE=$(date +%Y%m%d)

# MongoDB backup
mongodump --uri="$MONGODB_URI" --out="/backups/mongodb-$DATE"

# Compress
tar -czf "/backups/mongodb-$DATE.tar.gz" "/backups/mongodb-$DATE"
rm -rf "/backups/mongodb-$DATE"

# Upload to S3
aws s3 cp "/backups/mongodb-$DATE.tar.gz" "s3://unipdf-backups/mongodb/"

# Keep only last 30 days
find /backups -name "mongodb-*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
# Add to crontab
crontab -e
0 2 * * * /home/user/backup.sh
```
- **Estimated:** 3 hours

**Task 7.5.6:** Write documentation
```markdown
# UniPDF Studio Documentation

## Installation

### Prerequisites
- Node.js 18+
- MongoDB 6.0+
- Redis 7.0+

### Environment Variables
```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/unipdf
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-...
FIREBASE_API_KEY=...
```

### Deployment
1. Clone repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Start: `pm2 start server.js`

## API Documentation
[Swagger UI at /api-docs]

## User Guide
- Uploading PDFs
- Editing documents
- Using AI features
- Sharing and collaboration

## Troubleshooting
...
```
- **Estimated:** 6 hours

---

## Definition of Done (DoD)

- [ ] Mobile responsive on all devices
- [ ] 80%+ test coverage
- [ ] Lighthouse score 90+
- [ ] WCAG 2.1 AA compliant
- [ ] Production deployed successfully
- [ ] Monitoring dashboards live
- [ ] Documentation complete
- [ ] SSL certificate installed

---

## Sprint Ceremonies

### Daily Standup (15 min)
**Key Focus:** Test results, performance metrics, deployment progress

### Sprint Review (3 hours)
**Demo:**
- Full application walkthrough
- Performance benchmarks
- Accessibility features
- Monitoring dashboards
- Documentation site

### Sprint Retrospective (2 hours)
**Discuss:**
- What went well across all 7 sprints
- Major challenges overcome
- Lessons learned for future projects
- Celebrate launch! 🎉

---

## Technical Debt & Risks

**Risks:**
1. Deployment issues on production server
2. Performance degradation under load
3. Accessibility edge cases
4. Browser compatibility issues

**Post-Launch Improvements:**
- Add more AI features (translation, OCR improvement)
- Implement mobile apps (React Native)
- Add more cloud integrations (Dropbox, OneDrive)
- Implement advanced analytics
- Add team/enterprise features

---

## Sprint Velocity

**Estimated Story Points:** 42  
**Actual Story Points Completed:** _____  
**Velocity:** _____

---

## Testing Checklist

### Cross-Browser
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Devices
- [ ] iPhone 13 (iOS 16)
- [ ] Samsung Galaxy S21 (Android 12)
- [ ] iPad Pro
- [ ] Desktop 1920x1080

### Performance
- [ ] Lighthouse audit all pages
- [ ] Load test (1000 concurrent users)
- [ ] Stress test (find breaking point)
- [ ] Memory leak test

### Security
- [ ] npm audit passes
- [ ] OWASP ZAP scan clean
- [ ] Penetration testing
- [ ] Data encryption verified

### Accessibility
- [ ] Screen reader test (NVDA, JAWS)
- [ ] Keyboard-only navigation
- [ ] Color contrast verified
- [ ] ARIA labels validated

---

## Launch Checklist

- [ ] Production environment configured
- [ ] SSL certificates installed
- [ ] Domain DNS configured
- [ ] Database backups automated
- [ ] Monitoring alerts set up
- [ ] Error tracking (Sentry) configured
- [ ] Analytics (Google Analytics) installed
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Support email configured
- [ ] Social media accounts created
- [ ] Launch announcement prepared

---

## Post-Launch Monitoring (Week 1)

**Daily checks:**
- [ ] Error rates < 1%
- [ ] Average response time < 500ms
- [ ] Uptime 99.9%+
- [ ] No critical bugs reported
- [ ] User feedback reviewed

**Weekly reviews:**
- Performance metrics
- User growth
- Feature usage analytics
- Cost analysis (cloud, API usage)

---

## Notes

- Keep production environment separate from staging
- Test rollback procedures before launch
- Monitor costs closely (especially OpenAI API usage)
- Collect user feedback immediately
- Be prepared for quick bug fixes post-launch
- Celebrate the team's achievement! 🚀

---

## Total Project Summary

**7 Sprints Completed**
**Estimated Story Points:** ~235 points
**Timeline:** 14 weeks (3.5 months)
**Team Size:** 3-5 developers

### Features Delivered:
✅ Authentication & User Management
✅ PDF Upload & Cloud Storage
✅ PDF Rendering & Viewing
✅ Text Editing & Annotations
✅ Drawing Tools & Image Insertion
✅ AI Summarization & Chat
✅ Smart Text Rewriting
✅ OCR Processing
✅ PDF Merge/Split/Compress
✅ Document Security
✅ Real-time Collaboration
✅ Version History
✅ Cloud Integration (Google Drive)
✅ Production Deployment
✅ Comprehensive Testing

**Project Status:** READY FOR LAUNCH 🎉
