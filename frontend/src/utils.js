'use strict';

export function closest(el, fn) {
	return el && (fn(el) ? el : closest(el.parentNode, fn));
}