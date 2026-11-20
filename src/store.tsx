import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useSyncExternalStore,
} from 'react';

import { GenericSchema, InferOutput, safeParse } from 'valibot';

import { HassObject, HassState } from './types';

type Listener = () => void;

type EntityState = Record<string, string | undefined>;
type EntityObjects = Record<string, HassState | undefined>;

// ---------------------------------------------------------------------------
// EntityResult — rich return type for useEntity
// ---------------------------------------------------------------------------

export type EntityResult<T = unknown> = {
    /** Parsed/validated value. `undefined` when the entity is unavailable or fails validation. */
    value: T | undefined;
    /** Raw state string from Home Assistant. `undefined` when the entity is missing entirely. */
    rawValue: string | undefined;
    /** Entity exists in Home Assistant and its state is not `unavailable` or `unknown`. */
    isAvailable: boolean;
    /** Value conforms to the provided schema. Always `true` when no schema is given. */
    isValid: boolean;
};

// ---------------------------------------------------------------------------
// Entity store
// ---------------------------------------------------------------------------

export function createEntityStore() {
    // Two views of the same entities: state strings (useEntity — re-render only when the state text changes) and
    // the full state objects (useEntityState — HA replaces an entity's object whenever state or attributes change,
    // so identity comparison is enough).
    let state: EntityState = {};
    let objects: EntityObjects = {};
    const listeners = new Set<Listener>();

    const notify = () => {
        for (const listener of listeners) {
            listener();
        }
    };

    return {
        getSnapshot: () => state,

        getObjects: () => objects,

        subscribe: (listener: Listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },

        /** Replace the tracked entities with the given ones from `hass` (card context). */
        update(hass: HassObject, entities: string[] | undefined) {
            let changed = false;
            const next: EntityState = {};
            const nextObjects: EntityObjects = {};
            for (const id of entities ?? []) {
                const obj = hass.states[id];
                if (state[id] !== obj?.state || objects[id] !== obj) {
                    changed = true;
                }
                next[id] = obj?.state;
                nextObjects[id] = obj;
            }
            if (changed || Object.keys(state).length !== Object.keys(next).length) {
                state = next;
                objects = nextObjects;
                notify();
            }
        },

        /** Set one entity, keeping all others (mocks / tests). `undefined` = entity missing. */
        patch(id: string, obj: HassState | undefined) {
            state = { ...state, [id]: obj?.state };
            objects = { ...objects, [id]: obj };
            notify();
        },
    };
}

export type EntityStore = ReturnType<typeof createEntityStore>;

// Fallback store for use outside a card context (e.g. Storybook)
const fallbackStore = createEntityStore();
export const EntityStoreContext = createContext<EntityStore>(fallbackStore);

// ---------------------------------------------------------------------------
// useEntity
// ---------------------------------------------------------------------------

/** With a schema — value type is inferred from the schema output. */
export function useEntity<TSchema extends GenericSchema>(options: {
    entityId: string | undefined;
    schema: TSchema;
    validate?: boolean;
}): EntityResult<InferOutput<TSchema>>;

/** Without a schema — value is the raw state string. */
export function useEntity(options: { entityId: string | undefined }): EntityResult<string>;

export function useEntity({
    entityId,
    schema,
    validate = true,
}: {
    entityId: string | undefined;
    schema?: GenericSchema;
    validate?: boolean;
}): EntityResult {
    const store = useContext(EntityStoreContext);

    const rawValue = useSyncExternalStore(
        store.subscribe,
        useCallback(
            () => (entityId ? store.getSnapshot()[entityId] : undefined),
            [store, entityId],
        ),
    );

    return useMemo(() => {
        if (entityId === undefined) {
            return { value: undefined, rawValue: undefined, isAvailable: false, isValid: true };
        }

        const isAvailable =
            rawValue !== undefined && rawValue !== 'unavailable' && rawValue !== 'unknown';

        if (!isAvailable) {
            return { value: undefined, rawValue, isAvailable, isValid: true };
        }

        if (schema && validate) {
            const result = safeParse(schema, rawValue);
            return {
                value: result.success ? result.output : undefined,
                rawValue,
                isAvailable,
                isValid: result.success,
            };
        }

        return { value: rawValue, rawValue, isAvailable, isValid: true };
    }, [entityId, rawValue, schema, validate]);
}

// ---------------------------------------------------------------------------
// createEntityHook — factory for schema-bound useEntity wrappers
// ---------------------------------------------------------------------------

/** Creates a typed `useEntity` wrapper with a baked-in schema. */
export function createEntityHook<TSchema extends GenericSchema>(schema: TSchema) {
    return (options: { entityId: string | undefined; validate?: boolean }) =>
        useEntity({ ...options, schema });
}

// ---------------------------------------------------------------------------
// useEntityState — state + attributes + timestamps
// ---------------------------------------------------------------------------

export type EntityStateResult = {
    /** Raw state string. `undefined` when the entity is missing entirely. */
    state: string | undefined;
    /** Entity attributes; `{}` when missing. */
    attributes: Record<string, unknown>;
    /** Last state change, `undefined` when unknown (e.g. mocks without timestamps). */
    lastChanged: Date | undefined;
    /** Last state or attribute change. */
    lastUpdated: Date | undefined;
    /** Entity exists and its state is not `unavailable` or `unknown`. */
    isAvailable: boolean;
    /** The state object as Home Assistant delivers it. */
    raw: HassState | undefined;
};

const toDate = (iso: string | undefined) => {
    if (!iso) {
        return undefined;
    }
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? undefined : d;
};

/**
 * Reads the full state of one entity: state, attributes, last_changed / last_updated.
 * Re-renders only when that entity's state object changes.
 */
export function useEntityState({ entityId }: { entityId: string | undefined }): EntityStateResult {
    const store = useContext(EntityStoreContext);

    const raw = useSyncExternalStore(
        store.subscribe,
        useCallback(() => (entityId ? store.getObjects()[entityId] : undefined), [store, entityId]),
    );

    return useMemo(() => {
        const state = raw?.state === undefined || raw?.state === null ? undefined : String(raw.state);
        return {
            state,
            attributes: raw?.attributes ?? {},
            lastChanged: toDate(raw?.last_changed),
            lastUpdated: toDate(raw?.last_updated ?? raw?.last_changed),
            isAvailable: state !== undefined && state !== 'unavailable' && state !== 'unknown',
            raw,
        };
    }, [raw]);
}

// ---------------------------------------------------------------------------
// Mocks (Storybook / tests)
// ---------------------------------------------------------------------------

/**
 * Injects a mock entity value into the store for Storybook/testing.
 *
 * - `string` — entity exists in HA with that state (pass `'unavailable'` or `'unknown'` to
 *   simulate those HA states).
 * - `null` — entity is missing from `hass.states` entirely.
 *
 * Several mocks in one story add up (each one only sets its own entity).
 */
export function useMockedEntityValue(id: string, value: string | null) {
    const store = useContext(EntityStoreContext);
    useEffect(() => {
        store.patch(id, value === null ? undefined : { state: value });
    }, [store, id, value]);
}

/**
 * Injects a full mock state object (attributes, timestamps) — the counterpart of `useEntityState`.
 * `null` — entity is missing. Pass a memoized / constant object to avoid re-render loops.
 */
export function useMockedEntityState(id: string, value: HassState | null) {
    const store = useContext(EntityStoreContext);
    useEffect(() => {
        store.patch(id, value === null ? undefined : value);
    }, [store, id, value]);
}
