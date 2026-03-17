export const parseQueryFromLocation = () => {
    const emptyQuery = {
        id: null,
        format: null,
        dependent: null,
        fields: [],
        q: ''
    };
    const queryKeys = Object.keys(emptyQuery);
    let query = {};
    let intialParsed = location.search.substring(1).split('&');

    intialParsed.forEach(parsedItem => {
        const [key, value] = parsedItem.split('=').map(decodeURIComponent);
        if (queryKeys.includes(key) && value.length) {
            query[key] = value;
        }
    });

    if ('fields' in query) {
        query.fields = query.fields.split(',');
    }

    if ('dependent' in query) {
        // NOTE: we're expecting dependent=0, which means "Show only unique styles"
        query.dependent = parseInt(query.dependent);
    }

    query = {
        ...emptyQuery,
        ...query
    }

    query.search = query.q;
    delete query.q;

    return query;
}

export const updateHistoryFromQuery = (query) => {
    if (window.history && window.history.replaceState) {
        let historyEntry = [];
        if (query.id && query.id.length) {
            historyEntry.push(`id=${encodeURIComponent(query.id)}`);
        }

        if (query.search && query.search.length) {
            historyEntry.push(`q=${encodeURIComponent(query.search)}`);
        }

        if (query.fields && query.fields.length) {
            historyEntry.push(`fields=${encodeURIComponent(query.fields)}`);
        }

        if (query.format && query.format.length) {
            historyEntry.push(`format=${encodeURIComponent(query.format)}`);
        }

        if (typeof query.dependent !== 'undefined' && query.dependent !== null) {
            historyEntry.push(`dependent=${encodeURIComponent(query.dependent)}`);
        }

        // Fails in XUL browser in Firefox 60, so wrap in try/catch
        try {
            window.history.replaceState(
                null,
                '',
                window.location.pathname
                + (historyEntry.length ? '?' + historyEntry.join('&') : '')
                + window.location.hash
            );
        }
        catch (e) {
            // Do nothing
        }
    }
}