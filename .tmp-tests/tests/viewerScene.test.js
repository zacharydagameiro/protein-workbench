import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleProteins } from '../src/data/sampleProteins.js';
import { convertAngstroms, getBoundsSizeLabel, getFittedCameraDistance, getScaleBarDisplay, getStructureBounds, } from '../src/utils/viewerScene.js';
test('getStructureBounds calculates center and size for a structure', () => {
    const bounds = getStructureBounds(sampleProteins[0].atoms);
    assert.ok(bounds.maxDimension > 0);
    assert.ok(bounds.radius > 0);
    assert.ok(Number.isFinite(bounds.center.x));
    assert.ok(Number.isFinite(bounds.size.y));
});
test('convertAngstroms and size labels respect angstrom and nanometer units', () => {
    assert.equal(convertAngstroms(10, 'angstrom'), 10);
    assert.equal(convertAngstroms(10, 'nanometer'), 1);
    const label = getBoundsSizeLabel({
        center: { x: 0, y: 0, z: 0 },
        size: { x: 20, y: 10, z: 5 },
        radius: 10,
        maxDimension: 20,
    }, 'nanometer');
    assert.match(label, /2\.0 nm/);
    assert.match(label, /1\.0 nm/);
});
test('getScaleBarDisplay and fitted camera distance return stable scientific defaults', () => {
    const bounds = {
        center: { x: 0, y: 0, z: 0 },
        size: { x: 24, y: 12, z: 8 },
        radius: 14,
        maxDimension: 24,
    };
    const scaleBar = getScaleBarDisplay(bounds, 'angstrom');
    const distance = getFittedCameraDistance(bounds, 40, 16 / 10);
    assert.match(scaleBar.label, /Å/);
    assert.ok(scaleBar.widthPercent >= 14);
    assert.ok(distance > bounds.radius);
});
