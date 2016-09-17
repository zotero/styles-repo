/*global process*/

'use strict';
import 'core-js/es6/promise';
import 'whatwg-fetch';
import 'core-js/fn/set';
import 'core-js/fn/array/from';
import Drop from 'tether-drop';
import intersection from 'lodash/intersection';
import { mountToDom } from 'vidom';
import AppComponent from './AppComponent.js';
import AppState from './AppState.js';
import { closest } from './utils.js';

/**
 * Application entry point
 * @param {HTMLElement} container - DOM element where the application will be rendered
 */
function ZSR(container) {
	this.container = container;
	this.tooltips = {};
	let query = {};
	let intialParsed = location.search.substr(1).split('&');
	let propSearchField = this.container.querySelector('.search-field');
	intialParsed.forEach(parsedItem => {
		parsedItem = parsedItem.split('=');
		query[decodeURIComponent(parsedItem[0])] = decodeURIComponent(parsedItem[1] || '');
	});

	if(query['fields']) {
		query.fields = query.fields.split(',');
	}

	if(query['q'] || (propSearchField && propSearchField.value)) {
		// on slow connection handle user input from before js loaded
		if(propSearchField && propSearchField.value) {
			query.initialSearch = query.search = propSearchField.value;
		} else {
			query.initialSearch = query.search = query.q;
		}
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

	this.state.onChange(() => {
		let tooltipKeys = Object.keys(this.tooltips);
		tooltipKeys.forEach(tooltipKey => {
			this.tooltips[tooltipKey].destroy();
			delete this.tooltips[tooltipKey];
		});
	});

	this.container.innerHTML = '';

	this.mount();

	if(process.env.NODE_ENV === 'development') {
		var t0 = performance.now();
	}
	fetch('/styles-files/styles.json').then(response => {
		if(response.status >= 200 && response.status < 300) {
			response.json().then(styles => {
				if(process.env.NODE_ENV === 'development') {
					let t1 = performance.now();
					console.log('Fetching json took ' + (t1 - t0) + ' ms.');
				}	
				this.state.setState({
					fetching: false
				}, true);

				this.fields = new Set();
				this.formats = new Set();

				this.styles = styles;
				this.styles.forEach(style => {
					this.formats.add(style.categories.format);
					style.categories.fields.forEach(field => {
						this.fields.add(field);
					});
				});
				this.search(this.state.query);
			});
		}
	});
}

/**
 * Mount vidom to the actual DOM element and attach event listeners
 * to fetch and display style previews on mouseover
 * @return {[type]} [description]
 */
ZSR.prototype.mount = function() {
	if(process.env.NODE_ENV === 'development') {
		var t0 = performance.now();
	}
	let ac = new AppComponent(this);

	this.container.addEventListener('mouseover', ev => {
		let element = ev.target;
		let listEl = closest(element, el => el.hasAttribute && el.hasAttribute('data-index'));
		if(!listEl) {
			return;
		}
		let index = listEl.getAttribute('data-index');
		
		if(element.classList.contains('title')) {
			if(!this.tooltips[index]) {
				this.tooltips[index] = new Drop({
					target: element,
					content: 'Loading Preview...',
					classes: 'style-tooltip',
					openOn: 'hover',
					closeDelay: 50
				});

				let style = this.styles[index];
				let previewUrl = `/styles-files/previews/combined/${style.dependent ? 'dependent/' : ''}${style.name}.json`;
				fetch(previewUrl).then(response => {
					if(response.status >= 200 && response.status < 300) {
						response.json().then(preview => {
							this.tooltips[index].content.innerHTML =
								'<div class="preview-content">'
								+ '<h3>Citations</h3>'
								+ '<p>' + preview.citation.join(' ') + '</p>'
								+ '<h3>Bibliography</h3>'
								+ preview.bibliography
								+ '</div>';
							this.tooltips[index].position();
						});
					}
				});
				this.tooltips[index].open();
			}
		}
	});
	
	mountToDom(this.container, ac, () => {
		if(process.env.NODE_ENV === 'development') {
			let t1 = performance.now();
			console.log('Mounting vidom took ' + (t1 - t0) + ' ms.');	
		}
	});
};

/**
 * Filter styles for given query and update the App State with the results
 * @param  {Object} query - object defining search criteria. Can contain the following keys:
 */
ZSR.prototype.search = function(query) {
	if(process.env.NODE_ENV === 'development') {
		var t0 = performance.now();
	}
	var filtered;
	var filteredCounter = this.styles && this.styles.length || 0;
	var formats;
	var fields;


	if(!this.styles || !this.styles.length) {
		this.state.setState({
			query: query	
		});
		return;
	}

	if(query) {
		let queryKeys = Object.keys(query),
			queryFormat,
			queryId,
			queryDependent,
			queryFields,
			querySearch;

		fields = new Set();
		formats = new Set();

		if(queryKeys.indexOf('id') > -1 && query.id !== null) {
			queryId = query.id;
		}

		if(queryKeys.indexOf('format') > -1 && query.format !== null) {
			queryFormat = query.format;
		}

		if(queryKeys.indexOf('dependent') > -1 && query.dependent !== null) {
			queryDependent = query.dependent;
		}

		if(queryKeys.indexOf('fields') > -1 && query.fields.length) {
			queryFields = query.fields;
		}

		if(queryKeys.indexOf('search') > -1 && query.search !== null && query.search.length) {
			querySearch = query.search;
			let matches = querySearch.match(/id\:\s*([\w\-]*)/i);
			if(matches) {
				queryId = matches[1].trim();
				querySearch = querySearch.slice(0, matches.index) + querySearch.slice(matches.index + matches[0].length);
				querySearch = querySearch.trim();
			}
		}

		filtered = this.styles.map(item => {
			item.visible = true;

			if(typeof queryId !== 'undefined') {
				item.visible = item.visible && item.name === queryId;
			}

			if(typeof queryFormat !== 'undefined') {
				item.visible = item.visible && item.categories.format === queryFormat;
			}
			if(typeof queryDependent !== 'undefined') {
				item.visible = item.visible && !!item.dependent === !!queryDependent;
			}
			if(typeof queryFields !== 'undefined') {
				item.visible = item.visible && intersection(queryFields, item.categories.fields).length === queryFields.length;
			}
			if(typeof querySearch !== 'undefined') {
				let queryLow = querySearch.toLowerCase();
				item.visible = item.visible
				&& (item.name.toLowerCase().indexOf(queryLow) > -1
				|| item.title.toLowerCase().indexOf(queryLow) > -1
				|| (item.titleShort && item.titleShort.toLowerCase().indexOf(queryLow) > -1));
			}

			if(item.visible) {
				item.categories.fields.forEach(field => {
					fields.add(field);
				});

				formats.add(item.categories.format);			
			} else {
				filteredCounter--;
			}

			return item;

		});		
	} else {
		fields = this.fields;
		formats = this.formats;
	}

	if(process.env.NODE_ENV === 'development') {
		let t1 = performance.now();
		console.log('Filtering took ' + (t1 - t0) + ' ms.');
	}
	
	this.state.setState({
		styles: filtered,
		count: filteredCounter,
		fields: Array.from(fields),
		formats: Array.from(formats),
		query: query
	});
};

module.exports = ZSR; // eslint-disable-line no-undef