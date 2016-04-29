/*global process*/

'use strict';
import extend from 'lodash/extend';
import debounce from 'lodash/debounce';
import { node } from 'vidom';
import { Component } from 'vidom';


/**
 * Maintain & update the virtual dom based on the current state of the application.
 */
export default class AppComponent extends Component {
	/**
	 * Update the virtual dom to reflect current state of the application
	 * @return {Object} Virtual DOM Node
	 */
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
			}));
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
				}));
		}

		return node('div')
			.children([
				node('div')
					.attrs({
						className: 'search-pane'
					}).children([
						node('div')
							.attrs({
								className: 'search-pane-loading-indicator'
							})
							.children('Loading...'),
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
												checked: this.state && this.state.query.dependent !== null && typeof this.state.query.dependent !== 'undefined' && !this.state.query.dependent,
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
					}).children(this.state && !this.state.fetching && this.state.count ? `${this.state.count} ${this.state.count > 1 ? 'styles' : 'style'} found:` : null),
				node('ul')
					.attrs({
						className: 'style-list'
					})
					.children(this.items ? this.items : [])
			]);
	}

	/**
	 * Handle keyboard input
	 * @param  {KeyboardEvent}
	 */
	onKeyUp(e) {
		// don't react to modifier keys, tab and arrow keys
		if([9, 37, 38, 39, 40, 16, 17, 18, 91, 224].indexOf(e.nativeEvent.keyCode) === -1) {
			this._update();
			let query = {
				search: e.target.value
			};
			this.onQuery(query);	
		}
	}

	/**
	 * Handle selecting fields and filters 
	 * @param  {String} type - Type of the event 'field' or 'format'
	 * @param  {MouseEvent} e
	 */
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

	/**
	 * Handler called on the initial mount onto the real DOM.
	 */
	onMount() {
		this._update(() => {
			this.getDomNode().querySelector('#search-field').focus();
		});
	}

	/**
	 * Generate a virtual dom for a single style item
	 * @param  {Object} - style 
	 * @param  {Number} - index
	 * @return {Object}	- virtual dom node
	 */
	getItem(style, index) {
		return node('li')
			.attrs({
				'data-index': index
			})
			.children([
				node('a')
					.key('title')
					.attrs({
						className: 'title',
						href: style.href
					})
					.children(style.title),
				node('span')
					.key('metadata')
					.attrs({
						className: 'metadata'
					})
					.children(`(${style.updated})`),
				node('a')
					.attrs({
						className: 'style-view-source',
						href: style.href + '?source=1'
					})
					.children('View Source')
			]);
	}

	/**
	 * Handler called on application state change
	 * @param  {Array} diff   - list of all the properties that has changed
	 * @param  {Object} state - new, up-to-date state object
	 */
	onStateChange(diff, state) {
		if (process.env.NODE_ENV === 'development') {
			var t0 = performance.now();
		}
		this.state = state;
		if(diff.indexOf('styles') > -1) {
			this.items = [];
			this.state.styles.forEach((style, index) => {
				if(style.visible) {
					this.items.push(this.getItem(style, index, true));
				}
			});
		}
		
		if (process.env.NODE_ENV === 'development') {
			let t1 = performance.now();
			console.log('Building a new virtual dom for items took ' + (t1 - t0) + ' ms.');
		}
		this._update();
	}

	/**
	 * Minimal wrapper around Vidom's update function to give user a visual feedback
	 * for the duration of the update.
	 * @param  {Function} cb - callback function forwarded to Vidom's update function
	 */
	_update(cb) {
		if (process.env.NODE_ENV === 'development') {
			var t0 = performance.now();
		}
		this.update(() => {
			if (process.env.NODE_ENV === 'development') {
				let t1 = performance.now();
				console.log('Rendering took ' + (t1 - t0) + ' ms.');
			}
			if(cb) {
				cb.apply(this, arguments);
			}
			window.document.body.classList.remove('styles-processing');
		});
	}

	/**
	 * Handler called when user makes a query. Starts visual feedback
	 * and triggers search based on current state and the new query parameters
	 * @param  {Object} query - object containing query parameters
	 */
	onQuery(query) {
		// in modern browsers helps ensure we render visual feedback
		if(requestAnimationFrame) {
			window.document.body.classList.add('styles-processing');
			window.document.body.offsetHeight; // reflow shenanigans
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					this.zsr.search(extend({}, this.state.query, query));
				});
			});
		} else {
			window.document.body.classList.add('styles-processing');
			this.zsr.search(extend({}, this.state.query, query));
		}
	}

	constructor(zsr) {
		super();
		this.onQuery = debounce(this.onQuery, 150);
		this.zsr = zsr;
		this.state = this.zsr.state;
		this.state.onChange(this.onStateChange.bind(this));
	}
}