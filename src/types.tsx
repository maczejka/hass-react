import { ComponentType } from 'react';

export type HassState = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- HA entity states are dynamic
    state: any;
};

export type HassObject = {
    states: Record<string, HassState | undefined>;
};

export type Card<TConfig> = {
    key: string;
    entities: (config: TConfig) => string[];
    Component: ComponentType<TConfig>;
};
