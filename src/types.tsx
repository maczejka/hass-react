import { ComponentType } from 'react';

import { GenericSchema, InferOutput } from 'valibot';

// --- Home Assistant types ---

export type HassState = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- HA entity states are dynamic
    state: any;
};

export type HassObject = {
    states: Record<string, HassState | undefined>;
};

// --- Editor types ---

export type EditorProps<TConfig> = {
    config: TConfig;
    onChange: (config: TConfig) => void;
    hass: HassObject;
};

// --- Card definition types ---

/** Schema-based card definition — config type is inferred from the schema. */
export type CardDefinition<TSchema extends GenericSchema> = {
    key: string;
    name: string;
    description?: string;
    schema: TSchema;
    entities: (config: InferOutput<TSchema>) => string[];
    Component: ComponentType<InferOutput<TSchema>>;
    Editor?: ComponentType<EditorProps<InferOutput<TSchema>>>;
    getStubConfig?: (hass: HassObject) => InferOutput<TSchema>;
    cardSize?: number;
};

/** Legacy card definition — config type is provided manually. No schema validation or editor. */
export type Card<TConfig> = {
    key: string;
    name: string;
    description?: string;
    entities: (config: TConfig) => string[];
    Component: ComponentType<TConfig>;
    cardSize?: number;
};
