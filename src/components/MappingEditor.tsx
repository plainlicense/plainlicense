import { useState, useEffect } from 'preact/hooks';
import { generateClauseHash } from '../utils/hash.ts';

interface Clause {
  id: string;
  content: string;
  hash: string;
}

interface Mapping {
  id: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one';
  plain_clauses: Clause[];
  original_clauses: Clause[];
  confidence: number;
}

export default function MappingEditor({ licenseId, plainText, originalText }: { licenseId: string, plainText: string, originalText: string }) {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [selectedPlains, setSelectedPlains] = useState<Clause[]>([]);
  const [selectedOriginals, setSelectedOriginals] = useState<Clause[]>([]);
  
  const [plainClauses, setPlainClauses] = useState<Clause[]>([]);
  const [originalClauses, setOriginalClauses] = useState<Clause[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function processTexts() {
      setLoading(true);
      
      const pClauses = await Promise.all(
        plainText.split('\n\n').filter(p => p.trim()).map(async (p, i) => ({
          id: `plain-${i}`,
          content: p.trim(),
          hash: await generateClauseHash(p)
        }))
      );

      const oClauses = await Promise.all(
        originalText.split('\n\n').filter(p => p.trim()).map(async (p, i) => ({
          id: `original-${i}`,
          content: p.trim(),
          hash: await generateClauseHash(p)
        }))
      );

      setPlainClauses(pClauses);
      setOriginalClauses(oClauses);
      setLoading(false);
    }

    processTexts();
  }, [plainText, originalText]);

  const addMapping = () => {
    if (selectedPlains.length > 0 && selectedOriginals.length > 0) {
      let type: 'one-to-one' | 'one-to-many' | 'many-to-one' = 'one-to-one';
      if (selectedPlains.length > 1) type = 'many-to-one';
      if (selectedOriginals.length > 1) type = 'one-to-many';
      if (selectedPlains.length > 1 && selectedOriginals.length > 1) type = 'one-to-many';

      const newMapping: Mapping = {
        id: `map-${Date.now()}`,
        type,
        plain_clauses: selectedPlains,
        original_clauses: selectedOriginals,
        confidence: 1.0
      };
      setMappings([...mappings, newMapping]);
      setSelectedPlains([]);
      setSelectedOriginals([]);
    }
  };

  const togglePlain = (c: Clause) => {
    if (selectedPlains.find(x => x.id === c.id)) {
      setSelectedPlains(selectedPlains.filter(x => x.id !== c.id));
    } else {
      setSelectedPlains([...selectedPlains, c]);
    }
  };

  const toggleOriginal = (c: Clause) => {
    if (selectedOriginals.find(x => x.id === c.id)) {
      setSelectedOriginals(selectedOriginals.filter(x => x.id !== c.id));
    } else {
      setSelectedOriginals([...selectedOriginals, c]);
    }
  };

  const downloadJSON = () => {
    const data = {
      license_id: licenseId,
      version: "1.0.0",
      mappings
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${licenseId}-mapping.json`;
    a.click();
  };

  if (loading) return <div role="status" style={{padding: '2rem', textAlign: 'center'}}>Processing text and generating hashes...</div>;

  return (
    <div class="mapping-editor-ui">
      <header class="editor-controls">
        <h2>Mapping Editor: {licenseId}</h2>
        <div class="actions">
          <button type="button" onClick={addMapping} disabled={selectedPlains.length === 0 || selectedOriginals.length === 0}>Create Mapping</button>
          <button type="button" onClick={downloadJSON} class="save-btn">Download Mapping JSON</button>
        </div>
      </header>

      <div class="panes">
        <section class="pane plain-pane" aria-label="Plain Language clauses">
          <h3>Plain Language</h3>
          {plainClauses.map(c => {
            const isSelected = !!selectedPlains.find(x => x.id === c.id);
            return (
              <button
                key={c.id}
                type="button"
                class={`clause-card ${isSelected ? 'selected' : ''}`}
                onClick={() => togglePlain(c)}
                aria-pressed={isSelected}
              >
                {c.content}
              </button>
            );
          })}
        </section>

        <section class="pane original-pane" aria-label="Original Text clauses">
          <h3>Original Text</h3>
          {originalClauses.map(c => {
            const isSelected = !!selectedOriginals.find(x => x.id === c.id);
            return (
              <button
                key={c.id}
                type="button"
                class={`clause-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleOriginal(c)}
                aria-pressed={isSelected}
              >
                {c.content}
              </button>
            );
          })}
        </section>

        <section class="pane mappings-pane" aria-label="Active Mappings">
          <h3>Active Mappings (<span aria-live="polite" aria-atomic="true">{mappings.length}</span>)</h3>
          <div class="mapping-list">
            {mappings.map(m => (
              <div key={m.id} class="mapping-item">
                <div class="mapping-summary">
                  <strong>{m.plain_clauses.length}</strong> ↔ <strong>{m.original_clauses.length}</strong>
                  <br/><small>{m.type}</small>
                </div>
                <button
                  type="button"
                  onClick={() => setMappings(mappings.filter(x => x.id !== m.id))}
                  aria-label={`Delete mapping: ${m.plain_clauses.length} plain clause${m.plain_clauses.length !== 1 ? 's' : ''} ↔ ${m.original_clauses.length} original clause${m.original_clauses.length !== 1 ? 's' : ''}`}
                >Delete</button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .mapping-editor-ui {
          display: flex;
          flex-direction: column;
          height: 90vh;
          color: var(--sl-color-white);
        }
        .editor-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background: var(--sl-color-gray-6);
          border-bottom: 1px solid var(--sl-color-gray-5);
        }
        .panes {
          display: grid;
          grid-template-columns: 1fr 1fr 300px;
          gap: 1px;
          background: var(--sl-color-gray-5);
          flex: 1;
          overflow: hidden;
        }
        .pane {
          background: var(--sl-color-bg);
          padding: 1.5rem;
          overflow-y: auto;
        }
        .pane h3 {
          margin-top: 0;
          position: sticky;
          top: 0;
          background: var(--sl-color-bg);
          padding-bottom: 1rem;
          color: var(--sl-color-accent);
        }
        .clause-card {
          /* Reset button defaults */
          appearance: none;
          -webkit-appearance: none;
          width: 100%;
          text-align: left;
          font-family: inherit;
          color: inherit;
          /* Card styles */
          padding: 1rem;
          background: var(--sl-color-gray-6);
          border: 1px solid var(--sl-color-gray-5);
          margin-bottom: 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .clause-card:hover {
          border-color: var(--sl-color-accent);
        }
        .clause-card:focus-visible {
          outline: 2px solid var(--sl-color-accent);
          outline-offset: 2px;
        }
        .clause-card.selected {
          border-color: var(--sl-color-accent);
          background: var(--sl-color-accent-low);
        }
        .mapping-item {
          padding: 0.75rem;
          background: var(--sl-color-gray-6);
          border: 1px solid var(--sl-color-gray-5);
          margin-bottom: 0.5rem;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
        }
        button {
          padding: 0.5rem 1rem;
          background: var(--sl-color-accent);
          color: var(--sl-color-black);
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        button:disabled {
          background: var(--sl-color-gray-4);
          cursor: not-allowed;
        }
        .save-btn {
          background: #28a745;
          margin-left: 1rem;
        }
      `}</style>
    </div>
  );
}
