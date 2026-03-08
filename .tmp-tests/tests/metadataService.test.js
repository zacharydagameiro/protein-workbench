import test from 'node:test';
import assert from 'node:assert/strict';
import { clearMetadataCache, fetchStructureMetadata } from '../src/services/metadataService.js';
test('fetchStructureMetadata merges RCSB and UniProt data and caches the result', async () => {
    clearMetadataCache();
    let calls = 0;
    globalThis.fetch = (async (input) => {
        calls += 1;
        const url = String(input);
        if (url.endsWith('/entry/1ABC')) {
            return new Response(JSON.stringify({
                struct: { title: 'RCSB Title' },
                exptl: [{ method: 'X-RAY DIFFRACTION' }],
                rcsb_entry_info: { resolution_combined: [1.8] },
                struct_keywords: { pdbx_keywords: 'OXIDOREDUCTASE', text: 'enzyme' },
            }), { status: 200 });
        }
        if (url.endsWith('/entry/1ABC/polymer_entities')) {
            return new Response(JSON.stringify([
                {
                    rcsb_polymer_entity_container_identifiers: { uniprot_ids: ['P12345'] },
                    rcsb_polymer_entity: { pdbx_description: 'Polymer Entity Name' },
                    rcsb_entity_source_organism: [{ ncbi_scientific_name: 'Homo sapiens' }],
                },
            ]), { status: 200 });
        }
        if (url.endsWith('/uniprotkb/P12345.json')) {
            return new Response(JSON.stringify({
                genes: [{ geneName: { value: 'GENE1' } }],
                proteinDescription: { recommendedName: { fullName: { value: 'UniProt Preferred Name' } } },
                comments: [{ commentType: 'FUNCTION', texts: [{ value: 'Catalyzes a useful reaction.' }] }],
            }), { status: 200 });
        }
        return new Response(null, { status: 404 });
    });
    const metadata = await fetchStructureMetadata('1abc');
    const cachedMetadata = await fetchStructureMetadata('1abc');
    assert.equal(metadata.title, 'UniProt Preferred Name');
    assert.equal(metadata.moleculeName, 'UniProt Preferred Name');
    assert.equal(metadata.description, 'RCSB Title');
    assert.equal(metadata.organism, 'Homo sapiens');
    assert.equal(metadata.uniprotId, 'P12345');
    assert.equal(metadata.geneName, 'GENE1');
    assert.equal(metadata.functionSummary, 'Catalyzes a useful reaction.');
    assert.equal(calls, 3);
    assert.deepEqual(cachedMetadata, metadata);
});
test('fetchStructureMetadata tolerates UniProt failure and still returns entry metadata', async () => {
    clearMetadataCache();
    globalThis.fetch = (async (input) => {
        const url = String(input);
        if (url.endsWith('/entry/2XYZ')) {
            return new Response(JSON.stringify({
                struct: { title: 'Fallback Title' },
                exptl: [{ method: 'ELECTRON MICROSCOPY' }],
                rcsb_entry_info: { resolution_combined: [3.4] },
            }), { status: 200 });
        }
        if (url.endsWith('/entry/2XYZ/polymer_entities')) {
            return new Response(JSON.stringify([
                {
                    rcsb_polymer_entity_container_identifiers: { uniprot_ids: ['Q99999'] },
                    rcsb_polymer_entity: { pdbx_description: 'Hemoglobin Subunit Beta' },
                },
            ]), { status: 200 });
        }
        if (url.endsWith('/uniprotkb/Q99999.json')) {
            return new Response(null, { status: 500 });
        }
        return new Response(null, { status: 404 });
    });
    const metadata = await fetchStructureMetadata('2xyz');
    assert.equal(metadata.title, 'Hemoglobin Subunit Beta');
    assert.equal(metadata.moleculeName, 'Hemoglobin Subunit Beta');
    assert.equal(metadata.description, 'Fallback Title');
    assert.equal(metadata.uniprotId, 'Q99999');
    assert.equal(metadata.experimentalMethod, 'ELECTRON MICROSCOPY');
    assert.equal(metadata.functionSummary, undefined);
});
