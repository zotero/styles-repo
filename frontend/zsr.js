'use strict';
require('core-js/es6/promise');
require('whatwg-fetch');
import debounce from 'lodash/debounce';
import extend from 'lodash/extend';
import { node, mountToDom, Component } from 'vidom';

var itemTpl = function(title, href, updated) {
	 return node('li')
		.children([
			node('a')
				.key('title')
				.attrs({
					className: 'title',
					href: href,
				})
				.children(title),
			node('span')
				.key('metadata')
				.attrs({
					className: 'metadata',
				})
				.children(updated)
		]);
}

// var fieldTpl = function(field) {
// 	return node('li').children(field);
// }

// var formatTpl = function(format) {
// 	return node('li').children(format);
// }

class AppComponent extends Component {
	onRender() {
		return node('div')
			.children([
				node('div')
					.attrs({
						className: 'search-pane'
					}).children([
						node('p').children([
							node('input')
								.attrs({
									type: 'search',
									placeholder: 'Title Search',
									value: this.state && this.state.query.search || '',
									onKeyUp: e => this.onKeyUp(e)
								})
						]),
						node('p').children(node('ul')
							.children(this.state && this.state.formats.map(field => {
								return node('li')
									.attrs({
										onClick: e => this.onClick('field', e)
									})
									.children(field);
							}))),
						node('p').children(node('ul')
							.children(this.state && this.state.fields.map(format => {
								return node('li')
									.attrs({
										onClick: e => this.onClick('format', e)
									})
									.children(format);
							}))),
						node('p').children(
							node('label')
								.children(
									node('input')
								)	
						)
					]),
				node('ul')
					.children(this.items ? this.items : [])
			]);
	}

	onKeyUp(e) {
		this._update();
		let query = {
			search: e.target.value
		};
		this.onQuery(query);
	}

	onClick(type, e) {
		console.log(e);
	}

	onMount() {
		this._update();
	}

	onStateChange(diff, state) {
		this.state = state;
		if(diff.indexOf('styles') > -1) {
			this.items = this.state.styles.map(style => itemTpl(style.title, style.href, style.updatedFormatted));
		}

		// if(diff.indexOf('fields') > -1) {
		// 	this.fields = this.state.fields.map(field => fieldTpl(field));
		// }

		// if(diff.indexOf('formats') > -1) {
		// 	this.formats = this.state.formats.map(format => formatTpl(format));
		// }
		this._update();
	}

	_update() {
		let t0 = performance.now();
		this.update(() => {
			let t1 = performance.now();
			console.log('Rendering took ' + (t1 - t0) + ' ms.');
		});
	}


	 constructor(zsr) {
		super();
		this.onQuery = debounce((query) => {
			console.log('bounced!');
			let qqq = extend({}, this.state.query, query);
			this.zsr.search(qqq);
		}, 150);
	 	this.zsr = zsr;
	 	this.state = this.zsr.state
	 	this.state.onChange(this.onStateChange.bind(this));
	 	this.items = this.state.styles.map(style => itemTpl(style.title, style.href, style.updatedFormatted));
	 	// this.fields = this.state.fields.map(field => fieldTpl(field));
	 	// this.formats = this.state.formats.map(format => formatTpl(format));
	 }
}

class AppState {
	constructor(properties) {
		this._changeHandlers = [];
		// _.extend(this, properties);
		this.setState(properties);
	}

	onChange(callback) {
		this._changeHandlers.push(callback);	
	}

	setState(properties) {
		let diff = [];
		for(let i=0, keys=Object.keys(properties); i<keys.length; i++) {
			if(this[keys[i]] !== properties[keys[i]]) {
				diff.push(keys[i]);
				this[keys[i]] = properties[keys[i]];
			}
		}
		// _.extend(this, properties);
		this._changeHandlers.forEach(handler => handler(diff, this));
	}
}

function fieldsAndFormats(styles) {
	var formatGroups = {};
	var fieldGroups = {};

	styles.forEach(style => {
		if(!formatGroups[style.categories.format]) {
			formatGroups[style.categories.format] = [];
		}
		formatGroups[style.categories.format].push(style);

		style.categories.fields.forEach(field => {
			if(!fieldGroups[field]) {
				fieldGroups[field] = [];
			}
			fieldGroups[field].push(style);
		});
	});

	return [Object.keys(fieldGroups), Object.keys(formatGroups)];
}

module.exports = function ZSR(container) {
	fetch('/json.php').then(response => {
		if(response.status >= 200 && response.status < 300) {
			response.json().then(styles => {
				console.log(styles);
				let t0 = performance.now();
				this.container = container;
				this.styles = styles;
				this.formatGroups = {};// _.groupBy(this.styles, style => style.categories.format);
				this.fieldGroups = {};

				[this.fields, this.formats] = fieldsAndFormats(styles);

				this.state = new AppState({
					styles: this.styles,
					formats: this.formats,
					fields: this.fields,
					query: {}
				});

				let t1 = performance.now();
				console.log('Initial setup took ' + (t1 - t0) + ' ms.');
				this.mount();
			});
		}
	})
}

module.exports.prototype.mount = function(styles) {
	let t0 = performance.now();
	let ac = new AppComponent(this);

	
	mountToDom(this.container, ac, () => {
		let t1 = performance.now();
		console.log('Mounting vidom took ' + (t1 - t0) + ' ms.');	
	});
}

module.exports.prototype.search = function(query) {
	let t0 = performance.now();
	var filtered = this.styles;

	if(query) {
		let queryKeys = Object.keys(query);
		if(queryKeys.indexOf('format') > -1) {
			filtered = this.formats[query.format] || filtered;
		}

		if(queryKeys.indexOf('dependent') > -1) {
			filtered = this.styles.filter(item => !!query.dependent === !!item.dependent);
		}

		if(queryKeys.indexOf('fields') > -1) {
			filtered = filtered.filter(item => {
				let result = false;
				item.categories.fields.forEach(field => {
					if(query.fields.indexOf(field) > -1) {
						result = true;
					}
				});
				return result;
			});
		}

		if(queryKeys.indexOf('search') > -1) {
			filtered = this.styles.filter(item => {
				let queryLow = query.search.toLowerCase();
				return item.name.toLowerCase().indexOf(queryLow) > -1
				|| item.title.toLowerCase().indexOf(queryLow) > -1
				|| (item.titleShort && item.title.toLowerCase().indexOf(queryLow) > -1);
			});
		}
	}

	let [fields, formats] = fieldsAndFormats(filtered);

	let t1 = performance.now();
	console.log('Filtering took ' + (t1 - t0) + ' ms.');
	this.state.setState({
		'styles': filtered,
		'fields': fields,
		'formats': formats
	});
}

