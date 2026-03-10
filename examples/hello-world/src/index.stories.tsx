import { useMockedEntityValue } from '@maczejka/hass-react';

import { HelloWorldEntity } from './index';

export default {
    Component: HelloWorldEntity,
};

export const HelloWorldEntityExample = () => {
    useMockedEntityValue('foo', 'bar');
    return <HelloWorldEntity entityId="foo" />;
};
