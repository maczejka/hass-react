import ReactDOM from 'react-dom/client';
import { StyleSheetManager } from 'styled-components';

import { createHassStore } from './state';
import { Card, HassObject } from './types';

export * from './state';
export * from './types';

export const defineCard = <TConfig,>(card: Card<TConfig>) => {
    const { Container, registerEntityListener } = createHassStore();

    class CardClass extends HTMLElement {
        config: TConfig | undefined = undefined;

        content: ReactDOM.Root | null = null;
        styleSlot: HTMLElement | null = null;

        entities: string[] | undefined = undefined;

        setConfig(config: TConfig) {
            this.config = config;
            this.entities = card.entities(config);
            this.entities.forEach(registerEntityListener);
        }

        set hass(hass: HassObject) {
            // done once
            if (!this.content) {
                this.styleSlot = document.createElement('section');
                const renderIn = document.createElement('div');
                this.styleSlot.appendChild(renderIn);
                this.appendChild(this.styleSlot);
                this.content = ReactDOM.createRoot(renderIn);
            }
            // done repeatedly
            if (!this.config || !this.styleSlot) {
                return;
            }

            this.content.render(
                <StyleSheetManager target={this.styleSlot}>
                    <Container hass={hass} entities={this.entities}>
                        <card.Component {...this.config} />
                    </Container>
                </StyleSheetManager>,
            );
        }
    }

    customElements.define(card.key, CardClass);
};
