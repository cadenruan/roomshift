# RoomShift

RoomShift is an interactive 2D/3D room planner for shared spaces. Edit furniture dimensions, room architecture, windows, doors, and wall decor; use RoomShift AI for collision-checked layout suggestions.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The local studio uses the signed-in Codex CLI session; run `codex login` if the local AI button reports an authentication issue.

## Public AI test setup

The public build calls a separate Cloudflare Worker so no API key is exposed in the browser. Workers AI includes a daily free allocation of 10,000 Neurons; the Worker uses the JSON-capable `@cf/meta/llama-3.1-8b-instruct-fast` model and validates every proposal before it can be applied.

1. Create a Cloudflare API token with `Workers Scripts: Edit` plus `Workers AI: Read` and `Workers AI: Edit`, then copy your Cloudflare account ID.
2. Add GitHub repository secrets named `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. Run the `Deploy RoomShift Workers AI` GitHub Actions workflow. It deploys the Worker named `roomshift-ai` and shows its `workers.dev` URL in the workflow log.
4. Add a GitHub repository variable named `ROOMSHIFT_AI_URL` containing that Worker URL, without a trailing slash.
5. Push to `main` or run the Pages workflow again. The public AI tab will then call Cloudflare instead of the local-only route.

The Worker allows requests from the GitHub Pages origin, local development, and limits each client to 10 proposals per 10 minutes to protect the free allowance. If the free daily allocation is exceeded, Cloudflare rejects further inference until the allowance resets.

## Included tools

- Furniture editing with drag, rotate, resize, duplicate, lock, delete, undo, and local persistence.
- Configurable door placement and clearance, multiple windows, and paintings, mirrors, wall shelves, and wall plants. Windows and wall objects can be selected, dragged along their wall, and resized with stage handles.
- Separate Edit, AI, Architecture, and Checks menus keep the right rail focused instead of putting every control in one scroll.
- Explicit layout checks for room boundaries, furniture overlap, door clearance, and tall furniture blocking windows.
- Save export for the JSON layout plus `roomshift-2d.png` and `roomshift-3d.png` images.
- `npm run build` creates the production client in `dist/`.
