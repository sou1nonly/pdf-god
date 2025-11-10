# Sprint 6: Collaboration & Cloud Integration

**Duration:** 2 weeks  
**Sprint Goal:** Enable document sharing, real-time collaboration, and cloud storage integration

---

## Sprint Planning

### User Stories

#### US-6.1: Document Sharing
**As a** user  
**I want** to share documents with others  
**So that** collaborators can view and edit

**Story Points:** 8  
**Priority:** Critical

**Acceptance Criteria:**
- [ ] Generate shareable link
- [ ] Set access permissions (view, comment, edit)
- [ ] Public/private link options
- [ ] Expiration dates for links
- [ ] Track who accessed document
- [ ] Revoke access anytime

---

#### US-6.2: Real-Time Collaboration
**As a** user  
**I want** to edit documents with others simultaneously  
**So that** we can collaborate in real-time

**Story Points:** 13  
**Priority:** High

**Acceptance Criteria:**
- [ ] See other users' cursors
- [ ] Live edits visible to all users
- [ ] Conflict resolution (last write wins)
- [ ] User presence indicators
- [ ] Lock editing for specific sections
- [ ] 50ms maximum latency

---

#### US-6.3: Comments & Annotations
**As a** user  
**I want** to leave comments on documents  
**So that** I can provide feedback

**Story Points:** 5  
**Priority:** Medium

**Acceptance Criteria:**
- [ ] Add comment to any page location
- [ ] Reply to comments (threaded)
- [ ] Resolve/unresolve comments
- [ ] @mention other users
- [ ] Email notifications for mentions
- [ ] Filter by commenter or status

---

#### US-6.4: Version History
**As a** user  
**I want** to view document version history  
**So that** I can restore previous versions

**Story Points:** 5  
**Priority:** Medium

**Acceptance Criteria:**
- [ ] Automatic version save on major edits
- [ ] View all versions with timestamps
- [ ] Preview any version
- [ ] Restore to previous version
- [ ] Compare two versions (diff)
- [ ] Version labels/descriptions

---

#### US-6.5: Cloud Storage Integration
**As a** user  
**I want** to connect my Google Drive  
**So that** I can import/export documents

**Story Points:** 8  
**Priority:** High

**Acceptance Criteria:**
- [ ] OAuth login for Google Drive
- [ ] Import PDFs from Drive
- [ ] Export PDFs to Drive
- [ ] Sync changes back to Drive
- [ ] Browse Drive folders in-app
- [ ] Two-way sync option

---

## Sprint Backlog (Tasks)

### Document Sharing (US-6.1)

**Task 6.1.1:** Create sharing model
```typescript
// server/src/models/Share.ts
const shareSchema = new mongoose.Schema({
  document: { type: ObjectId, ref: 'Document', required: true },
  owner: { type: ObjectId, ref: 'User', required: true },
  shareToken: { type: String, unique: true, required: true },
  accessLevel: {
    type: String,
    enum: ['view', 'comment', 'edit'],
    default: 'view'
  },
  isPublic: { type: Boolean, default: false },
  expiresAt: { type: Date },
  allowedUsers: [{ type: ObjectId, ref: 'User' }],
  accessLog: [{
    user: { type: ObjectId, ref: 'User' },
    accessedAt: { type: Date, default: Date.now },
    ipAddress: String
  }],
  createdAt: { type: Date, default: Date.now }
});

shareSchema.index({ shareToken: 1 });
shareSchema.index({ document: 1 });
```
- **Estimated:** 2 hours

**Task 6.1.2:** Implement sharing endpoint
```typescript
// server/src/routes/share.routes.ts
import crypto from 'crypto';

router.post('/share/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { accessLevel, isPublic, expiresAt, allowedUsers } = req.body;
    
    const document = await Document.findById(documentId);
    
    if (document.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const shareToken = crypto.randomBytes(16).toString('hex');
    
    const share = await Share.create({
      document: documentId,
      owner: req.user.id,
      shareToken,
      accessLevel,
      isPublic,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      allowedUsers: allowedUsers || []
    });
    
    const shareUrl = `${process.env.APP_URL}/shared/${shareToken}`;
    
    res.json({ share, shareUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Access shared document
router.get('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const share = await Share.findOne({ shareToken: token })
      .populate('document');
    
    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }
    
    // Check expiration
    if (share.expiresAt && new Date() > share.expiresAt) {
      return res.status(403).json({ error: 'Share link expired' });
    }
    
    // Check user access
    if (!share.isPublic) {
      // Verify user is in allowedUsers
      if (!share.allowedUsers.includes(req.user?.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Log access
    share.accessLog.push({
      user: req.user?.id,
      ipAddress: req.ip,
      accessedAt: new Date()
    });
    await share.save();
    
    res.json({
      document: share.document,
      accessLevel: share.accessLevel
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```
- **Estimated:** 4 hours

**Task 6.1.3:** Build sharing UI
```tsx
// client/src/components/share/ShareDialog.tsx
export const ShareDialog = ({ documentId, onClose }) => {
  const [accessLevel, setAccessLevel] = useState<'view' | 'comment' | 'edit'>('view');
  const [isPublic, setIsPublic] = useState(true);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  
  const handleShare = async () => {
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
      : null;
    
    const response = await fetch(`/api/share/${documentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessLevel, isPublic, expiresAt })
    });
    
    const data = await response.json();
    setShareUrl(data.shareUrl);
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="share-dialog">
      <h3>Share Document</h3>
      
      <div className="access-level">
        <label>Access Level:</label>
        <select value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)}>
          <option value="view">View Only</option>
          <option value="comment">Can Comment</option>
          <option value="edit">Can Edit</option>
        </select>
      </div>
      
      <div className="visibility">
        <label>
          <input
            type="radio"
            checked={isPublic}
            onChange={() => setIsPublic(true)}
          />
          Anyone with link
        </label>
        <label>
          <input
            type="radio"
            checked={!isPublic}
            onChange={() => setIsPublic(false)}
          />
          Specific people
        </label>
      </div>
      
      <div className="expiration">
        <label>Expires in:</label>
        <select value={expiresIn || ''} onChange={(e) => setExpiresIn(Number(e.target.value) || null)}>
          <option value="">Never</option>
          <option value="1">1 day</option>
          <option value="7">7 days</option>
          <option value="30">30 days</option>
        </select>
      </div>
      
      <button onClick={handleShare}>Generate Link</button>
      
      {shareUrl && (
        <div className="share-link">
          <input type="text" value={shareUrl} readOnly />
          <button onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
};
```
- **Estimated:** 3 hours

**Task 6.1.4:** Add access log viewer
```tsx
// client/src/components/share/AccessLog.tsx
export const AccessLog = ({ documentId }) => {
  const [accessLog, setAccessLog] = useState([]);
  
  useEffect(() => {
    fetch(`/api/share/${documentId}/access-log`)
      .then(res => res.json())
      .then(data => setAccessLog(data.log));
  }, [documentId]);
  
  return (
    <div className="access-log">
      <h4>Access History</h4>
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Time</th>
            <th>IP Address</th>
          </tr>
        </thead>
        <tbody>
          {accessLog.map((entry, i) => (
            <tr key={i}>
              <td>{entry.user?.email || 'Anonymous'}</td>
              <td>{new Date(entry.accessedAt).toLocaleString()}</td>
              <td>{entry.ipAddress}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```
- **Estimated:** 2 hours

---

### Real-Time Collaboration (US-6.2)

**Task 6.2.1:** Set up WebSocket server
```bash
npm install socket.io
```
```typescript
// server/src/socket.ts
import { Server } from 'socket.io';
import { authenticateSocket } from './middleware/auth';

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL }
  });
  
  io.use(authenticateSocket);
  
  io.on('connection', (socket) => {
    console.log('User connected:', socket.user.id);
    
    socket.on('join-document', async (documentId) => {
      socket.join(documentId);
      
      // Notify others
      socket.to(documentId).emit('user-joined', {
        userId: socket.user.id,
        username: socket.user.name
      });
      
      // Send current users
      const users = await getDocumentUsers(documentId);
      socket.emit('users-in-document', users);
    });
    
    socket.on('edit', ({ documentId, edit }) => {
      // Broadcast to others
      socket.to(documentId).emit('remote-edit', {
        userId: socket.user.id,
        edit
      });
    });
    
    socket.on('cursor-move', ({ documentId, position }) => {
      socket.to(documentId).emit('remote-cursor', {
        userId: socket.user.id,
        position
      });
    });
    
    socket.on('disconnect', () => {
      // Notify others user left
      const rooms = Array.from(socket.rooms);
      rooms.forEach(room => {
        socket.to(room).emit('user-left', {
          userId: socket.user.id
        });
      });
    });
  });
  
  return io;
};
```
- **Estimated:** 4 hours

**Task 6.2.2:** Implement operational transformation (OT)
```typescript
// client/src/utils/operationalTransform.ts
export class OperationalTransform {
  static transform(op1: Operation, op2: Operation): [Operation, Operation] {
    // Transform two concurrent operations
    // Returns [op1', op2'] where applying op1' after op2 
    // has the same effect as applying op2' after op1
    
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position < op2.position) {
        return [op1, { ...op2, position: op2.position + op1.text.length }];
      } else {
        return [{ ...op1, position: op1.position + op2.text.length }, op2];
      }
    }
    
    if (op1.type === 'delete' && op2.type === 'delete') {
      // Handle delete-delete conflicts
      // ...complex logic
    }
    
    // ... handle all operation type combinations
    
    return [op1, op2];
  }
  
  static apply(content: string, operation: Operation): string {
    switch (operation.type) {
      case 'insert':
        return content.slice(0, operation.position) +
               operation.text +
               content.slice(operation.position);
      
      case 'delete':
        return content.slice(0, operation.position) +
               content.slice(operation.position + operation.length);
      
      default:
        return content;
    }
  }
}
```
- **Estimated:** 6 hours

**Task 6.2.3:** Build collaborative editor
```tsx
// client/src/components/collab/CollaborativeEditor.tsx
import { io, Socket } from 'socket.io-client';

export const CollaborativeEditor = ({ documentId }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, Position>>(new Map());
  
  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_WS_URL, {
      auth: { token: localStorage.getItem('token') }
    });
    
    newSocket.emit('join-document', documentId);
    
    newSocket.on('users-in-document', (users) => {
      setUsers(users);
    });
    
    newSocket.on('user-joined', ({ userId, username }) => {
      setUsers(prev => [...prev, { id: userId, name: username }]);
    });
    
    newSocket.on('user-left', ({ userId }) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setRemoteCursors(prev => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });
    
    newSocket.on('remote-edit', ({ userId, edit }) => {
      // Apply remote edit with OT
      const transformed = OperationalTransform.transform(edit, localPendingOps);
      applyEdit(transformed);
    });
    
    newSocket.on('remote-cursor', ({ userId, position }) => {
      setRemoteCursors(prev => new Map(prev).set(userId, position));
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, [documentId]);
  
  const handleEdit = (edit: Operation) => {
    // Apply locally
    applyEdit(edit);
    
    // Send to server
    socket?.emit('edit', { documentId, edit });
  };
  
  const handleCursorMove = (position: Position) => {
    socket?.emit('cursor-move', { documentId, position });
  };
  
  return (
    <div className="collaborative-editor">
      <div className="active-users">
        {users.map(user => (
          <div key={user.id} className="user-badge">
            {user.name}
          </div>
        ))}
      </div>
      
      <div className="editor-container">
        {/* Render remote cursors */}
        {Array.from(remoteCursors.entries()).map(([userId, position]) => (
          <RemoteCursor
            key={userId}
            userId={userId}
            position={position}
            color={getUserColor(userId)}
          />
        ))}
        
        {/* Main editor */}
        <Editor
          onEdit={handleEdit}
          onCursorMove={handleCursorMove}
        />
      </div>
    </div>
  );
};
```
- **Estimated:** 6 hours

**Task 6.2.4:** Add cursor rendering
```tsx
// client/src/components/collab/RemoteCursor.tsx
export const RemoteCursor = ({ userId, position, color }) => {
  return (
    <div
      className="remote-cursor"
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        borderLeft: `2px solid ${color}`
      }}
    >
      <div
        className="cursor-label"
        style={{ backgroundColor: color }}
      >
        {getUserName(userId)}
      </div>
    </div>
  );
};

const getUserColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  
  const hash = userId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  return colors[hash % colors.length];
};
```
- **Estimated:** 2 hours

---

### Comments & Annotations (US-6.3)

**Task 6.3.1:** Create comment model
```typescript
// server/src/models/Comment.ts
const commentSchema = new mongoose.Schema({
  document: { type: ObjectId, ref: 'Document', required: true },
  page: { type: Number, required: true },
  position: {
    x: Number,
    y: Number
  },
  content: { type: String, required: true },
  author: { type: ObjectId, ref: 'User', required: true },
  parentComment: { type: ObjectId, ref: 'Comment' }, // For replies
  mentions: [{ type: ObjectId, ref: 'User' }],
  status: {
    type: String,
    enum: ['open', 'resolved'],
    default: 'open'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

commentSchema.index({ document: 1, page: 1 });
```
- **Estimated:** 1 hour

**Task 6.3.2:** Implement comment endpoints
```typescript
// server/src/routes/comment.routes.ts
router.post('/comment/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { page, position, content, parentComment } = req.body;
    
    // Extract mentions (@username)
    const mentionRegex = /@(\w+)/g;
    const mentionedUsernames = [...content.matchAll(mentionRegex)]
      .map(match => match[1]);
    
    const mentionedUsers = await User.find({
      username: { $in: mentionedUsernames }
    });
    
    const comment = await Comment.create({
      document: documentId,
      page,
      position,
      content,
      author: req.user.id,
      parentComment,
      mentions: mentionedUsers.map(u => u._id)
    });
    
    // Send email notifications
    for (const user of mentionedUsers) {
      await sendMentionNotification(user.email, comment);
    }
    
    res.json({ comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/comment/:commentId/resolve', authenticateToken, async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(
    req.params.commentId,
    { status: 'resolved', updatedAt: new Date() },
    { new: true }
  );
  res.json({ comment });
});
```
- **Estimated:** 3 hours

**Task 6.3.3:** Build comment UI
```tsx
// client/src/components/comments/CommentPanel.tsx
export const CommentPanel = ({ documentId, page }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  
  useEffect(() => {
    fetch(`/api/comment/${documentId}?page=${page}`)
      .then(res => res.json())
      .then(data => setComments(data.comments));
  }, [documentId, page]);
  
  const handleSubmit = async () => {
    const response = await fetch(`/api/comment/${documentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page,
        content: newComment,
        parentComment: replyTo
      })
    });
    
    const data = await response.json();
    setComments([...comments, data.comment]);
    setNewComment('');
    setReplyTo(null);
  };
  
  const handleResolve = async (commentId: string) => {
    await fetch(`/api/comment/${commentId}/resolve`, { method: 'PATCH' });
    setComments(comments.map(c =>
      c.id === commentId ? { ...c, status: 'resolved' } : c
    ));
  };
  
  return (
    <div className="comment-panel">
      <h3>Comments</h3>
      
      <div className="comment-list">
        {comments.filter(c => !c.parentComment).map(comment => (
          <CommentThread
            key={comment.id}
            comment={comment}
            replies={comments.filter(c => c.parentComment === comment.id)}
            onReply={() => setReplyTo(comment.id)}
            onResolve={() => handleResolve(comment.id)}
          />
        ))}
      </div>
      
      <div className="comment-input">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={replyTo ? 'Write a reply...' : 'Add a comment...'}
        />
        <button onClick={handleSubmit}>
          {replyTo ? 'Reply' : 'Comment'}
        </button>
        {replyTo && (
          <button onClick={() => setReplyTo(null)}>Cancel</button>
        )}
      </div>
    </div>
  );
};
```
- **Estimated:** 4 hours

---

### Version History (US-6.4)

**Task 6.4.1:** Create version model
```typescript
// server/src/models/Version.ts
const versionSchema = new mongoose.Schema({
  document: { type: ObjectId, ref: 'Document', required: true },
  versionNumber: { type: Number, required: true },
  fileUrl: { type: String, required: true },
  label: String,
  description: String,
  author: { type: ObjectId, ref: 'User' },
  changes: [{
    type: { type: String }, // e.g., 'text_edit', 'annotation_added'
    details: String
  }],
  createdAt: { type: Date, default: Date.now }
});

versionSchema.index({ document: 1, versionNumber: -1 });
```
- **Estimated:** 1 hour

**Task 6.4.2:** Implement version saving
```typescript
// server/src/services/versionService.ts
export const createVersion = async (
  documentId: string,
  fileBuffer: Buffer,
  userId: string,
  label?: string,
  description?: string
) => {
  const document = await Document.findById(documentId);
  const lastVersion = await Version.findOne({ document: documentId })
    .sort({ versionNumber: -1 });
  
  const versionNumber = (lastVersion?.versionNumber || 0) + 1;
  
  // Upload to storage
  const fileUrl = await uploadToFirebase(
    fileBuffer,
    `versions/${documentId}/v${versionNumber}.pdf`
  );
  
  const version = await Version.create({
    document: documentId,
    versionNumber,
    fileUrl,
    label,
    description,
    author: userId
  });
  
  return version;
};
```
- **Estimated:** 3 hours

**Task 6.4.3:** Build version history UI
```tsx
// client/src/components/versions/VersionHistory.tsx
export const VersionHistory = ({ documentId }) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [previewVersion, setPreviewVersion] = useState<Version | null>(null);
  
  useEffect(() => {
    fetch(`/api/versions/${documentId}`)
      .then(res => res.json())
      .then(data => setVersions(data.versions));
  }, [documentId]);
  
  const handleRestore = async (versionId: string) => {
    if (confirm('Restore this version? Current version will be saved.')) {
      await fetch(`/api/versions/${versionId}/restore`, { method: 'POST' });
      window.location.reload();
    }
  };
  
  return (
    <div className="version-history">
      <h3>Version History</h3>
      
      <div className="version-list">
        {versions.map(version => (
          <div key={version.id} className="version-item">
            <div className="version-info">
              <strong>v{version.versionNumber}</strong>
              {version.label && <span className="label">{version.label}</span>}
              <p>{version.description}</p>
              <small>
                By {version.author.name} on {new Date(version.createdAt).toLocaleString()}
              </small>
            </div>
            <div className="version-actions">
              <button onClick={() => setPreviewVersion(version)}>
                Preview
              </button>
              <button onClick={() => handleRestore(version.id)}>
                Restore
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {previewVersion && (
        <VersionPreview
          version={previewVersion}
          onClose={() => setPreviewVersion(null)}
        />
      )}
    </div>
  );
};
```
- **Estimated:** 3 hours

---

### Cloud Storage Integration (US-6.5)

**Task 6.5.1:** Set up Google Drive OAuth
```bash
npm install googleapis
```
```typescript
// server/src/config/googleDrive.config.ts
import { google } from 'googleapis';

export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export const getAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly'
    ]
  });
};
```
- **Estimated:** 2 hours

**Task 6.5.2:** Implement Drive import/export
```typescript
// server/src/services/googleDriveService.ts
export const importFromDrive = async (
  fileId: string,
  accessToken: string
) => {
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  
  return Buffer.from(response.data);
};

export const exportToDrive = async (
  fileBuffer: Buffer,
  fileName: string,
  accessToken: string,
  folderId?: string
) => {
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: folderId ? [folderId] : undefined
    },
    media: {
      mimeType: 'application/pdf',
      body: Readable.from(fileBuffer)
    }
  });
  
  return response.data;
};
```
- **Estimated:** 4 hours

**Task 6.5.3:** Build Drive integration UI
```tsx
// client/src/components/integrations/GoogleDrivePanel.tsx
export const GoogleDrivePanel = () => {
  const [connected, setConnected] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  
  const handleConnect = () => {
    window.location.href = '/api/auth/google-drive';
  };
  
  const handleImport = async (fileId: string) => {
    const response = await fetch(`/api/drive/import/${fileId}`, {
      method: 'POST'
    });
    const data = await response.json();
    // Document now imported
    navigate(`/editor/${data.documentId}`);
  };
  
  return (
    <div className="drive-panel">
      <h3>Google Drive</h3>
      
      {!connected ? (
        <button onClick={handleConnect}>
          Connect Google Drive
        </button>
      ) : (
        <div className="drive-files">
          <h4>Your Drive Files</h4>
          {files.map(file => (
            <div key={file.id} className="drive-file">
              <span>{file.name}</span>
              <button onClick={() => handleImport(file.id)}>
                Import
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```
- **Estimated:** 3 hours

---

## Definition of Done (DoD)

- [ ] Sharing links work
- [ ] Real-time collaboration tested with 5+ users
- [ ] Comments persist correctly
- [ ] Version history accessible
- [ ] Google Drive import/export functional
- [ ] Latency < 100ms for collaboration
- [ ] Email notifications sent for mentions
- [ ] Access logs tracked

---

## Sprint Ceremonies

### Daily Standup (15 min)
**Key Focus:** WebSocket stability, OT algorithm, Google API integration

### Sprint Review (2 hours)
**Demo:**
- Share document with link
- Collaborate in real-time
- Add comments with mentions
- View version history
- Restore previous version
- Import from Google Drive
- Export to Google Drive

### Sprint Retrospective (1.5 hours)
**Discuss:**
- Real-time collaboration challenges
- Conflict resolution strategies
- Cloud integration user experience

---

## Technical Debt & Risks

**Risks:**
1. WebSocket connection stability
2. OT algorithm complexity and bugs
3. Google API rate limits
4. Concurrent edit conflicts

**Technical Debt:**
- Implement CRDT instead of OT for better conflict resolution
- Add presence indicators (typing, viewing)
- Implement document locking for sections
- Add Dropbox/OneDrive integration

---

## Sprint Velocity

**Estimated Story Points:** 39  
**Actual Story Points Completed:** _____  
**Velocity:** _____

---

## Testing Checklist

- [ ] Share link with view permission
- [ ] Share link with edit permission
- [ ] Expired link access denied
- [ ] 5 users edit simultaneously
- [ ] Cursor positions visible
- [ ] Conflict resolution correct
- [ ] Add comment and reply
- [ ] @mention sends email
- [ ] Resolve/unresolve comment
- [ ] Create new version
- [ ] Restore old version
- [ ] Compare two versions
- [ ] Connect Google Drive
- [ ] Import PDF from Drive
- [ ] Export PDF to Drive

---

## Notes

- Socket.io provides reliable WebSocket connections with fallbacks
- Operational Transformation is complex—consider using libraries like ShareDB
- Google Drive API has quotas—cache file lists
- Version history could grow large—implement pagination
- Test collaboration with poor network conditions
