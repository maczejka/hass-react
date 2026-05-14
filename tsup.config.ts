import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.tsx',
        storybook: 'src/storybook/index.tsx',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'es2020',
    treeshake: true,
    external: ['react', 'react-dom', 'react-dom/client', 'styled-components', 'valibot', 'react-rnd'],
});
