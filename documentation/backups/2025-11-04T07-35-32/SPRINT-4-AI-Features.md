# Sprint 4: AI-Powered Features

**Duration:** 2 weeks  
**Sprint Goal:** Integrate OpenAI GPT-4 for document summarization, conversational chat, and intelligent text rewriting

---

## Sprint Planning

### User Stories

#### US-4.1: Document Summarization
**As a** user  
**I want** AI-generated summaries of my PDFs  
**So that** I can quickly understand document content

**Story Points:** 8  
**Priority:** High

**Acceptance Criteria:**
- [ ] One-click summarization button
- [ ] Summary length options (brief, detailed, custom)
- [ ] Highlights key points
- [ ] Works for documents up to 50 pages
- [ ] Summary displays in sidebar
- [ ] Export summary as text

---

#### US-4.2: Conversational PDF Chat
**As a** user  
**I want** to ask questions about my PDF  
**So that** I can find information quickly

**Story Points:** 13  
**Priority:** Critical

**Acceptance Criteria:**
- [ ] Chat interface beside PDF viewer
- [ ] Natural language questions accepted
- [ ] Responses cite page numbers
- [ ] Chat history persists
- [ ] Handles follow-up questions with context
- [ ] Works with multi-page documents

---

#### US-4.3: Smart Text Rewrite
**As a** user  
**I want** AI to rewrite selected text  
**So that** I can improve clarity and tone

**Story Points:** 5  
**Priority:** Medium

**Acceptance Criteria:**
- [ ] Select text and click "Rewrite"
- [ ] Tone options (formal, casual, concise, detailed)
- [ ] Multiple suggestions provided
- [ ] Preview before applying
- [ ] One-click replacement
- [ ] Undo rewrite option

---

#### US-4.4: AI Usage Quotas & Billing
**As a** system administrator  
**I want** to track and limit AI API usage  
**So that** costs remain controlled

**Story Points:** 5  
**Priority:** High

**Acceptance Criteria:**
- [ ] Track tokens used per user
- [ ] Set monthly quotas
- [ ] Display remaining quota to user
- [ ] Billing integration for premium users
- [ ] Rate limiting (max 10 requests/min)
- [ ] Usage analytics dashboard

---

#### US-4.5: Content Extraction & Structuring
**As a** user  
**I want** AI to extract structured data from PDFs  
**So that** I can use data in other applications

**Story Points:** 5  
**Priority:** Low

**Acceptance Criteria:**
- [ ] Extract tables to CSV
- [ ] Extract contact information
- [ ] Extract dates and events
- [ ] Extract key terms and definitions
- [ ] Export to JSON format
- [ ] Works with scanned documents (after OCR)

---

## Sprint Backlog (Tasks)

### Document Summarization (US-4.1)

**Task 4.1.1:** Set up OpenAI API integration
```typescript
// server/src/config/openai.config.ts
import OpenAI from 'openai';

export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const MODELS = {
  GPT4: 'gpt-4-turbo-preview',
  GPT35: 'gpt-3.5-turbo'
};
```
```bash
npm install openai
```
- **Estimated:** 2 hours

**Task 4.1.2:** Create text extraction service
```typescript
// server/src/services/textExtractionService.ts
import { PDFDocument } from 'pdf-lib';
import pdf from 'pdf-parse';

export const extractFullText = async (pdfBuffer: Buffer): Promise<string> => {
  const data = await pdf(pdfBuffer);
  return data.text;
};

export const extractPageRange = async (
  pdfBuffer: Buffer,
  startPage: number,
  endPage: number
): Promise<string> => {
  const data = await pdf(pdfBuffer, {
    pagerender: (pageData) => {
      if (pageData.pageIndex >= startPage && pageData.pageIndex <= endPage) {
        return pageData.getTextContent();
      }
    }
  });
  return data.text;
};
```
- **Estimated:** 3 hours

**Task 4.1.3:** Implement summarization endpoint
```typescript
// server/src/services/aiService.ts
export const summarizeDocument = async (
  text: string,
  length: 'brief' | 'detailed' | 'custom',
  customLength?: number
): Promise<string> => {
  const wordCounts = {
    brief: 150,
    detailed: 500,
    custom: customLength || 300
  };
  
  const prompt = `Summarize the following document in approximately ${wordCounts[length]} words. 
  Focus on key points, main arguments, and important conclusions.\n\nDocument:\n${text}`;
  
  const response = await openaiClient.chat.completions.create({
    model: MODELS.GPT4,
    messages: [
      { role: 'system', content: 'You are a document summarization assistant.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: Math.ceil(wordCounts[length] * 1.5),
    temperature: 0.5
  });
  
  return response.choices[0].message.content;
};
```

```typescript
// server/src/routes/ai.routes.ts
router.post('/summarize/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { length = 'brief', customLength } = req.body;
    
    const document = await Document.findById(documentId);
    const pdfBuffer = await getDocumentBuffer(document.fileUrl);
    const text = await extractFullText(pdfBuffer);
    
    const summary = await summarizeDocument(text, length, customLength);
    
    // Save summary
    await Summary.create({
      document: documentId,
      user: req.user.id,
      content: summary,
      length,
      createdAt: new Date()
    });
    
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```
- **Estimated:** 4 hours

**Task 4.1.4:** Create summarization UI component
```tsx
// client/src/components/ai/SummarizationPanel.tsx
export const SummarizationPanel = ({ documentId }) => {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [length, setLength] = useState<'brief' | 'detailed'>('brief');
  
  const handleSummarize = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ai/summarize/${documentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ length })
      });
      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="summarization-panel">
      <h3>Document Summary</h3>
      
      <div className="controls">
        <select value={length} onChange={(e) => setLength(e.target.value)}>
          <option value="brief">Brief (150 words)</option>
          <option value="detailed">Detailed (500 words)</option>
        </select>
        
        <button onClick={handleSummarize} disabled={loading}>
          {loading ? 'Generating...' : 'Summarize'}
        </button>
      </div>
      
      {summary && (
        <div className="summary-content">
          <p>{summary}</p>
          <button onClick={() => navigator.clipboard.writeText(summary)}>
            Copy
          </button>
        </div>
      )}
    </div>
  );
};
```
- **Estimated:** 3 hours

**Task 4.1.5:** Add export summary functionality
```tsx
const exportSummary = () => {
  const blob = new Blob([summary], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `summary-${documentId}.txt`;
  a.click();
};
```
- **Estimated:** 1 hour

---

### Conversational PDF Chat (US-4.2)

**Task 4.2.1:** Design chat interface
```tsx
// client/src/components/ai/ChatPanel.tsx
export const ChatPanel = ({ documentId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>Ask about this document</h3>
      </div>
      
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="avatar">
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="content">
              <p>{msg.content}</p>
              {msg.pageReferences && (
                <div className="references">
                  Referenced: {msg.pageReferences.join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
};
```
- **Estimated:** 4 hours

**Task 4.2.2:** Implement vector embeddings for semantic search
```bash
npm install @pinecone-database/pinecone
```
```typescript
// server/src/services/embeddingService.ts
import { Pinecone } from '@pinecone-database/pinecone';
import { openaiClient } from '../config/openai.config';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

export const createDocumentEmbeddings = async (
  documentId: string,
  text: string
) => {
  // Split text into chunks (500 words each)
  const chunks = splitIntoChunks(text, 500);
  
  const index = pinecone.Index('pdf-documents');
  
  for (let i = 0; i < chunks.length; i++) {
    // Create embedding
    const embedding = await openaiClient.embeddings.create({
      model: 'text-embedding-ada-002',
      input: chunks[i]
    });
    
    // Store in Pinecone
    await index.upsert([{
      id: `${documentId}-chunk-${i}`,
      values: embedding.data[0].embedding,
      metadata: {
        documentId,
        chunkIndex: i,
        text: chunks[i],
        pageNumber: Math.floor(i / 2) + 1 // Rough estimate
      }
    }]);
  }
};

const splitIntoChunks = (text: string, wordsPerChunk: number): string[] => {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
  }
  
  return chunks;
};
```
- **Estimated:** 5 hours

**Task 4.2.3:** Create chat endpoint with context
```typescript
// server/src/routes/ai.routes.ts
router.post('/chat/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { message, conversationHistory = [] } = req.body;
    
    // Create embedding for user question
    const questionEmbedding = await openaiClient.embeddings.create({
      model: 'text-embedding-ada-002',
      input: message
    });
    
    // Find relevant chunks
    const index = pinecone.Index('pdf-documents');
    const queryResponse = await index.query({
      vector: questionEmbedding.data[0].embedding,
      topK: 3,
      filter: { documentId },
      includeMetadata: true
    });
    
    // Build context from relevant chunks
    const context = queryResponse.matches
      .map(match => match.metadata.text)
      .join('\n\n');
    
    const pageReferences = [...new Set(
      queryResponse.matches.map(match => `Page ${match.metadata.pageNumber}`)
    )];
    
    // Generate response with GPT-4
    const response = await openaiClient.chat.completions.create({
      model: MODELS.GPT4,
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant answering questions about a PDF document. 
          Use the following context to answer questions. If the answer is not in the context, 
          say so. Always cite page numbers when providing information.\n\nContext:\n${context}`
        },
        ...conversationHistory,
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    const answer = response.choices[0].message.content;
    
    // Save to chat history
    await ChatMessage.create({
      document: documentId,
      user: req.user.id,
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    await ChatMessage.create({
      document: documentId,
      user: req.user.id,
      role: 'assistant',
      content: answer,
      pageReferences,
      timestamp: new Date()
    });
    
    res.json({ answer, pageReferences });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```
- **Estimated:** 6 hours

**Task 4.2.4:** Implement chat history persistence
```typescript
// server/src/models/ChatMessage.ts
const chatMessageSchema = new mongoose.Schema({
  document: { type: ObjectId, ref: 'Document', required: true },
  user: { type: ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  pageReferences: [String],
  timestamp: { type: Date, default: Date.now }
});

chatMessageSchema.index({ document: 1, user: 1, timestamp: -1 });
```

```tsx
// Load history on component mount
useEffect(() => {
  const loadHistory = async () => {
    const response = await fetch(`/api/ai/chat/${documentId}/history`);
    const data = await response.json();
    setMessages(data.messages);
  };
  loadHistory();
}, [documentId]);
```
- **Estimated:** 3 hours

**Task 4.2.5:** Add "jump to page" on citation click
```tsx
const handleCitationClick = (pageNumber: number) => {
  // Emit event to PDF viewer to jump to page
  window.dispatchEvent(new CustomEvent('jumpToPage', {
    detail: { page: pageNumber }
  }));
};

// In messages
{msg.pageReferences?.map(ref => (
  <span
    key={ref}
    className="page-reference"
    onClick={() => handleCitationClick(parseInt(ref.match(/\d+/)[0]))}
  >
    {ref}
  </span>
))}
```
- **Estimated:** 2 hours

---

### Smart Text Rewrite (US-4.3)

**Task 4.3.1:** Create rewrite service
```typescript
// server/src/services/aiService.ts
export const rewriteText = async (
  text: string,
  tone: 'formal' | 'casual' | 'concise' | 'detailed',
  numSuggestions: number = 3
): Promise<string[]> => {
  const toneInstructions = {
    formal: 'Rewrite in a formal, professional tone suitable for business documents.',
    casual: 'Rewrite in a casual, conversational tone.',
    concise: 'Rewrite to be more concise and to-the-point.',
    detailed: 'Rewrite with more detail and explanation.'
  };
  
  const promises = Array(numSuggestions).fill(null).map(async () => {
    const response = await openaiClient.chat.completions.create({
      model: MODELS.GPT35,
      messages: [
        {
          role: 'system',
          content: `${toneInstructions[tone]} Maintain the original meaning.`
        },
        { role: 'user', content: `Rewrite this text:\n\n${text}` }
      ],
      temperature: 0.8,
      max_tokens: text.length * 2
    });
    
    return response.choices[0].message.content;
  });
  
  return await Promise.all(promises);
};
```
- **Estimated:** 3 hours

**Task 4.3.2:** Add rewrite UI
```tsx
// client/src/components/ai/RewritePopover.tsx
export const RewritePopover = ({ selectedText, onApply }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [tone, setTone] = useState<string>('formal');
  const [loading, setLoading] = useState(false);
  
  const handleRewrite = async () => {
    setLoading(true);
    const response = await fetch('/api/ai/rewrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: selectedText, tone })
    });
    const data = await response.json();
    setSuggestions(data.suggestions);
    setLoading(false);
  };
  
  return (
    <div className="rewrite-popover">
      <div className="tone-selector">
        <button onClick={() => setTone('formal')}>Formal</button>
        <button onClick={() => setTone('casual')}>Casual</button>
        <button onClick={() => setTone('concise')}>Concise</button>
        <button onClick={() => setTone('detailed')}>Detailed</button>
      </div>
      
      <button onClick={handleRewrite} disabled={loading}>
        Generate Rewrites
      </button>
      
      {suggestions.map((suggestion, i) => (
        <div key={i} className="suggestion">
          <p>{suggestion}</p>
          <button onClick={() => onApply(suggestion)}>Use This</button>
        </div>
      ))}
    </div>
  );
};
```
- **Estimated:** 3 hours

---

### AI Usage Quotas (US-4.4)

**Task 4.4.1:** Implement usage tracking
```typescript
// server/src/models/AIUsage.ts
const aiUsageSchema = new mongoose.Schema({
  user: { type: ObjectId, ref: 'User', required: true },
  service: { type: String, enum: ['summarize', 'chat', 'rewrite'], required: true },
  tokensUsed: { type: Number, required: true },
  cost: { type: Number, required: true }, // in USD
  timestamp: { type: Date, default: Date.now }
});

aiUsageSchema.index({ user: 1, timestamp: -1 });

// Middleware to track usage
export const trackAIUsage = async (
  userId: string,
  service: string,
  response: any
) => {
  const tokensUsed = response.usage.total_tokens;
  const cost = calculateCost(response.model, tokensUsed);
  
  await AIUsage.create({
    user: userId,
    service,
    tokensUsed,
    cost
  });
};

const calculateCost = (model: string, tokens: number): number => {
  const rates = {
    'gpt-4-turbo-preview': { input: 0.01 / 1000, output: 0.03 / 1000 },
    'gpt-3.5-turbo': { input: 0.0005 / 1000, output: 0.0015 / 1000 }
  };
  
  // Simplified calculation (assumes 50/50 input/output)
  const rate = rates[model];
  return (tokens / 2) * (rate.input + rate.output);
};
```
- **Estimated:** 3 hours

**Task 4.4.2:** Add quota checking middleware
```typescript
// server/src/middleware/checkQuota.ts
export const checkAIQuota = async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId);
  
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  
  const usage = await AIUsage.aggregate([
    {
      $match: {
        user: userId,
        timestamp: { $gte: thisMonth }
      }
    },
    {
      $group: {
        _id: null,
        totalTokens: { $sum: '$tokensUsed' },
        totalCost: { $sum: '$cost' }
      }
    }
  ]);
  
  const monthlyLimit = user.plan === 'premium' ? 1000000 : 100000; // tokens
  
  if (usage[0]?.totalTokens >= monthlyLimit) {
    return res.status(429).json({
      error: 'Monthly AI quota exceeded',
      usage: usage[0],
      limit: monthlyLimit
    });
  }
  
  req.remainingQuota = monthlyLimit - (usage[0]?.totalTokens || 0);
  next();
};

// Apply to AI routes
router.post('/summarize/:documentId', authenticateToken, checkAIQuota, ...);
router.post('/chat/:documentId', authenticateToken, checkAIQuota, ...);
```
- **Estimated:** 2 hours

**Task 4.4.3:** Create usage dashboard
```tsx
// client/src/components/ai/UsageDashboard.tsx
export const UsageDashboard = () => {
  const [usage, setUsage] = useState(null);
  
  useEffect(() => {
    fetch('/api/ai/usage')
      .then(res => res.json())
      .then(data => setUsage(data));
  }, []);
  
  if (!usage) return <div>Loading...</div>;
  
  const percentUsed = (usage.totalTokens / usage.limit) * 100;
  
  return (
    <div className="usage-dashboard">
      <h3>AI Usage This Month</h3>
      
      <div className="usage-bar">
        <div
          className="usage-fill"
          style={{ width: `${percentUsed}%` }}
        />
      </div>
      
      <p>{usage.totalTokens.toLocaleString()} / {usage.limit.toLocaleString()} tokens</p>
      <p>Cost: ${usage.totalCost.toFixed(2)}</p>
      
      <div className="breakdown">
        <h4>By Service</h4>
        <ul>
          <li>Summarization: {usage.byService.summarize} tokens</li>
          <li>Chat: {usage.byService.chat} tokens</li>
          <li>Rewrite: {usage.byService.rewrite} tokens</li>
        </ul>
      </div>
    </div>
  );
};
```
- **Estimated:** 3 hours

---

### Content Extraction (US-4.5)

**Task 4.5.1:** Implement table extraction
```typescript
// server/src/services/aiService.ts
export const extractTables = async (pdfBuffer: Buffer): Promise<any[]> => {
  const text = await extractFullText(pdfBuffer);
  
  const response = await openaiClient.chat.completions.create({
    model: MODELS.GPT4,
    messages: [
      {
        role: 'system',
        content: 'Extract all tables from the document and return them in JSON format.'
      },
      { role: 'user', content: text }
    ],
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content).tables;
};

// Export to CSV
export const tablesToCSV = (tables: any[]): string => {
  return tables.map(table => {
    return table.rows.map(row => row.join(',')).join('\n');
  }).join('\n\n');
};
```
- **Estimated:** 4 hours

**Task 4.5.2:** Add structured data extraction
```typescript
export const extractStructuredData = async (text: string) => {
  const response = await openaiClient.chat.completions.create({
    model: MODELS.GPT4,
    messages: [
      {
        role: 'system',
        content: `Extract structured information from the document including:
        - Contact information (emails, phone numbers, addresses)
        - Dates and events
        - Key terms and definitions
        Return as JSON.`
      },
      { role: 'user', content: text }
    ],
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content);
};
```
- **Estimated:** 3 hours

---

## Definition of Done (DoD)

- [ ] All AI features functional
- [ ] Quota system prevents overuse
- [ ] Chat provides relevant answers
- [ ] Summaries are accurate
- [ ] Usage tracking persists correctly
- [ ] Error handling for API failures
- [ ] Performance tested (response times < 10s)
- [ ] Cost monitoring dashboard live

---

## Sprint Ceremonies

### Daily Standup (15 min)
**Key Focus:** OpenAI API integration, vector database setup, quota implementation

### Sprint Review (2 hours)
**Demo:**
- Generate document summary
- Ask questions via chat interface
- Show page citations
- Rewrite text in different tones
- View usage dashboard
- Extract tables to CSV

### Sprint Retrospective (1.5 hours)
**Discuss:**
- API cost optimization strategies
- Response quality and accuracy
- User experience of AI features

---

## Technical Debt & Risks

**Risks:**
1. OpenAI API costs could escalate quickly
2. Response latency (GPT-4 can be slow)
3. Context window limitations (large documents)
4. Embedding generation time for large PDFs

**Technical Debt:**
- Implement caching for repeated questions
- Add streaming responses for better UX
- Optimize chunk sizes for embeddings
- Add fallback to GPT-3.5 for cost savings
- Implement retry logic for API failures

---

## Sprint Velocity

**Estimated Story Points:** 36  
**Actual Story Points Completed:** _____  
**Velocity:** _____

---

## Testing Checklist

- [ ] Summarize 10-page document
- [ ] Summarize 50-page document
- [ ] Ask 10 different questions via chat
- [ ] Verify page citations are accurate
- [ ] Test follow-up questions with context
- [ ] Rewrite text in all 4 tones
- [ ] Verify quota limits are enforced
- [ ] Test with quota exceeded scenario
- [ ] Extract tables from complex PDF
- [ ] Extract contact information accurately
- [ ] Check usage dashboard calculations
- [ ] Test concurrent AI requests

---

## Notes

- Use Pinecone free tier (allows 100K vectors)
- Monitor OpenAI costs daily during sprint
- Consider response caching with Redis
- GPT-4 recommended for accuracy, GPT-3.5 for speed
- Test embeddings quality with various document types
