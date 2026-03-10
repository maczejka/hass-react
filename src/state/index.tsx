import { useEffect } from 'react';

import {
    createStore,
    createContainer,
    createStateHook,
    createActionsHook,
    StoreActionApi,
} from 'react-sweet-state';

import { HassObject } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- HA entity states are dynamic
type State = Record<string, any>;

type ContainerProps = {
    hass: HassObject;
    entities: string[] | undefined;
};

const syncHass =
    (hass: HassObject, entities: string[] | undefined) =>
    ({ setState }: StoreActionApi<State>) => {
        const newState: State = {};
        (entities || []).forEach((entityId) => {
            newState[entityId] = hass.states[entityId]?.state || 'unavailable';
        });
        setState({ ...newState });
    };

const initialState: State = {};
const Store = createStore({
    initialState,
    actions: {
        syncHass,
    },
});

export const useActions = createActionsHook(Store);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mocked values can be any type
export const useMockedEntityValue = (id: string, value: any) => {
    const { syncHass: syncHassAction } = useActions();

    useEffect(() => {
        syncHassAction(
            {
                states: {
                    [id]: {
                        state: value,
                    },
                },
            },
            [id],
        );
    }, [id, value, syncHassAction]);
};

export const useEntity = createStateHook(Store, {
    selector: (state, { entityId }: { entityId: string | undefined }) => {
        if (!entityId) {
            return undefined;
        }
        return state[entityId];
    },
});

export const createHassStore = () => {
    const entities = [];
    const registerEntityListener = (entityId: string) => {
        entities.push(entityId);
    };

    const handleProps =
        () =>
        ({ dispatch }: StoreActionApi<State>, { hass, entities: entityList }: ContainerProps) => {
            dispatch(syncHass(hass, entityList));
        };

    const Container = createContainer(Store, {
        onUpdate: handleProps,
        onInit: handleProps,
    });

    return { Store, Container, registerEntityListener };
};
