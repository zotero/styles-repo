'use strict';
require('core-js/es6/promise');
require('whatwg-fetch');
import debounce from 'lodash/debounce';
import extend from 'lodash/extend';
import intersection from 'lodash/intersection';
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
				.children(`(${updated})`)
		]);
}

class AppComponent extends Component {
	onRender() {
		var formatsList,
			fieldsList;

		if(!this.state || this.state.fetching) {
			formatsList = node('span').children('Loading...');
		} else {
			formatsList = node('ul')
			.attrs({
				className: 'formats-list'
			})
			.children(this.state && this.state.formats.sort().map(format => {
				return node('li')
					.attrs({
						className: this.state && this.state.query.format == format ? 'format-active' : 'a' ,
						onClick: e => this.onClick('format', e)
					})
					.children(format);
			}))
		}


		if(!this.state || this.state.fetching) {
			fieldsList = node('span').children('Loading...');
		} else {
			fieldsList = node('ul')
				.attrs({
					className: 'fields-list'
				})
				.children(this.state && this.state.fields.sort().map(field => {
					return node('li')
						.attrs({
							className: this.state && this.state.query.fields && this.state.query.fields.indexOf(field) > -1 ? 'field-active' : 'a' ,
							onClick: e => this.onClick('fields', e)
						})
						.children(field);
				}))
		}
		
		return node('div')
			.children([
				node('div')
					.attrs({
						className: 'search-pane'
					}).children([
						node('div')
							.attrs({
								className: 'search-pane-col-1'
							})
							.children([
								node('h2')
								.children('Style Search'),
								node('p').children([
									node('input')
										.attrs({
											type: 'search',
											className: 'search-field',
											id: 'search-field',
											placeholder: 'Title Search',
											value: this.state && this.state.query.initialSearch || '',
											onKeyUp: e => this.onKeyUp(e),
											onChange: e => this.onKeyUp(e)
										})
								]),
								node('p').children(
								node('label')
									.attrs({
										className: 'search-unique'
									})
									.children([
										node('input')
											.attrs({
												type: 'checkbox',
												onChange: e => this.onClick('unique', e)
											}),
										node('span')
											.children('Show only unique styles')
									])
								)
							]),
						node('div')
							.attrs({
								className: 'search-pane-col-2'
							})
							.children([
								node('p')
									.children([
										node('strong')
											.children('Format:'),
										formatsList
									]),
								node('p')
									.children([
										node('strong')
											.children('Fields:'),
										fieldsList
									])
							])
					]),
				node('div')
					.attrs({
						className: !this.state || this.state.fetching ? 'styles-loading' : 'style-count'
					}).children(this.state && !this.state.fetching && this.items ? `${this.items.length} styles found:` : null),
				node('ul')
					.attrs({
						className: 'style-list'
					})
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
		let query = {};
		let value = e.target.innerText;
		
		if(type === 'fields') {
			query['fields'] = this.state.query.fields || [];
			if(this.state.query.fields) {
				let pos = this.state.query.fields.indexOf(value);
				if(pos > -1) {
					query['fields'].splice(pos, 1);
				} else {
					query['fields'].push(value);
				}
			} else {
				query['fields'].push(value);
			}
		} else if(type === 'format') {
			if(this.state.query.format === value) {
				query['format'] = null;
			} else {
				query['format'] = value;
			}
		} else if(type === 'unique') {
			query['dependent'] = e.target.checked ? 0 : null;
		}
		this.onQuery(query);
	}

	onMount() {
		this._update(() => {
			console.info(this.getDomNode().querySelector('#search-field'));
			this.getDomNode().querySelector('#search-field').focus();
		});

	}

	onStateChange(diff, state) {
		this.state = state;
		if(diff.indexOf('styles') > -1) {
			this.items = this.state.styles.map(style => itemTpl(style.title, style.href, style.updatedFormatted));
		}

		this._update();
	}

	_update(cb) {
		let t0 = performance.now();
		this.update(() => {
			let t1 = performance.now();
			console.log('Rendering took ' + (t1 - t0) + ' ms.');
			if(cb) {
				cb.apply(this, arguments);
			}
		});
	}


	 constructor(zsr) {
		super();
		this.onQuery = debounce((query) => {
			let qqq = extend({}, this.state.query, query);
			this.zsr.search(qqq);
		}, 150);
	 	this.zsr = zsr;
	 	this.state = this.zsr.state
	 	this.state.onChange(this.onStateChange.bind(this));
	 	this.items = this.state.styles.map(style => itemTpl(style.title, style.href, style.updatedFormatted));
	 }
}

class AppState {
	constructor(properties) {
		this._changeHandlers = [];
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
		this._changeHandlers.forEach(handler => handler(diff, this));
	}
}

function fieldsAndFormats(styles, initial) {
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

	if(initial) {
		return [fieldGroups, formatGroups, Object.keys(fieldGroups), Object.keys(formatGroups)];		
	}

	return [Object.keys(fieldGroups), Object.keys(formatGroups)];
}

module.exports = function ZSR(container) {

	this.container = container;
	

	this.state = new AppState({
		styles: [],
		formats: [],
		fields: [],
		query: {},
		fetching: true
	});

	this.mount();

	let t0 = performance.now();
	fetch('/json.php').then(response => {
		if(response.status >= 200 && response.status < 300) {
			response.json().then(styles => {
				let t1 = performance.now();
				console.log('Fetching json took ' + (t1 - t0) + ' ms.');
				this.state.setState({
					fetching: false
				});
				
				this.styles = styles;
				[this.fieldGroups, this.formatGroups, this.fields, this.formats] = fieldsAndFormats(styles, true);
				this.search(this.state.query);
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

	if(!this.styles || !this.styles.length) {
		this.state.setState({
			query: query	
		});
		return;
	}

	if(query) {
		let queryKeys = Object.keys(query);
		if(queryKeys.indexOf('format') > -1) {
			filtered = this.formatGroups[query.format] || filtered;
		}

		if(queryKeys.indexOf('dependent') > -1 && query.dependent !== null) {
			filtered = filtered.filter(item => !!query.dependent === !!item.dependent);
		}

		if(queryKeys.indexOf('fields') > -1) {
			filtered = filtered.filter(item => {
				return intersection(query.fields, item.categories.fields).length === query.fields.length;
			});
		}

		if(queryKeys.indexOf('search') > -1 && queryKeys[queryKeys.indexOf('search')].length) {
			filtered = filtered.filter(item => {
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
		styles: filtered,
		fields: fields,
		formats: formats,
		query: query
	});
}

