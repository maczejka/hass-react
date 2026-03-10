import { CardPlayground } from '@maczejka/hass-react/storybook';
import { InferOutput } from 'valibot';

import { configSchema, HelloWorld, HelloWorldEditor } from './index';

type Config = InferOutput<typeof configSchema>;

export default {
    title: 'Hello World',
};

export const Playground = () => (
    <CardPlayground
        card={{
            schema: configSchema,
            entities: (config: Config) => config.entities,
            Component: HelloWorld,
            Editor: HelloWorldEditor,
        }}
        initialConfig={{
            entities: ['sensor.temperature', 'sensor.humidity', 'light.living_room'],
        }}
        initialEntities={{
            'sensor.temperature': '22.5',
            'sensor.humidity': '48',
            'light.living_room': 'on',
        }}
    />
);
