const presets = [
	["@babel/preset-env", {
		"debug": !!process.env.DEBUG || false,
		"corejs": { version: 3 },
		"useBuiltIns": "usage"
	}]
];

const plugins = [
	["@babel/plugin-transform-react-jsx", {
		"pragma": "h",
		"pragmaFrag": "Fragment",
	}],
	[require.resolve('babel-plugin-jsx-pragmatic'), {
		module: 'preact',
		export: 'h',
		import: 'h'
	}]
];

module.exports = { plugins, presets };