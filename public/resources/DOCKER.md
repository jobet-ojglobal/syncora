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
