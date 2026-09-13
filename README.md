# RoomShift

RoomShift is a local, interactive 2D/3D room planner for shared spaces. Edit furniture dimensions, room architecture, windows, doors, and wall decor; use the local Codex CLI for collision-checked layout suggestions.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The planner runs entirely on the local machine. AI rearrangement uses the signed-in Codex CLI session; run `codex login` if the AI button reports an authentication issue.

## Included tools

- Furniture editing with drag, rotate, resize, duplicate, lock, delete, undo, and local persistence.
- Configurable door placement and clearance, multiple windows, and paintings, mirrors, wall shelves, and wall plants.
- Explicit layout checks for room boundaries, furniture overlap, door clearance, and tall furniture blocking windows.
- Save export for the JSON layout plus `roomshift-2d.png` and `roomshift-3d.png` images.
- `npm run build` creates the production client in `dist/`.
