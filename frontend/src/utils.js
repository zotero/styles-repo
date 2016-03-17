'use strict';

export function isElementInViewport(el) {
	let rect = el.getBoundingClientRect();

	return (
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
		rect.right <= (window.innerWidth || document.documentElement.clientWidth)
	);
}

export function closest(el, fn) {
	return el && (fn(el) ? el : closest(el.parentNode, fn));
}