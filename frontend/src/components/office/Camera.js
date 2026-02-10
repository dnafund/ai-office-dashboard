// Camera.js — 2D viewport camera with smooth interpolation
// All functions are pure (immutable state), no side effects

import { TILE_SIZE } from './TileMap.js'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3.0
const DEFAULT_ZOOM = 1.0
const LERP_SPEED = 0.12
const ZOOM_STEP = 0.1

export function createCamera(centerX = 12, centerY = 8) {
  return {
    x: centerX,
    y: centerY,
    zoom: DEFAULT_ZOOM,
    targetX: centerX,
    targetY: centerY,
    targetZoom: DEFAULT_ZOOM,
  }
}

function lerp(current, target, t) {
  const diff = target - current
  if (Math.abs(diff) < 0.001) return target
  return current + diff * t
}

export function updateCamera(camera, dt) {
  const speed = Math.min(LERP_SPEED * dt, 0.5)
  return {
    ...camera,
    x: lerp(camera.x, camera.targetX, speed),
    y: lerp(camera.y, camera.targetY, speed),
    zoom: lerp(camera.zoom, camera.targetZoom, speed),
  }
}

export function zoomCamera(camera, deltaY, screenX, screenY, canvasW, canvasH) {
  const direction = deltaY > 0 ? -1 : 1
  const newTargetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM,
    camera.targetZoom + direction * ZOOM_STEP * camera.targetZoom
  ))

  // Zoom towards cursor position: adjust pan to keep the world point under
  // the cursor stable after zoom change
  const worldBefore = screenToWorld(camera, screenX, screenY, canvasW, canvasH)
  const zoomRatio = newTargetZoom / camera.targetZoom

  return {
    ...camera,
    targetZoom: newTargetZoom,
    targetX: camera.targetX + (worldBefore.tileX - camera.targetX) * (1 - 1 / zoomRatio),
    targetY: camera.targetY + (worldBefore.tileY - camera.targetY) * (1 - 1 / zoomRatio),
  }
}

export function panCamera(camera, dx, dy) {
  return {
    ...camera,
    targetX: camera.targetX + dx,
    targetY: camera.targetY + dy,
  }
}

export function setCameraTarget(camera, tileX, tileY) {
  return {
    ...camera,
    targetX: tileX,
    targetY: tileY,
  }
}

export function screenToWorld(camera, screenX, screenY, canvasW, canvasH) {
  const tileX = (screenX - canvasW / 2) / (camera.zoom * TILE_SIZE * 2) + camera.x
  const tileY = (screenY - canvasH / 2) / (camera.zoom * TILE_SIZE * 2) + camera.y
  return { tileX, tileY }
}

export function worldToScreen(camera, tileX, tileY, canvasW, canvasH) {
  const screenX = (tileX - camera.x) * camera.zoom * TILE_SIZE * 2 + canvasW / 2
  const screenY = (tileY - camera.y) * camera.zoom * TILE_SIZE * 2 + canvasH / 2
  return { screenX, screenY }
}

export function applyCamera(ctx, camera, canvasW, canvasH) {
  const scale = camera.zoom * 2 // base SCALE=2, multiplied by zoom
  const tilePixelSize = TILE_SIZE * scale
  const offsetX = canvasW / 2 - camera.x * tilePixelSize
  const offsetY = canvasH / 2 - camera.y * tilePixelSize
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY)
}

export function resetTransform(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

export function getVisibleBounds(camera, canvasW, canvasH) {
  const topLeft = screenToWorld(camera, 0, 0, canvasW, canvasH)
  const bottomRight = screenToWorld(camera, canvasW, canvasH, canvasW, canvasH)
  return {
    minTileX: Math.floor(topLeft.tileX) - 1,
    minTileY: Math.floor(topLeft.tileY) - 1,
    maxTileX: Math.ceil(bottomRight.tileX) + 1,
    maxTileY: Math.ceil(bottomRight.tileY) + 1,
  }
}

export { MIN_ZOOM, MAX_ZOOM }
