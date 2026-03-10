import ReactDOM from 'react-dom/client';
import { StyleSheetManager } from 'styled-components';
import { GenericSchema, InferOutput, safeParse } from 'valibot';

import { CardErrorBoundary } from './error-boundary';
import { createEntityStore, EntityStoreContext } from './store';
import { Card, CardDefinition, EditorProps, HassObject } from './types';

export { useEntity, useMockedEntityValue } from './store';
export type { EntityStore } from './store';
export * from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasSchema<TSchema extends GenericSchema>(
    card: CardDefinition<TSchema> | Card<unknown>,
): card is CardDefinition<TSchema> {
    return 'schema' in card && card.schema !== undefined;
}

function mountRoot(host: HTMLElement) {
    const styleSlot = document.createElement('section');
    const renderIn = document.createElement('div');
    styleSlot.appendChild(renderIn);
    host.appendChild(styleSlot);
    return { styleSlot, root: ReactDOM.createRoot(renderIn) };
}

// ---------------------------------------------------------------------------
// defineCard
// ---------------------------------------------------------------------------

export function defineCard<TSchema extends GenericSchema>(card: CardDefinition<TSchema>): void;
export function defineCard<TConfig>(card: Card<TConfig>): void;
export function defineCard(card: CardDefinition<GenericSchema> | Card<unknown>): void {
    type TConfig = typeof card extends CardDefinition<infer S> ? InferOutput<S> : unknown;

    const schema = hasSchema(card) ? card.schema : undefined;
    const EditorComponent = hasSchema(card) ? card.Editor : undefined;
    const getStubConfig = hasSchema(card) ? card.getStubConfig : undefined;

    // -----------------------------------------------------------------------
    // Card element
    // -----------------------------------------------------------------------

    class CardClass extends HTMLElement {
        private _config: TConfig | undefined;
        private _entities: string[] | undefined;
        private _root: ReactDOM.Root | null = null;
        private _styleSlot: HTMLElement | null = null;
        private _store = createEntityStore();
        private _mounted = false;

        static getConfigElement() {
            if (EditorComponent) {
                return document.createElement(`${card.key}-editor`);
            }
            return undefined;
        }

        static getStubConfig(hass: HassObject) {
            if (getStubConfig) {
                return getStubConfig(hass);
            }
            return undefined;
        }

        setConfig(config: unknown) {
            if (schema) {
                const result = safeParse(schema, config);
                if (result.success) {
                    this._config = result.output as TConfig;
                } else {
                    console.warn(`[hass-react] Invalid config for "${card.key}":`, result.issues);
                    this._config = config as TConfig;
                }
            } else {
                this._config = config as TConfig;
            }
            this._entities = card.entities(this._config as never);
            if (this._mounted) {
                this._render();
            }
        }

        set hass(hass: HassObject) {
            if (!this._root) {
                const { styleSlot, root } = mountRoot(this);
                this._styleSlot = styleSlot;
                this._root = root;
            }
            if (!this._config || !this._styleSlot) {
                return;
            }
            this._store.update(hass, this._entities);
            if (!this._mounted) {
                this._mounted = true;
                this._render();
            }
        }

        disconnectedCallback() {
            this._root?.unmount();
            this._root = null;
            this._mounted = false;
        }

        private _render() {
            if (!this._root || !this._config || !this._styleSlot) {
                return;
            }
            this._root.render(
                <StyleSheetManager target={this._styleSlot}>
                    <EntityStoreContext.Provider value={this._store}>
                        <CardErrorBoundary cardKey={card.key}>
                            <card.Component {...(this._config as Record<string, unknown>)} />
                        </CardErrorBoundary>
                    </EntityStoreContext.Provider>
                </StyleSheetManager>,
            );
        }
    }

    // getCardSize — tells HA how tall the card is (in grid rows)
    if (card.cardSize != null) {
        const size = card.cardSize;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- HA duck-typing
        (CardClass.prototype as any).getCardSize = () => size;
    }

    customElements.define(card.key, CardClass);

    // Register with HA card picker (window.customCards)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- HA global registration
    const customCards = ((window as any).customCards ??= []) as Array<{
        type: string;
        name: string;
        description?: string;
    }>;
    customCards.push({
        type: card.key,
        name: card.name,
        description: card.description,
    });

    // -----------------------------------------------------------------------
    // Editor element (only if Editor component is provided)
    // -----------------------------------------------------------------------

    if (EditorComponent) {
        const Editor = EditorComponent as React.ComponentType<EditorProps<TConfig>>;

        class EditorClass extends HTMLElement {
            private _config: TConfig | undefined;
            private _hass: HassObject | undefined;
            private _root: ReactDOM.Root | null = null;
            private _styleSlot: HTMLElement | null = null;

            setConfig(config: unknown) {
                if (schema) {
                    const result = safeParse(schema, config);
                    this._config = (result.success ? result.output : config) as TConfig;
                } else {
                    this._config = config as TConfig;
                }
                this._render();
            }

            set hass(hass: HassObject) {
                this._hass = hass;
                this._render();
            }

            disconnectedCallback() {
                this._root?.unmount();
                this._root = null;
            }

            private _handleChange = (newConfig: TConfig) => {
                this.dispatchEvent(
                    new CustomEvent('config-changed', {
                        bubbles: true,
                        composed: true,
                        detail: { config: newConfig },
                    }),
                );
            };

            private _render() {
                if (!this._root) {
                    const { styleSlot, root } = mountRoot(this);
                    this._styleSlot = styleSlot;
                    this._root = root;
                }
                if (!this._config || !this._hass || !this._styleSlot) {
                    return;
                }
                this._root.render(
                    <StyleSheetManager target={this._styleSlot}>
                        <CardErrorBoundary cardKey={`${card.key}-editor`}>
                            <Editor
                                config={this._config}
                                onChange={this._handleChange}
                                hass={this._hass}
                            />
                        </CardErrorBoundary>
                    </StyleSheetManager>,
                );
            }
        }

        customElements.define(`${card.key}-editor`, EditorClass);
    }
}
