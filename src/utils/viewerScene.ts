import type { Atom } from '../types/structure.js';

export interface StructureBounds {
  center: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  radius: number;
  maxDimension: number;
}

export const getStructureBounds = (atoms: Atom[]): StructureBounds => {
  if (atoms.length === 0) {
    return {
      center: { x: 0, y: 0, z: 0 },
      size: { x: 0, y: 0, z: 0 },
      radius: 1,
      maxDimension: 1,
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const atom of atoms) {
    minX = Math.min(minX, atom.x);
    minY = Math.min(minY, atom.y);
    minZ = Math.min(minZ, atom.z);
    maxX = Math.max(maxX, atom.x);
    maxY = Math.max(maxY, atom.y);
    maxZ = Math.max(maxZ, atom.z);
  }

  const size = {
    x: maxX - minX,
    y: maxY - minY,
    z: maxZ - minZ,
  };
  const maxDimension = Math.max(size.x, size.y, size.z, 1);

  return {
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      z: (minZ + maxZ) / 2,
    },
    size,
    radius: Math.max(Math.sqrt(size.x ** 2 + size.y ** 2 + size.z ** 2) / 2, 1.2),
    maxDimension,
  };
};

export const getFittedCameraDistance = (
  bounds: StructureBounds,
  fovDegrees: number,
  aspect: number,
  padding = 1.45,
): number => {
  const safeAspect = Math.max(aspect, 0.75);
  const halfHeight = Math.max(bounds.size.y / 2, 1);
  const halfWidth = Math.max(bounds.size.x / 2, 1);
  const fovRadians = (fovDegrees * Math.PI) / 180;
  const distanceForHeight = halfHeight / Math.tan(fovRadians / 2);
  const distanceForWidth = halfWidth / (safeAspect * Math.tan(fovRadians / 2));

  return Math.max(distanceForHeight, distanceForWidth, bounds.radius * 1.35, bounds.size.z * 1.2 + 2) * padding;
};
