'use strict';

export default class AppState {
	constructor(properties) {
		this._changeHandlers = [];
		this.setState(properties);
	}

	onChange(callback) {
		this._changeHandlers.push(callback);	
	}

	setState(properties, silent) {
		let diff = [];
		for(let i=0, keys=Object.keys(properties); i<keys.length; i++) {
			if(this[keys[i]] !== properties[keys[i]]) {
				diff.push(keys[i]);
				this[keys[i]] = properties[keys[i]];
			}
		}
		if(silent !== true) {
			this._changeHandlers.forEach(handler => handler(diff, this));
			if(window.history && window.history.replaceState) {
				let historyEntry = [];
				if(properties.query.search && properties.query.search.length) {
					historyEntry.push(`q=${encodeURIComponent(properties.query.search)}`);
				}

				if(properties.query.fields && properties.query.fields.length) {
					historyEntry.push(`fields=${encodeURIComponent(properties.query.fields)}`);
				}

				if(properties.query.format && properties.query.format.length) {
					historyEntry.push(`format=${encodeURIComponent(properties.query.format)}`);
				}

				if(typeof properties.query.dependent !== 'undefined' && properties.query.dependent !== null) {
					historyEntry.push(`dependent=${encodeURIComponent(properties.query.dependent)}`);
				}

				window.history.replaceState(
					null,
					'',
					window.location.pathname + (historyEntry.length ? '?' + historyEntry.join('&') : '')
				);
			}
		}
	}
}