/**
 * UniPDF Studio - Backend API Server
 * Main Express Application Entry Point
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { errorMiddleware, notFoundMiddleware } from './middleware';

// Import module routers
import {
    authRouter,
    documentsRouter,
    annotationsRouter,
    storageRouter,
    aiRouter,
    convertRouter,
} from './modules';

/**
 * Create and configure Express application
 */
const createApp = (): Application => {
    const app = express();

    // ==========================================================================
    // Security Middleware
    // ==========================================================================

    // Helmet for security headers
    app.use(helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        contentSecurityPolicy: false, // Disable for API
    }));

    // CORS configuration
    app.use(cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, curl, etc.)
            if (!origin) {
                callback(null, true);
                return;
            }

            if (env.cors.origins.includes(origin)) {
                callback(null, true);
            } else if (env.isDev) {
                // Allow all origins in development
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['Content-Disposition'],
    }));

    // Rate limiting
    const limiter = rateLimit({
        windowMs: env.rateLimit.windowMs,
        max: env.rateLimit.maxRequests,
        message: {
            success: false,
            error: {
                code: 'RATE_LIMITED',
                message: 'Too many requests, please try again later',
            },
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use('/api/', limiter);

    // ==========================================================================
    // Request Parsing
    // ==========================================================================

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // ==========================================================================
    // Logging
    // ==========================================================================

    if (env.isDev) {
        app.use(morgan('dev'));
    } else {
        app.use(morgan('combined'));
    }

    // ==========================================================================
    // Health Check
    // ==========================================================================

    app.get('/health', (req, res) => {
        res.json({
            success: true,
            data: {
                status: 'ok',
                timestamp: new Date().toISOString(),
                environment: env.nodeEnv,
                version: '1.0.0',
            },
        });
    });

    // ==========================================================================
    // API Routes
    // ==========================================================================

    // Auth routes
    app.use('/api/auth', authRouter);

    // Document routes
    app.use('/api/documents', documentsRouter);

    // Annotations routes (nested under documents)
    app.use('/api/documents/:documentId/annotations', annotationsRouter);

    // Storage routes
    app.use('/api/storage', storageRouter);

    // AI routes
    app.use('/api/ai', aiRouter);

    // Convert routes
    app.use('/api/convert', convertRouter);

    // API info endpoint
    app.get('/api', (req, res) => {
        res.json({
            success: true,
            data: {
                message: 'UniPDF Studio API',
                version: '1.0.0',
                endpoints: {
                    auth: '/api/auth',
                    documents: '/api/documents',
                    annotations: '/api/documents/:id/annotations',
                    storage: '/api/storage',
                    ai: '/api/ai',
                    convert: '/api/convert',
                },
            },
        });
    });

    // ==========================================================================
    // Error Handling
    // ==========================================================================

    // 404 handler
    app.use(notFoundMiddleware);

    // Global error handler
    app.use(errorMiddleware);

    return app;
};

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
    const app = createApp();

    app.listen(env.port, () => {
        console.log('');
        console.log('🚀 UniPDF Studio Backend API');
        console.log('============================');
        console.log(`📍 Server:      http://localhost:${env.port}`);
        console.log(`🔧 Environment: ${env.nodeEnv}`);
        console.log(`❤️  Health:      http://localhost:${env.port}/health`);
        console.log(`📚 API:         http://localhost:${env.port}/api`);
        console.log('');
        console.log('📋 Available Routes:');
        console.log('   POST /api/auth/google');
        console.log('   POST /api/auth/anonymous');
        console.log('   POST /api/auth/logout');
        console.log('   GET  /api/auth/me');
        console.log('   GET  /api/documents');
        console.log('   POST /api/documents');
        console.log('   GET  /api/documents/:id');
        console.log('   PATCH /api/documents/:id');
        console.log('   DELETE /api/documents/:id');
        console.log('   GET  /api/documents/:id/annotations');
        console.log('   POST /api/documents/:id/annotations');
        console.log('   POST /api/storage/upload');
        console.log('   POST /api/ai/chat');
        console.log('   POST /api/ai/summarize');
        console.log('   POST /api/ai/rewrite');
        console.log('   POST /api/ai/questions');
        console.log('   POST /api/convert/image');
        console.log('');
    });
};

// Start server
startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

export { createApp };
