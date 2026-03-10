# hass-react

Write Home Assistant dashboard cards with React and TypeScript.

`hass-react` bridges the gap between Home Assistant's custom element API and React. You write standard React components, and `defineCard` registers them as custom elements that Home Assistant can render.

## Install

```bash
yarn add @maczejka/hass-react
```

`react`, `react-dom`, and `valibot` are peer/co-dependencies.

## Quick start

Define a Valibot schema for your card config, write a React component, and call `defineCard`:

```tsx
import { defineCard, useEntity } from '@maczejka/hass-react';
import * as v from 'valibot';

const configSchema = v.object({
    entities: v.array(v.string()),
});

type Config = v.InferOutput<typeof configSchema>;

const MyCard = ({ entities }: Config) => (
    <ul>
        {entities.map((id) => (
            <EntityRow key={id} entityId={id} />
        ))}
    </ul>
);

const EntityRow = ({ entityId }: { entityId: string }) => {
    const value = useEntity({ entityId });
    return <li>{entityId}: {value}</li>;
};

defineCard({
    key: 'my-custom-card',       // custom element tag name
    schema: configSchema,
    entities: (config) => config.entities,
    Component: MyCard,
});
```

Bundle the file with webpack (or any bundler) into a single JS file and add it as a resource in your Home Assistant dashboard.

## API

### `defineCard(card)`

Registers a custom element that Home Assistant can use as a dashboard card. Accepts two forms:

**Schema-based (recommended):**

```ts
defineCard({
    key: string;                    // custom element tag name
    schema: ValibotSchema;          // runtime validation + TypeScript inference
    entities: (config) => string[]; // which HA entities the card reads
    Component: React.ComponentType; // card UI — receives config as props
    Editor?: React.ComponentType;   // optional config editor UI
    getStubConfig?: (hass) => config; // initial config for new cards
});
```

All types (`Component` props, `Editor` props, `entities` parameter, `getStubConfig` return) are inferred from the schema. Define the schema once and get full type safety everywhere.

**Legacy (no schema):**

```ts
defineCard({
    key: string;
    entities: (config) => string[];
    Component: React.ComponentType;
});
```

### `useEntity({ entityId })`

React hook that reads a single Home Assistant entity state. Returns the entity's current value, or `undefined` if the entity ID is `undefined`. Components only re-render when their specific entity's value changes.

```tsx
const value = useEntity({ entityId: 'sensor.temperature' });
```

### Config editor

If you provide an `Editor` component, `defineCard` automatically registers a `<key>-editor` custom element. The editor receives `EditorProps<TConfig>`:

```tsx
type EditorProps<TConfig> = {
    config: TConfig;
    onChange: (config: TConfig) => void;
    hass: HassObject;
};
```

Call `onChange` with the new config. Home Assistant picks up the change via a `config-changed` CustomEvent (handled automatically).

## Storybook

`hass-react` ships a `CardPlayground` component for developing cards in Storybook without a running Home Assistant instance.

```bash
yarn add -D @maczejka/hass-react  # if not already installed
```

```tsx
import { CardPlayground } from '@maczejka/hass-react/storybook';

export default { title: 'My Card' };

export const Playground = () => (
    <CardPlayground
        card={{
            schema: configSchema,
            entities: (config) => config.entities,
            Component: MyCard,
            Editor: MyCardEditor,
        }}
        initialEntities={{
            'sensor.temperature': '22.5',
            'sensor.humidity': '48',
        }}
    />
);
```

The playground renders three panels side-by-side:

| Panel | What it does |
|-------|--------------|
| **Configuration** | Your `Editor` component (or a JSON editor if none is provided). Shows schema validation errors. |
| **Preview** | Your card `Component` rendered live with mocked entity data. |
| **Entities** | Auto-populated from `card.entities(config)`. Set mock values for each entity. Add or remove entities manually. |

When you change the config (add an entity, tweak a value), the entities panel automatically picks up new entity IDs from `card.entities(config)`. When you change a mock entity value, the card preview updates immediately.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `card` | `PlaygroundCard` | Same shape as `defineCard` argument (minus `key`). |
| `initialConfig` | `object` | Starting config. Falls back to `getStubConfig` if not provided. |
| `initialEntities` | `Record<string, string>` | Pre-populated entity IDs and their mock values. |

### `useMockedEntityValue(id, value)`

For simpler stories that don't need the full playground, you can mock individual entities:

```tsx
import { useMockedEntityValue } from '@maczejka/hass-react';

export const SimpleStory = () => {
    useMockedEntityValue('sensor.temperature', '22.5');
    return <TemperatureDisplay entityId="sensor.temperature" />;
};
```

## How it works

`defineCard` creates a custom HTML element class and registers it via `customElements.define`. When Home Assistant renders the card:

1. HA calls `setConfig(config)` with the card configuration. If a schema is provided, the config is validated with Valibot's `safeParse`.
2. HA sets the `hass` property repeatedly as state changes. On first set, a React root is created inside the element. Entity states are synced into an internal store using `useSyncExternalStore`.
3. The React component tree is rendered inside a `<section>` element with a `StyleSheetManager` so that `styled-components` styles are scoped to the card.
4. When the element is removed from the DOM (`disconnectedCallback`), the React root is unmounted.

Components subscribe to individual entities via `useEntity`, so only the components that read a changed entity re-render.
