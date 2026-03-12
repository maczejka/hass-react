import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useSyncExternalStore,
} from 'react';

import { GenericSchema, InferOutput, safeParse } from 'valibot';

import { HassObject } from './types';

type Listener = () => void;

type EntityState = Record<string, string | undefined>;

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
    let state: EntityState = {};
    const listeners = new Set<Listener>();

    const notify = () => {
        for (const listener of listeners) {
            listener();
        }
    };

    return {
        getSnapshot: () => state,

        subscribe: (listener: Listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },

        update(hass: HassObject, entities: string[] | undefined) {
            let changed = false;
            const next: EntityState = {};
            for (const id of entities ?? []) {
                const value = hass.states[id]?.state;
                if (state[id] !== value) {
                    changed = true;
                }
                next[id] = value;
            }
            if (changed) {
                state = next;
                notify();
            }
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
// useMockedEntityValue
// ---------------------------------------------------------------------------

/**
 * Injects a mock entity value into the store for Storybook/testing.
 *
 * - `string` — entity exists in HA with that state (pass `'unavailable'` or `'unknown'` to
 *   simulate those HA states).
 * - `null` — entity is missing from `hass.states` entirely.
 */
export function useMockedEntityValue(id: string, value: string | null) {
    const store = useContext(EntityStoreContext);
    useEffect(() => {
        store.update({ states: { [id]: value === null ? undefined : { state: value } } }, [id]);
    }, [store, id, value]);
}
