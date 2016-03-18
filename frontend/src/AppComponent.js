'use strict';
import extend from 'lodash/extend';
import debounce from 'lodash/debounce';
import { node } from 'vidom';
import { Component } from 'vidom';
import { closest, isElementInViewport} from './utils.js';

export default class AppComponent extends Component {
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
					}).children(this.state && !this.state.fetching && this.state.count ? `${this.state.count} styles found:` : null),
				node('ul')
					.attrs({
						className: 'style-list'
					})
					.children(this.items ? this.items : [])
			]);
	}

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
			this.getDomNode().querySelector('#search-field').focus();
		});
	}

	displayPreview(e) {
		let listElement = closest(e.target, el => el.tagName === 'LI');
		let style = this.state.styles[listElement.getAttribute('data-index')];

		if(e.target.classList.contains('title') && !this.popover) {
			this.popover = document.createElement('div');
			this.popover.innerHTML = 'Loading preview...';
			this.popover.classList.add('style-tooltip');
			this.popover.style.top = `${e.target.offsetTop}px`;
			this.popover.style.left = `${e.target.offsetLeft + 0.5 * e.target.getBoundingClientRect().width}px`;
			this.popover.addEventListener('mouseout', this.hidePreview.bind(this))
			document.body.appendChild(this.popover);
			let previewUrl = `/styles-files/previews/bib/${style.dependent ? 'dependent/' : ''}${style.name}.html`;
			fetch(previewUrl).then(response => {
				if(response.status >= 200 && response.status < 300) {
					response.text().then(text => {
						this.popover.innerHTML = text;
						if(!isElementInViewport(this.popover)) {
							this.popover.style.top = `${e.target.offsetTop - this.popover.getBoundingClientRect().height}px`;
						}
					})
				}
			});
		}

		if(e.target.tagName === 'LI' & !this.sourceButton) {
			this.sourceButton = document.createElement('a');
			this.sourceButton.href = style.href + (style.href.indexOf('?') == -1 ? '?' : '&') + 'source=1';
			this.sourceButton.classList.add('style-view-source');
			this.sourceButton.innerText = 'View Source';
			e.target.appendChild(this.sourceButton);
		}
	}

	hidePreview() {
		if(this.popover && !document.querySelectorAll('.style-tooltip:hover, .title:hover').length) {
			document.body.removeChild(this.popover);
			delete this.popover;
		}

		if(this.sourceButton && !document.querySelectorAll('.style-tooltip:hover, li:hover').length) {
			this.sourceButton.parentNode.removeChild(this.sourceButton);
			delete this.sourceButton;
		}
	}

	getItem(style, index, visible) {
		return node('li')
			.attrs({
				'data-index': index,
				onMouseOver: this.displayPreview.bind(this),
				onMouseOut: this.hidePreview.bind(this),
				className: style.visible ? 'style-visible' : 'style-hidden'
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
						className: 'metadata',
					})
					.children(`(${style.updated})`)
			]);
	}

	onStateChange(diff, state) {
		let t0 = performance.now();
		this.state = state;
		if(diff.indexOf('styles') > -1) {
			// this.items = this.state.styles.map((style, index) => this.getItem(style, index));
			this.items = this.zsr.styles.map((style, index) => {
				let visible = this.state.styles.indexOf(style) > -1;
				return this.getItem(style, index, visible);
			});
		}
		let t1 = performance.now();
		if (process.env.NODE_ENV === 'development') {
			console.log('Building a new virtual dom for items took ' + (t1 - t0) + ' ms.');
		}
		this._update();
	}

	_update(cb) {
		let t0 = performance.now();
		this.update(() => {
			let t1 = performance.now();
			if (process.env.NODE_ENV === 'development') {
				console.log('Rendering took ' + (t1 - t0) + ' ms.');
			}
			if(cb) {
				cb.apply(this, arguments);
			}
		});
	}

	 constructor(zsr) {
		super();
		this.onQuery = debounce((query) => {
			this.zsr.search(extend({}, this.state.query, query));
		}, 150);
	 	this.zsr = zsr;
	 	this.state = this.zsr.state
	 	this.state.onChange(this.onStateChange.bind(this));
	 	// this.items = this.state.styles.map(style => itemTpl(style.title, style.href, style.updated));
	 	
	 }
}