import { Component, ErrorInfo, ReactNode } from 'react';

type Props = {
    cardKey: string;
    children: ReactNode;
};

type State = {
    error: Error | null;
};

export class CardErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(`[hass-react] Error in card "${this.props.cardKey}":`, error, info);
    }

    render() {
        if (this.state.error) {
            return (
                <div style={{ color: 'red', padding: '8px', fontSize: '12px' }}>
                    Card error: {this.state.error.message}
                </div>
            );
        }
        return this.props.children;
    }
}
