'use strict';
require('core-js/es6/promise');
require('whatwg-fetch');
import intersection from 'lodash/intersection';
import { mountToDom } from 'vidom';
import AppComponent from './AppComponent.js';
import AppState from './AppState.js';


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
	let query = {};
	let intialParsed = location.search.substr(1).split('&');
	intialParsed.forEach(parsedItem => {
		parsedItem = parsedItem.split('=');
		query[decodeURIComponent(parsedItem[0])] = decodeURIComponent(parsedItem[1] || '');
	});

	if(query['fields']) {
		query.fields = query.fields.split(',');
	}

	if(query['q']) {
		query.initialSearch = query.search = query.q;
		delete query.q;
	}

	if(query['dependent']) {
		query['dependent'] = parseInt(query['dependent'], 10);
	}

	this.state = new AppState({
		styles: [],
		formats: [],
		fields: [],
		query: query,
		fetching: true
	});

	this.mount();

	let t0 = performance.now();
	fetch('/styles-files/styles.json').then(response => {
		if(response.status >= 200 && response.status < 300) {
			response.json().then(styles => {
				let t1 = performance.now();
				if(process.env.NODE_ENV === 'development') {
					console.log('Fetching json took ' + (t1 - t0) + ' ms.');
				}	
				this.state.setState({
					fetching: false
				}, true);
				
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
		if(process.env.NODE_ENV === 'development') {
			console.log('Mounting vidom took ' + (t1 - t0) + ' ms.');	
		}
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
	if(process.env.NODE_ENV === 'development') {
		console.log('Filtering took ' + (t1 - t0) + ' ms.');
	}
	
	this.state.setState({
		styles: filtered,
		fields: fields,
		formats: formats,
		query: query
	});
}

