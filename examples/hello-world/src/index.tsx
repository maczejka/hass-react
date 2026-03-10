import { Card, defineCard, useEntity } from '@maczejka/hass-react';

type HelloWorldConfig = {
    entities: string[];
};

export const HelloWorldEntity = ({ entityId }: { entityId: string }) => {
    const value = useEntity({ entityId });
    return (
        <div>
            {entityId}:{value}
        </div>
    );
};

export const HelloWorld = ({ entities }: HelloWorldConfig) => {
    return (
        <div>
            Entities:
            {entities.map((entityId) => (
                <HelloWorldEntity key={entityId} entityId={entityId} />
            ))}
        </div>
    );
};

export const HelloWorldCard: Card<HelloWorldConfig> = {
    key: 'hello-world-card-react',
    entities: (config) => config.entities,
    Component: HelloWorld,
};

defineCard(HelloWorldCard);
