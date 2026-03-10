import { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';

import { Rnd } from 'react-rnd';
import { GenericSchema, safeParse } from 'valibot';

import { CardErrorBoundary } from '../error-boundary';
import { createEntityStore, EntityStoreContext } from '../store';
import { EditorProps, HassObject } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConfig = any;

type PlaygroundCard = {
    schema?: GenericSchema;
    entities: (config: AnyConfig) => string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Component: React.ComponentType<any>;
    Editor?: React.ComponentType<EditorProps<AnyConfig>>;
    getStubConfig?: (hass: HassObject) => AnyConfig;
};

type CardPlaygroundProps = {
    card: PlaygroundCard;
    initialConfig?: AnyConfig;
    initialEntities?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = {
    container: {
        display: 'flex',
        gap: '12px',
        height: '100%',
        minHeight: '400px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        color: '#333',
    } satisfies CSSProperties,
    panel: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #ddd',
        borderRadius: '6px',
        overflow: 'hidden',
        backgroundColor: '#fff',
    } satisfies CSSProperties,
    panelWide: {
        flex: 2,
    } satisfies CSSProperties,
    panelHeader: {
        padding: '8px 12px',
        fontWeight: 600,
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: '1px solid #ddd',
        backgroundColor: '#f7f7f7',
        color: '#888',
    } satisfies CSSProperties,
    panelBody: {
        padding: '12px',
        overflow: 'auto',
        flex: 1,
    } satisfies CSSProperties,
    entityRow: {
        marginBottom: '10px',
    } satisfies CSSProperties,
    entityHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '3px',
    } satisfies CSSProperties,
    entityLabel: {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#555',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    } satisfies CSSProperties,
    activeBadge: {
        fontSize: '9px',
        padding: '1px 5px',
        borderRadius: '3px',
        backgroundColor: '#e6f4ea',
        color: '#1e7e34',
        fontFamily: 'system-ui, sans-serif',
    } satisfies CSSProperties,
    removeButton: {
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        color: '#999',
        fontSize: '16px',
        padding: '0 4px',
        lineHeight: 1,
    } satisfies CSSProperties,
    input: {
        width: '100%',
        padding: '5px 8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        boxSizing: 'border-box',
    } satisfies CSSProperties,
    addRow: {
        display: 'flex',
        gap: '6px',
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid #eee',
    } satisfies CSSProperties,
    addButton: {
        padding: '5px 10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#f7f7f7',
        cursor: 'pointer',
        fontSize: '12px',
        whiteSpace: 'nowrap',
    } satisfies CSSProperties,
    jsonEditor: {
        width: '100%',
        minHeight: '120px',
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        resize: 'vertical',
        boxSizing: 'border-box',
    } satisfies CSSProperties,
    jsonError: {
        color: '#d32f2f',
        fontSize: '11px',
        marginTop: '4px',
    } satisfies CSSProperties,
    configPreview: {
        marginTop: '12px',
        padding: '8px',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px',
        fontSize: '11px',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight: '200px',
        overflow: 'auto',
        color: '#666',
    } satisfies CSSProperties,
    configPreviewToggle: {
        fontSize: '11px',
        color: '#888',
        cursor: 'pointer',
        border: 'none',
        background: 'none',
        padding: '4px 0',
        marginTop: '8px',
    } satisfies CSSProperties,
    validationErrors: {
        marginTop: '8px',
        padding: '8px',
        backgroundColor: '#fef2f2',
        borderRadius: '4px',
        fontSize: '11px',
        color: '#d32f2f',
    } satisfies CSSProperties,
    emptyEntities: {
        color: '#999',
        fontSize: '12px',
        fontStyle: 'italic',
    } satisfies CSSProperties,
    checkboxRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        color: '#888',
    } satisfies CSSProperties,
    checkbox: {
        margin: 0,
    } satisfies CSSProperties,
    rndContainer: {
        border: '1px dashed #ccc',
        borderRadius: '4px',
        background: '#fafafa',
        overflow: 'hidden',
    } satisfies CSSProperties,
    rndInner: {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    } satisfies CSSProperties,
};

// ---------------------------------------------------------------------------
// ConfigJsonEditor — fallback when no Editor component is provided
// ---------------------------------------------------------------------------

function ConfigJsonEditor({
    config,
    onChange,
}: {
    config: AnyConfig;
    onChange: (config: AnyConfig) => void;
}) {
    // draft is non-null only while the user is actively editing
    const [draft, setDraft] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const displayText = draft ?? JSON.stringify(config, null, 2);

    const handleBlur = () => {
        if (draft === null) return;
        try {
            const parsed = JSON.parse(draft);
            setError(null);
            setDraft(null);
            onChange(parsed);
        } catch (e) {
            setError((e as Error).message);
        }
    };

    return (
        <div>
            <textarea
                style={s.jsonEditor}
                value={displayText}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={handleBlur}
            />
            {error && <div style={s.jsonError}>{error}</div>}
        </div>
    );
}

// ---------------------------------------------------------------------------
// CardPlayground
// ---------------------------------------------------------------------------

export function CardPlayground({ card, initialConfig, initialEntities = {} }: CardPlaygroundProps) {
    // -- Entity mocking state ------------------------------------------------
    const [entityValues, setEntityValues] = useState<Record<string, string>>(initialEntities);
    const [newEntityId, setNewEntityId] = useState('');

    // -- Config state --------------------------------------------------------
    const [config, setConfig] = useState<AnyConfig>(() => {
        if (initialConfig !== undefined) {
            return initialConfig;
        }
        if (card.getStubConfig) {
            const stubHass: HassObject = {
                states: Object.fromEntries(
                    Object.entries(initialEntities).map(([id, value]) => [id, { state: value }]),
                ),
            };
            return card.getStubConfig(stubHass);
        }
        return {};
    });

    // -- Derived entities from config ----------------------------------------
    const activeEntities = useMemo(() => {
        try {
            return card.entities(config) ?? [];
        } catch {
            return [];
        }
    }, [card, config]);

    // Merge explicit entity values with auto-derived entities from config.
    // Entities referenced by config that aren't explicitly set get empty values.
    const allEntityIds = useMemo(() => {
        const ids = new Set([...Object.keys(entityValues), ...activeEntities]);
        return [...ids];
    }, [entityValues, activeEntities]);

    // -- Mock hass object (for Editor) — includes all known entities ---------
    const mockHass: HassObject = useMemo(
        () => ({
            states: Object.fromEntries(
                allEntityIds.map((id) => [id, { state: entityValues[id] ?? '' }]),
            ),
        }),
        [allEntityIds, entityValues],
    );

    // -- Entity store for card preview ---------------------------------------
    const store = useMemo(() => createEntityStore(), []);

    // Sync entity store with current mock values (external system, not React state)
    useEffect(() => {
        store.update(mockHass, activeEntities);
    }, [store, mockHass, activeEntities]);

    // -- Schema validation ---------------------------------------------------
    const validationIssues = useMemo(() => {
        if (!card.schema) {
            return null;
        }
        const result = safeParse(card.schema, config);
        return result.success ? null : result.issues;
    }, [card.schema, config]);

    // -- Entity handlers -----------------------------------------------------
    const updateEntity = useCallback((id: string, value: string) => {
        setEntityValues((prev) => ({ ...prev, [id]: value }));
    }, []);

    const removeEntity = useCallback((id: string) => {
        setEntityValues((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }, []);

    const addEntity = useCallback(() => {
        if (newEntityId.trim() && !(newEntityId in entityValues)) {
            setEntityValues((prev) => ({ ...prev, [newEntityId.trim()]: '' }));
            setNewEntityId('');
        }
    }, [newEntityId, entityValues]);

    // -- UI toggles -----------------------------------------------------------
    const [showConfigJson, setShowConfigJson] = useState(false);
    const [resizable, setResizable] = useState(false);

    const Editor = card.Editor;

    return (
        <div style={s.container}>
            {/* ---- Config Panel ---- */}
            <div style={s.panel}>
                <div style={s.panelHeader}>Configuration</div>
                <div style={s.panelBody}>
                    {Editor ? (
                        <>
                            <Editor config={config} onChange={setConfig} hass={mockHass} />
                            <button
                                type="button"
                                style={s.configPreviewToggle}
                                onClick={() => setShowConfigJson(!showConfigJson)}
                            >
                                {showConfigJson ? 'Hide' : 'Show'} raw config
                            </button>
                            {showConfigJson && (
                                <div style={s.configPreview}>{JSON.stringify(config, null, 2)}</div>
                            )}
                        </>
                    ) : (
                        <ConfigJsonEditor config={config} onChange={setConfig} />
                    )}
                    {validationIssues && (
                        <div style={s.validationErrors}>
                            Schema validation errors:
                            <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
                                {validationIssues.map((issue, i) => (
                                    <li key={issue.message + String(i)}>
                                        {issue.path?.map((p) => p.key).join('.') || '(root)'}:{' '}
                                        {issue.message}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* ---- Card Preview ---- */}
            <div style={{ ...s.panel, ...s.panelWide }}>
                <div style={{ ...s.panelHeader, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Preview</span>
                    <label style={s.checkboxRow}>
                        <input
                            type="checkbox"
                            style={s.checkbox}
                            checked={resizable}
                            onChange={(e) => setResizable(e.target.checked)}
                        />
                        Resizable
                    </label>
                </div>
                <div style={{ ...s.panelBody, position: 'relative' }}>
                    {resizable ? (
                        <Rnd
                            style={s.rndContainer}
                            default={{ x: 0, y: 0, width: 320, height: 200 }}
                            bounds="parent"
                            disableDragging
                        >
                            <div style={s.rndInner}>
                                <EntityStoreContext.Provider value={store}>
                                    <CardErrorBoundary cardKey="playground">
                                        <card.Component {...(config as Record<string, unknown>)} />
                                    </CardErrorBoundary>
                                </EntityStoreContext.Provider>
                            </div>
                        </Rnd>
                    ) : (
                        <EntityStoreContext.Provider value={store}>
                            <CardErrorBoundary cardKey="playground">
                                <card.Component {...(config as Record<string, unknown>)} />
                            </CardErrorBoundary>
                        </EntityStoreContext.Provider>
                    )}
                </div>
            </div>

            {/* ---- Entities Panel ---- */}
            <div style={s.panel}>
                <div style={s.panelHeader}>Entities</div>
                <div style={s.panelBody}>
                    {allEntityIds.length === 0 && (
                        <div style={s.emptyEntities}>
                            No entities yet. Add entities below or update the config to reference
                            some.
                        </div>
                    )}
                    {allEntityIds.map((id) => {
                        const value = entityValues[id] ?? '';
                        const isActive = activeEntities.includes(id);
                        return (
                            <div key={id} style={s.entityRow}>
                                <div style={s.entityHeader}>
                                    <span
                                        style={{
                                            ...s.entityLabel,
                                            opacity: isActive ? 1 : 0.5,
                                        }}
                                    >
                                        {id}
                                        {isActive && <span style={s.activeBadge}>active</span>}
                                    </span>
                                    <button
                                        type="button"
                                        style={s.removeButton}
                                        onClick={() => removeEntity(id)}
                                        title="Remove entity"
                                    >
                                        x
                                    </button>
                                </div>
                                <input
                                    style={s.input}
                                    value={value}
                                    onChange={(e) => updateEntity(id, e.target.value)}
                                    placeholder="entity state value"
                                />
                            </div>
                        );
                    })}
                    <div style={s.addRow}>
                        <input
                            style={{ ...s.input, flex: 1 }}
                            value={newEntityId}
                            onChange={(e) => setNewEntityId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addEntity()}
                            placeholder="sensor.new_entity"
                        />
                        <button type="button" style={s.addButton} onClick={addEntity}>
                            Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
