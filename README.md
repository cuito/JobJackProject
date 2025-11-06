
# JobJack Project

A fully containerized **Yarn Monorepo** demo application with a **Node.js (TypeScript) REST API** and an **Angular 17+ frontend**, designed to explore host directory structures and stream results efficiently — even for very large directories (100k+ entries).

The project is built around **streams**, **Docker Compose**, and **cross-platform compatibility**.

---

## 📁 Project Structure

```
JobJackProject/
├── packages/
│   ├── api/       # Node.js Express API (TypeScript + ESM)
│   └── web/       # Angular 17+ Frontend (standalone components)
├── docker-compose.base.yml
├── docker-compose.win.yml
├── docker-compose.unix.yml
├── package.json
└── yarn.lock
```

---

## 🧩 Features

- **Stream-based directory listing**
  - Efficient for 100k+ files using `readdir` async iterators and NDJSON streaming.
- **Cross-platform containerization**
  - Runs on Windows, macOS, and Linux with minimal configuration.
- **Angular + Node integration**
  - Nginx proxies `/api` calls to the API container.
- **Selectable directories**
  - Click any folder in the UI to explore its contents.
- **Real-time incremental rendering**
  - Angular consumes NDJSON stream to render entries progressively.

---

## 🐳 Docker Compose Configurations

To ensure portability, the stack is split into multiple compose files:

### Base (common for all systems)
**`docker-compose.base.yml`**
```yaml
services:
  api:
    build:
      context: .
      dockerfile: packages/api/Dockerfile
    container_name: jobjack-api
    environment:
      NODE_ENV: production
    ports:
      - "3000:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/hello"]
      interval: 10s
      timeout: 3s
      retries: 10

  web:
    build:
      context: .
      dockerfile: packages/web/Dockerfile
    container_name: jobjack-web
    depends_on:
      api:
        condition: service_healthy
    ports:
      - "8080:80"
    restart: unless-stopped
```

### Windows overlay
**`docker-compose.win.yml`**
```yaml
services:
  api:
    volumes:
      - "C:/:/host/c:ro"
      # Uncomment below only if the D: drive exists
      # - "D:/:/host/d:ro"
```

### macOS/Linux overlay
**`docker-compose.unix.yml`**
```yaml
services:
  api:
    volumes:
      - "/:/host:ro"
```

---

## 🚀 Running the Application

### 1. Clone and install dependencies
```bash
git clone <repo-url>
cd JobJackProject
yarn install
```

### 2. Build and run containers

#### On Windows:
```bash
docker compose -f docker-compose.base.yml -f docker-compose.win.yml up --build
```

#### On macOS/Linux:
```bash
docker compose -f docker-compose.base.yml -f docker-compose.unix.yml up --build
```

- The API runs on **http://localhost:3000**
- The Web UI runs on **http://localhost:8080**

---

## 🧠 API Endpoints

| Method | Route           | Description |
|---------|------------------|-------------|
| `GET` | `/api/hello` | Health check — returns a static Hello World JSON |
| `GET` | `/api/dir?path=<absPath>[&only=all|files|dirs][&format=json][&limit=n]` | Streams (NDJSON) or returns (JSON array) directory listings, including filename, full path, size, type, permissions, and created date |

Example:
```bash
curl "http://localhost:3000/api/dir?path=/var/log&format=json"
```

---

## 🌐 Frontend (Angular)

- Located under `packages/web`
- Uses the new Angular standalone component pattern
- Communicates with the API via Nginx proxy `/api/*`
- Directories are clickable — the UI updates to show contents recursively
- Uses a **streamed NDJSON reader** for high performance

---

## 🧪 Next Steps / Improvements

### ✅ Phase 1 – Completed
- ✅ Dockerized API + Frontend (Yarn Monorepo)
- ✅ Directory listing (NDJSON + JSON)
- ✅ Cross-platform drive mounts
- ✅ Angular UI with navigation and live updates

### 🚧 Phase 2 – Next Steps

#### 1. Automated Testing
- **Backend**: Jest or Mocha for unit + integration tests  
  - Mock filesystem using `memfs` or a temp directory
- **Frontend**: Karma/Jasmine or Jest with `@angular-builders/jest`
- Include GitHub Actions CI pipeline to run all tests

#### 2. Load / Stress Testing
- Use **k6**, **Artillery**, or **Autocannon** to measure performance with large directories.
- Example:
  ```bash
  npx autocannon http://localhost:3000/api/dir?path=/host/var/log
  ```

#### 3. Pagination and Virtual Scrolling
- Implement server-side pagination
- Add Angular CDK’s `VirtualScrollViewport` for large result sets

#### 4. Search and Filtering
- Add query param `filter=namePart` to API
- Debounced text filter in Angular

#### 5. Enhanced UI
- Breadcrumb navigation
- File icons and sorting
- Light/dark themes via Tailwind or Bootstrap

---

## 🧰 Development Commands

| Command | Description |
|----------|--------------|
| `yarn dev:api` | Run API locally with hot reload |
| `yarn workspace web start` | Run Angular app locally |
| `docker compose -f docker-compose.base.yml -f docker-compose.win.yml up --build` | Build + run both services on Windows |
| `docker compose -f docker-compose.base.yml -f docker-compose.unix.yml up --build` | Build + run both services on Linux |
| `docker compose down` | Stop all containers |

---

## 🧑‍💻 Author

**Cuito Naude**  
Built as a demonstration of a portable, scalable, and streaming-capable monorepo application architecture using Node.js, Angular, and Docker.

---

## 📜 License

This project is provided for demonstration and educational purposes.
