import puppeteer from "puppeteer-core";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUTPUT_IMAGE = "d:\\project management tool\\docs\\screenshots\\rendered_mermaid_proof.png";

async function renderProof() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1200, height: 1600, deviceScaleFactor: 2 },
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  const flowchartCode = `flowchart TD
    subgraph Browser["Web Client - Next.js 14 Client Components"]
        UI["React 18 UI - Tailwind and Lucide"]
        State["Optimistic React State"]
        Audio["Web Audio API and Confetti"]
        SocketClient["Socket.io Client 4.8"]
    end

    subgraph ServerRuntime["Unified Node.js Engine - server.ts"]
        NextServer["Next.js App Router - RSC and API Handlers"]
        SocketServer["Socket.io WebSocket Server"]
        AuthMiddleware["JWT Cookie Validator - jose"]
    end

    subgraph DataLayer["Persistence and ORM Layer"]
        Prisma["Prisma ORM Client 5.22"]
        SQLite[("SQLite dev.db - Default")]
        Postgres[("PostgreSQL - Production")]
    end

    UI -->|HTTP Fetch and JWT Cookie| NextServer
    UI -->|Events: join, viewing| SocketClient
    SocketClient <--> |Bi-Directional WebSocket| SocketServer
    NextServer -->|Trigger Room Broadcast| SocketServer
    NextServer --> AuthMiddleware
    AuthMiddleware --> Prisma
    SocketServer --> Prisma
    Prisma --> SQLite
    Prisma -.-> Postgres
`;

  const erCode = `erDiagram
    User ||--o{ Project : owns
    User ||--o{ ProjectMember : belongs_to
    User ||--o{ Task : assigned_to
    User ||--o{ Comment : authors
    User ||--o{ Notification : receives

    Project ||--o{ ProjectMember : includes
    Project ||--o{ Task : contains
    Project ||--o{ Notification : references

    Task ||--o{ Comment : has

    User {
        string id PK
        string email
        string name
        string passwordHash
        datetime createdAt
    }

    Project {
        string id PK
        string name
        string description
        string ownerId FK
        datetime createdAt
        datetime updatedAt
    }

    ProjectMember {
        string id PK
        string projectId FK
        string userId FK
        string role
        datetime createdAt
    }

    Task {
        string id PK
        string title
        string description
        string status
        string priority
        float position
        datetime dueDate
        string tags
        string subtasks
        string projectId FK
        string assigneeId FK
    }

    Comment {
        string id PK
        string content
        string taskId FK
        string authorId FK
        datetime createdAt
    }

    Notification {
        string id PK
        string userId FK
        string projectId FK
        string taskId FK
        string type
        string message
        boolean read
        datetime createdAt
    }
`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
        <style>
          body {
            background: #0d1117;
            color: #c9d1d9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 30px;
          }
          h2 { color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 8px; margin-top: 30px; }
          .container {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 8px;
            padding: 24px;
            margin: 16px 0;
            display: flex;
            justify-content: center;
          }
        </style>
      </head>
      <body>
        <h2>1. Repaired System Component Architecture Diagram (flowchart TD)</h2>
        <div class="container">
          <pre class="mermaid">${flowchartCode}</pre>
        </div>

        <h2>2. Repaired Database Schema Diagram (erDiagram)</h2>
        <div class="container">
          <pre class="mermaid">${erCode}</pre>
        </div>

        <script>
          mermaid.initialize({
            startOnLoad: true,
            theme: 'dark'
          });
        </script>
      </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: OUTPUT_IMAGE, fullPage: true });
  console.log("Proof screenshot saved to:", OUTPUT_IMAGE);
  await browser.close();
}

renderProof().catch(console.error);
