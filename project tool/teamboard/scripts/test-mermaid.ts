import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function testRepairedDiagrams() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Test across multiple versions of Mermaid
  for (const version of ["8.14.0", "9.4.3", "10.4.0", "10.9.1"]) {
    console.log(`\n================ Testing Mermaid v${version} ================`);
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/mermaid@${version}/dist/mermaid.min.js"></script>
        </head>
        <body>
          <script>
            window.parseDiagram = async function(text) {
              try {
                if (window.mermaid.parseAsync) {
                  await window.mermaid.parseAsync(text);
                } else {
                  window.mermaid.parse(text);
                }
                return { ok: true };
              } catch (e) {
                return { ok: false, error: e.str || e.message || String(e) };
              }
            };
          </script>
        </body>
      </html>
    `;
    await page.setContent(html);

    // Repaired Flowchart
    const repairedFlowchart = `flowchart TD
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

    const rFlow = await page.evaluate((code) => (window as any).parseDiagram(code), repairedFlowchart);
    console.log(`Repaired Flowchart v${version}:`, rFlow.ok ? "PASS" : `FAIL: ${rFlow.error}`);

    // Repaired ER Diagram
    const repairedER = `erDiagram
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

    const rER = await page.evaluate((code) => (window as any).parseDiagram(code), repairedER);
    console.log(`Repaired ER v${version}:`, rER.ok ? "PASS" : `FAIL: ${rER.error}`);
  }

  await browser.close();
}

testRepairedDiagrams().catch(console.error);
