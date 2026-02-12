import { VercelRequest, VercelResponse } from '@vercel/node';
import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { typstSource } = req.body;

        if (!typstSource || typeof typstSource !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid typstSource' });
        }

        // Create a compiler instance (no workspace needed — we use mainFileContent)
        const compiler = NodeCompiler.create();

        // compiler.pdf() accepts CompileDocArgs directly and returns a Buffer
        // This skips the intermediate compile() step
        const pdfBuffer = compiler.pdf({ mainFileContent: typstSource });

        // Return PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
        res.send(pdfBuffer);

    } catch (error: any) {
        console.error('Typst compilation error:', error);
        res.status(500).json({
            error: 'Compilation failed',
            details: error.message,
        });
    }
}
