# if add or update queue 
restart worker: 
    npm run worker
    or
    docker compose restart worker


# Installation 
git clone repo
pnpm install
.env


| Command                     | What it does               |
| --------------------------- | -------------------------- |
| `docker compose build`      | Build images               |
| `docker compose create`     | Create containers          |
| `docker compose up`         | Create + start containers  |
| `docker compose up --build` | Build + create + start     |
| `docker compose start`      | Start existing containers  |
| `docker compose down`       | Stop and remove containers |


# ERROR ENCOUNTERED

1. docker compose up --build error static
SOLUTION... Add force dynamic in dashboard layout.tsx or main


-------------

Yes. There are several ways to move your Docker setup to another computer, depending on what you want to preserve.

### Option 1: Export and Import Docker Images (Recommended)

If you just want to move your built application image:

On your current computer:

```bash
docker images
```

Save the image:

```bash
docker save -o retail-app.tar retail-app:latest
```

Copy `retail-app.tar` to your other computer (USB, network, cloud storage).

On the other computer:

```bash
docker load -i retail-app.tar
```

Verify:

```bash
docker images
```

Run it normally:

```bash
docker run ...
```

---

### Option 2: Push to Docker Hub or a Private Registry

If both computers have internet access:

```bash
docker tag retail-app:latest yourusername/retail-app:latest

docker push yourusername/retail-app:latest
```

On the other computer:

```bash
docker pull yourusername/retail-app:latest
```

This is the easiest if you update your application frequently.

---

### Option 3: Copy the Entire Project (Best for Development)

Since you're developing a Next.js + Prisma + PostgreSQL project, this is usually the best approach.

Copy:

```
my-project/
├── Dockerfile
├── docker-compose.yml
├── .env
├── package.json
├── pnpm-lock.yaml
├── prisma/
├── src/
└── ...
```

Then on the other computer:

```bash
docker compose up --build
```

Docker rebuilds everything.

---

### Option 4: Move Containers (Not Recommended)

You *can* export a container:

```bash
docker export my-container > container.tar
```

Then:

```bash
docker import container.tar
```

However, this is rarely recommended because:

* it loses image history
* environment variables aren't preserved
* ports aren't preserved
* volumes aren't preserved
* container configuration is lost

It's better to export the **image** than the **container**.

---

### Option 5: Move Images + Database (Recommended for Your Project)

For your retail system, you'll likely want to transfer:

* ✅ Docker images
* ✅ PostgreSQL database
* ✅ Redis data (if needed)
* ✅ Project source code
* ✅ `.env`

For PostgreSQL, you can either:

**Backup the database:**

```bash
pg_dump -U postgres retail_db > backup.sql
```

Restore:

```bash
psql -U postgres retail_db < backup.sql
```

Or, if your PostgreSQL data is stored in a Docker volume, you can back up and restore the volume.

---

## What I recommend for your project

Since you're building a Dockerized Next.js + Prisma + PostgreSQL application, the cleanest workflow is:

1. Copy your project folder to the other computer.
2. Export/import any custom Docker images if you want to avoid rebuilding.
3. Back up and restore the PostgreSQL database (or copy the Docker volume if appropriate).
4. Run:

```bash
docker compose up --build -d
```

This gives you the same environment on the new computer while keeping it easy to update and maintain.
