import { checks, findSpace, type Item, type Layout, type Proposal, type Wall } from '../shared/layout';

type Anchor = { x: number; z: number; rotation: number };

function uniqueRotations(item: Item) {
  return [...new Set([item.rotation, (item.rotation + 90) % 360])];
}

function addAnchor(anchors: Anchor[], x: number, z: number, rotation: number) {
  if (Number.isFinite(x) && Number.isFinite(z)) anchors.push({ x, z, rotation });
}

function wallAnchor(layout: Layout, wall: Wall, offset: number, item: Item, rotation: number, extra = 0.32): Anchor {
  const reach = item.depth / 2 + extra;
  if (wall === 'north') return { x: offset, z: -layout.depth / 2 + reach, rotation };
  if (wall === 'south') return { x: offset, z: layout.depth / 2 - reach, rotation };
  if (wall === 'east') return { x: layout.width / 2 - reach, z: offset, rotation };
  return { x: -layout.width / 2 + reach, z: offset, rotation };
}

function anchorsFor(layout: Layout, item: Item, prompt: string): Anchor[] {
  const lower = prompt.toLowerCase();
  const wantsWindow = /window|light|bright|sun/.test(lower);
  const wantsOpen = /open|clear|middle|center|walkway|space/.test(lower);
  const anchors: Anchor[] = [];

  if (wantsWindow) {
    for (const window of layout.windows) {
      const rotation = window.wall === 'north' || window.wall === 'south' ? 0 : 90;
      for (const delta of [0, -0.85, 0.85]) {
        const anchor = wallAnchor(layout, window.wall, window.offset + delta, item, rotation);
        addAnchor(anchors, anchor.x, anchor.z, anchor.rotation);
      }
    }
  }

  const horizontal = Math.max(2, Math.floor(layout.width / 0.7));
  const vertical = Math.max(2, Math.floor(layout.depth / 0.7));
  for (let step = 0; step <= horizontal; step += 1) {
    const x = -layout.width / 2 + 0.28 + (layout.width - 0.56) * (step / horizontal);
    addAnchor(anchors, x, -layout.depth / 2 + item.depth / 2 + 0.26, 0);
    addAnchor(anchors, x, layout.depth / 2 - item.depth / 2 - 0.26, 0);
  }
  for (let step = 0; step <= vertical; step += 1) {
    const z = -layout.depth / 2 + 0.28 + (layout.depth - 0.56) * (step / vertical);
    addAnchor(anchors, -layout.width / 2 + item.depth / 2 + 0.26, z, 90);
    addAnchor(anchors, layout.width / 2 - item.depth / 2 - 0.26, z, 90);
  }

  const gridX = Math.max(2, Math.floor(layout.width / 0.8));
  const gridZ = Math.max(2, Math.floor(layout.depth / 0.8));
  for (let xStep = 0; xStep <= gridX; xStep += 1) {
    for (let zStep = 0; zStep <= gridZ; zStep += 1) {
      const x = -layout.width / 2 + 0.3 + (layout.width - 0.6) * (xStep / gridX);
      const z = -layout.depth / 2 + 0.3 + (layout.depth - 0.6) * (zStep / gridZ);
      for (const rotation of uniqueRotations(item)) addAnchor(anchors, x, z, rotation);
    }
  }

  if (wantsOpen) {
    anchors.sort((a, b) => {
      const centerA = Math.hypot(a.x, a.z);
      const centerB = Math.hypot(b.x, b.z);
      return centerB - centerA;
    });
  }
  return anchors;
}

function nearestWindowDistance(layout: Layout, item: Item, anchor: Anchor) {
  if (!layout.windows.length) return 10;
  return Math.min(...layout.windows.map((window) => {
    const wallPosition = wallAnchor(layout, window.wall, window.offset, item, anchor.rotation, 0);
    return Math.hypot(anchor.x - wallPosition.x, anchor.z - wallPosition.z);
  }));
}

function placementScore(layout: Layout, item: Item, anchor: Anchor, prompt: string, placed: Item[]) {
  const lower = prompt.toLowerCase();
  const wantsWindow = /window|light|bright|sun/.test(lower);
  const wantsOpen = /open|clear|middle|center|walkway|space/.test(lower);
  const wantsStudy = /study|desk|work|workspace|roommate/.test(lower);
  const wantsSleep = /sleep|bed|rest/.test(lower);
  const wantsSocial = /sofa|couch|lounge|conversation|social|gather/.test(lower);
  let score = 0;

  if (wantsWindow) score += nearestWindowDistance(layout, item, anchor) * 4;
  if (wantsOpen) score += Math.max(0, 1.7 - Math.hypot(anchor.x, anchor.z)) * 7;
  if (wantsStudy && (item.kind === 'desk' || item.kind === 'chair')) score += nearestWindowDistance(layout, item, anchor) * 2;
  if (wantsSleep && item.kind === 'bed') score += Math.abs(anchor.x) * 0.5;
  if (wantsSocial && ['sofa', 'armchair', 'table'].includes(item.kind)) score += Math.hypot(anchor.x, anchor.z) * 1.5;
  if (item.kind === 'rug') score += Math.hypot(anchor.x, anchor.z) * (wantsOpen ? 1.2 : 0.25);
  if (item.kind === 'chair') {
    const desk = placed.find((candidate) => candidate.kind === 'desk');
    if (desk) score += Math.hypot(anchor.x - desk.x, anchor.z - desk.z) * 1.8;
  }
  score += Math.abs(anchor.rotation - item.rotation) / 360;
  return score;
}

function priority(item: Item, prompt: string) {
  const lower = prompt.toLowerCase();
  let score = item.kind === 'rug' ? 1 : 10;
  if (/study|desk|work|workspace|roommate/.test(lower) && item.kind === 'desk') score += 80;
  if (/study|desk|work|workspace|roommate/.test(lower) && item.kind === 'chair') score += 70;
  if (/sleep|bed|rest/.test(lower) && item.kind === 'bed') score += 75;
  if (/sofa|couch|lounge|conversation|social|gather/.test(lower) && ['sofa', 'armchair', 'table'].includes(item.kind)) score += 70;
  return score;
}

function readableSummary(prompt: string, placed: Item[]) {
  const lower = prompt.toLowerCase();
  const focus = /study|desk|work|workspace/.test(lower)
    ? 'study areas near the windows'
    : /sleep|bed|rest/.test(lower)
      ? 'restful sleeping zones'
      : /sofa|couch|lounge|conversation/.test(lower)
        ? 'a comfortable gathering area'
        : /open|clear|middle|center/.test(lower)
          ? 'a more open center'
          : 'a balanced room arrangement';
  return `Created ${focus} while keeping ${placed.length} piece${placed.length === 1 ? '' : 's'} inside the room and clear of the door, windows, and other solid furniture.`;
}

export function buildLocalProposal(layout: Layout, prompt: string): Proposal {
  const locked = layout.items.filter((item) => item.locked);
  const lockedIssues = checks({ ...layout, items: locked });
  if (Object.values(lockedIssues).flat().length) {
    return { status: 'impossible', summary: 'The locked pieces already conflict with the room boundaries or architecture. Unlock one and try again.', items: [] };
  }

  const movable = layout.items.filter((item) => !item.locked).sort((a, b) => priority(b, prompt) - priority(a, prompt));
  const placed = [...locked];
  for (const item of movable) {
    const anchors = anchorsFor(layout, item, prompt);
    const candidates = anchors
      .map((anchor) => ({ ...item, x: Math.round(anchor.x * 100) / 100, z: Math.round(anchor.z * 100) / 100, rotation: anchor.rotation }))
      .filter((candidate) => Object.values(checks({ ...layout, items: [...placed, candidate] })).flat().length === 0)
      .sort((a, b) => placementScore(layout, item, a, prompt, placed) - placementScore(layout, item, b, prompt, placed));
    const fallback = findSpace({ ...layout, items: placed }, item);
    const chosen = candidates[0] ?? fallback;
    if (!chosen) return { status: 'impossible', summary: `There is not enough legal floor space to rearrange ${item.name}. Unlock or remove another piece and try again.`, items: [] };
    placed.push(chosen);
  }

  const finalLayout = { ...layout, items: placed };
  const finalIssues = Object.values(checks(finalLayout)).flat();
  if (finalIssues.length) return { status: 'impossible', summary: `The requested arrangement could not satisfy the room constraints: ${finalIssues[0]}.`, items: [] };
  return { status: 'ok', summary: readableSummary(prompt, placed), items: placed };
}
