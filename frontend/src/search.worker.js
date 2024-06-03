// NOTE: worker code is not babelified

var allStyles = {};

self.addEventListener('message', function (ev) {
    var [command, payload] = ev.data;
    switch (command) {
        case 'LOAD':
            allStyles = payload.styles;
            self.postMessage(['READY', null]);
            break;
        case 'SEARCH':
            self.postMessage(['COMPLETE_SEARCH', search(payload.query)]);
            break;
    }
});


function search(query) {
    var formats;
    var fields;
    var queryKeys = Object.keys(query),
        queryFormat,
        queryId,
        queryDependent,
        queryFields,
        querySearch;

    fields = new Set();
    formats = new Set();

    if (queryKeys.indexOf('id') > -1 && query.id !== null) {
        queryId = query.id;
    }

    if (queryKeys.indexOf('format') > -1 && query.format !== null) {
        queryFormat = query.format;
    }

    if (queryKeys.indexOf('dependent') > -1 && query.dependent !== null) {
        queryDependent = query.dependent;
    }

    if (queryKeys.indexOf('fields') > -1 && query.fields.length) {
        queryFields = query.fields;
    }

    if (queryKeys.indexOf('search') > -1 && query.search !== null && query.search.length) {
        querySearch = query.search;
        var matches = querySearch.match(/id:\s*([\w-]*)/i);
        if (matches) {
            queryId = matches[1].trim();
            querySearch = querySearch.slice(0, matches.index) + querySearch.slice(matches.index + matches[0].length);
            querySearch = querySearch.trim();
        }
    }
    let count = 0;
    let queryMatches = allStyles.map(item => {
        var visible = true;

        if (typeof queryId !== 'undefined') {
            visible = visible && item.name === queryId;
        }
        if (typeof queryFormat !== 'undefined') {
            visible = visible && item.categories.format === queryFormat;
        }
        if (typeof queryDependent !== 'undefined') {
            visible = visible && !!item.dependent === !!queryDependent;
        }
        if (typeof queryFields !== 'undefined') {
            visible = visible && queryFields.every(field => item.categories.fields.includes(field));
        }
        if (typeof querySearch !== 'undefined') {
            var queryLow = querySearch.toLowerCase();
            var queryLowParts = queryLow.split(/\s+/);
            visible = visible
                && queryLowParts.every((part) => {
                    return item.name.toLowerCase().includes(part)
                        || item.title.toLowerCase().includes(part)
                        || (item.titleShort && item.titleShort.toLowerCase().includes(part));
                });
        }

        if (visible) {
            item.categories.fields.forEach(field => {
                fields.add(field);
            });

            formats.add(item.categories.format);
        }
        if(visible) {
            count++;
        }
        return visible;
    });

    return { count, queryMatches, formats: Array.from(formats).sort(), fields: Array.from(fields).sort() };
}