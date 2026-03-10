import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';

import { HassObject } from './types';

type Listener = () => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- HA entity state values are dynamic
type EntityValue = any;
type EntityState = Record<string, EntityValue>;

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
                const value = hass.states[id]?.state ?? 'unavailable';
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

export function useEntity({ entityId }: { entityId: string | undefined }): EntityValue {
    const store = useContext(EntityStoreContext);
    return useSyncExternalStore(
        store.subscribe,
        useCallback(
            () => (entityId ? store.getSnapshot()[entityId] : undefined),
            [store, entityId],
        ),
    );
}

export function useMockedEntityValue(id: string, value: EntityValue) {
    const store = useContext(EntityStoreContext);
    useEffect(() => {
        store.update({ states: { [id]: { state: value } } }, [id]);
    }, [store, id, value]);
}
