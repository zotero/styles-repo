import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import filesize from 'rollup-plugin-filesize';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import sizes from 'rollup-plugin-sizes';
import terser from '@rollup/plugin-terser';
import webWorkerLoader from 'rollup-plugin-web-worker-loader';

const isProduction = process.env.NODE_ENV?.startsWith('prod');

const config = {
    input: './src/zsr.jsx',
    output: {
        name: 'ZSR',
        dir: './build/js',
        format: 'iife',
        sourcemap: !isProduction,
        compact: isProduction
    },
    treeshake: {
        preset: 'smallest',
        moduleSideEffects: (id) => {
            if (id.includes('core-js/')) {
                return true;
            }
            return false;
        }
    },
    plugins: [
        webWorkerLoader({
            targetPlatform: 'browser',
            skipPlugins: ['resolve', 'commonjs', 'replace', 'babel', 'sizes', 'filesize']
        }),
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
            include: [
                'src/**',
                // modules below need re-transpiled for compatibility with Safari 10
                'node_modules/@floating-ui/**',
            ],
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
