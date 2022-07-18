import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import filesize from 'rollup-plugin-filesize';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import sizes from 'rollup-plugin-sizes';
import { terser } from 'rollup-plugin-terser';

const isProduction = process.env.NODE_ENV?.startsWith('prod');

const config = {
    input: './src/zsr.js',
    output: {
        name: 'ZSR', 
        dir: './build/js',
        format: 'umd',
        sourcemap: !isProduction,
        compact: isProduction
    },
    treeshake: {
        moduleSideEffects: 'no-external',
    },
    plugins: [
        resolve({
            preferBuiltins: false,
            mainFields: ['browser', 'module', 'main'],
            extensions: ['.js', '.jsx', '.wasm'],
        }),
        commonjs(),
        replace({
            preventAssignment: true,
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
        }),
        babel({
            exclude: "node_modules/**",
            extensions: ['.js', '.jsx'],
            babelHelpers: 'bundled'
        }),
        filesize({ showMinifiedSize: false, showGzippedSize: !!process.env.DEBUG }),
    ]
};

if (process.env.DEBUG) {
    config.plugins.splice(-1, 0, sizes());
}

if (isProduction) {
    config.plugins.push(terser({ safari10: true }));
}

export default config;
