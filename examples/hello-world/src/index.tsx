import { defineCard, EditorProps, useEntity } from '@maczejka/hass-react';
import * as v from 'valibot';

export const configSchema = v.object({
    entities: v.array(v.string()),
});

type Config = v.InferOutput<typeof configSchema>;

export const HelloWorldEntity = ({ entityId }: { entityId: string }) => {
    const value = useEntity({ entityId });
    return (
        <div>
            {entityId}:{value}
        </div>
    );
};

export const HelloWorld = ({ entities }: Config) => {
    return (
        <div>
            Entities:
            {entities.map((entityId) => (
                <HelloWorldEntity key={entityId} entityId={entityId} />
            ))}
        </div>
    );
};

export const HelloWorldEditor = ({ config, onChange, hass }: EditorProps<Config>) => {
    const availableEntities = Object.keys(hass.states);

    const addEntity = (entityId: string) => {
        if (!config.entities.includes(entityId)) {
            onChange({ ...config, entities: [...config.entities, entityId] });
        }
    };

    const removeEntity = (entityId: string) => {
        onChange({ ...config, entities: config.entities.filter((e) => e !== entityId) });
    };

    return (
        <div>
            <h4>Entities</h4>
            {config.entities.map((entityId) => (
                <div key={entityId}>
                    {entityId}
                    <button type="button" onClick={() => removeEntity(entityId)}>
                        Remove
                    </button>
                </div>
            ))}
            <select
                onChange={(e) => {
                    if (e.target.value) addEntity(e.target.value);
                }}
                value=""
            >
                <option value="">Add entity...</option>
                {availableEntities.map((id) => (
                    <option key={id} value={id}>
                        {id}
                    </option>
                ))}
            </select>
        </div>
    );
};

defineCard({
    key: 'hello-world-card-react',
    name: 'Hello World',
    description: 'Example card showing entity values.',
    schema: configSchema,
    entities: (config) => config.entities,
    Component: HelloWorld,
    Editor: HelloWorldEditor,
    getStubConfig: (hass) => ({
        entities: Object.keys(hass.states).slice(0, 1),
    }),
});
