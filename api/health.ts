import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '2.1.0',
        },
    });
}
