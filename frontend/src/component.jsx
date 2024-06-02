import { Fragment } from 'preact';
import SearchWorker from 'web-worker:./search.worker.js';
import { useCallback, useEffect, useReducer, useRef } from 'preact/hooks';
import { computePosition, flip, shift } from '@floating-ui/dom';

import { numberFormat, usePrevious, isEmptyQuery } from './utils.js';
import { updateHistoryFromQuery, parseQueryFromLocation } from './location.js';

const searchWorker = new SearchWorker();

const initialState = {
    fetching: true,
    searching: false,
    styles: [],
    fields: [],
    formats: [],
    filtered: {
        styles: [],
        fields: [],
        formats: [],
    },
    count: null,
    workerReady: false,
    initialQueryExecuted: false,
    showPreviewFor: null,
    previewsCache: {},
    query: parseQueryFromLocation()
};


const fetchStyles = async (dispatch) => {
    dispatch({ type: 'BEGIN_FETCH_STYLES' });
    if (process.env.NODE_ENV === 'development') {
        var t0 = performance.now();
    }

    try {
        const response = await fetch('/styles-files/styles.json');
        if (response.status >= 200 && response.status < 300) {
            const styles = await response.json();


            const fields = new Set();
            const formats = new Set();

            styles.forEach(style => {
                formats.add(style.categories.format);
                style.categories.fields.forEach(field => {
                    fields.add(field);
                });
            });

            dispatch({ type: 'RECEIVE_FETCH_STYLES', styles, fields: Array.from(fields).sort(), formats: Array.from(formats).sort() });

            if (process.env.NODE_ENV === 'development') {
                let t1 = performance.now();
                console.log('Fetching & processing styles took ' + (t1 - t0).toFixed(2) + ' ms.');
            }
        } else {
            dispatch({ type: 'FETCH_STYLES_ERROR' });
        }
    } catch (e) {
        console.error(e);
        dispatch({ type: 'FETCH_STYLES_ERROR' });
    }
}

const updateTooltipPosition = (anchor, tooltip) => {
    computePosition(anchor, tooltip, {
        placement: 'bottom-end',
        middleware: [flip({ padding: 10 }), shift()],
    }).then(({ x, y }) => {
        Object.assign(tooltip.style, {
            top: `${y}px`,
            left: `${x}px`,
        })
    });
}

const fetchPreview = async (style, dispatch) => {
    dispatch({ type: 'BEGIN_FETCH_PREVIEW', styleName: style.name });
    let previewUrl = `/styles-files/previews/combined/${style.dependent ? 'dependent/' : ''}${style.name}.json`;
    try {
        const response = await fetch(previewUrl);
        if (response.status >= 200 && response.status < 300) {
            const preview = await response.json();
            dispatch({ type: 'RECEIVE_FETCH_PREVIEW', styleName: style.name, preview });
        } else {
            dispatch({ type: 'FETCH_PREVIEW_ERROR', styleName: style.name });
            console.error('Failed to fetch preview', response);
        }
    } catch (e) {
        dispatch({ type: 'FETCH_PREVIEW_ERROR', styleName: style.name })
        console.error('Failed to fetch preview', e);
    }
}

if (process.env.NODE_ENV === 'development') {
    var beginSearchTime = null;
}

const reducer = (state, action) => {
    switch (action.type) {
        case 'BEGIN_FETCH_STYLES':
            return {
                ...state,
                fetching: true,
            }
        case 'RECEIVE_FETCH_STYLES':
            return {
                ...state,
                fetching: false,
                styles: action.styles,
                fields: action.fields,
                formats: action.formats,
            }
        case 'FETCH_STYLES_ERROR':
            return {
                ...state,
                fetching: false,
                error: true,
            }
        case 'SEARCH_WORKER_READY':
            return {
                ...state,
                workerReady: true,
            }
        case 'BEGIN_SEARCH':
            if (process.env.NODE_ENV === 'development') {
                beginSearchTime = performance.now()
            }
            return {
                ...state,
                searching: true,
            }
        // splitting COMPLETE_SEARCH into two actions so that "Searching..." is kept
        // on screen while DOM is updated (UI feels more responsive on older devices this way)
        case 'APPLY_SEARCH':
            return {
                ...state,
                initialQueryExecuted: true,
                count: (action.filtered.styles ?? state.styles).length,
                filtered: {
                    styles: action.filtered.styles ?? state.styles,
                    fields: action.filtered.fields ?? state.fields,
                    formats: action.filtered.formats ?? state.formats,
                }
            }
        case 'COMPLETE_SEARCH':
            if (process.env.NODE_ENV === 'development' && beginSearchTime) {
                let completeSearchTime = performance.now();
                console.log('Searching and applying DOM changes took ' + (completeSearchTime - beginSearchTime).toFixed(2) + ' ms.');
                beginSearchTime = null;
            }
            return {
                ...state,
                searching: false,
            }
        case 'QUERY':
            return {
                ...state,
                initialQueryExecuted: true,
                query: {
                    ...state.query,
                    ...action.query,
                }
            }
        case 'SHOW_PREVIEW':
            return {
                ...state,
                showPreviewFor: action.styleName,
            }
        case 'HIDE_PREVIEW':
            return {
                ...state,
                showPreviewFor: null,
            }
        case 'BEGIN_FETCH_PREVIEW':
            return {
                ...state,
                previewsCache: {
                    ...state.previewsCache,
                    [action.styleName]: { fetching: true }
                }
            }
        case 'RECEIVE_FETCH_PREVIEW':
            return {
                ...state,
                lastPreviewFetched: action.styleName,
                previewsCache: {
                    ...state.previewsCache,
                    [action.styleName]: action.preview
                }
            }
        case 'FETCH_PREVIEW_ERROR': {
            const newState = {
                ...state,
                showPreviewFor: null,
            }
            delete newState.previewsCache[action.styleName];
            return newState;
        }
        default:
            return state;
    }
}

const App = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const prevQuery = usePrevious(state.query);
    const prevShowPreviewFor = usePrevious(state.showPreviewFor);
    const prevPreviewFetched = usePrevious(state.lastPreviewFetched);
    const timeout = useRef(null);
    const searchInput = useRef(null);
    const previewTimeout = useRef(null);

    const handleSearchInput = useCallback((e) => {
            dispatch({ type: 'QUERY', query: { search: e.target.value } });
    }, []);

    const handleUniqueClick = useCallback((e) => {
        const dependent = e.target.checked ? 0 : null;
        dispatch({ type: 'QUERY', query: { dependent } });
    }, []);

    const handleFormatClick = useCallback((e) => {
        const value = e.target.dataset.value;
        if (state.query.format === value) {
            dispatch({ type: 'QUERY', query: { format: null } });
        } else {
            dispatch({ type: 'QUERY', query: { format: value } });
        }
    }, [state.query]);

    const handleFieldClick = useCallback((e) => {
        const value = e.target.dataset.value;
        let pos = state.query.fields.indexOf(value);
        let newFields = [...state.query.fields];
        if (pos > -1) {
            newFields.splice(pos, 1);
        } else {
            newFields.push(value);
        }
        dispatch({ type: 'QUERY', query: { fields: newFields } });
    }, [state.query.fields]);

    const handleWorkerMessage = useCallback((e) => {
        const [action, payload] = e.data;
        switch (action) {
            case 'READY':
                dispatch({ type: 'SEARCH_WORKER_READY' });
                break;
            case 'COMPLETE_SEARCH': {
                dispatch({ type: 'APPLY_SEARCH', filtered: payload });
                setTimeout(() => {
                    dispatch({ type: 'COMPLETE_SEARCH' });
                }, 0);
                break;
            }
            default:
                console.warn('Unhandled worker message type', action);
        }
    }, []);

    const handleStyleItemLinkClick = useCallback((e) => {
        if (e.type === 'keydown' && !(e.key == 'Enter' || e.key == ' ')) {
            return;
        }
        e.preventDefault();
        const styleName = e.target.closest('li').dataset.name;
        if (styleName) {
            dispatch({ type: 'QUERY', query: { search: `id:${styleName}` } });
        }
    }, []);

    const handleMouseEnter = useCallback((e) => {
        if (previewTimeout.current) {
            clearTimeout(previewTimeout.current);
        }

        const styleName = e.target.closest('li')?.dataset.name;
        dispatch({ type: 'SHOW_PREVIEW', styleName });
    }, []);

    const handleMouseLeave = useCallback((e) => {
        if (previewTimeout.current) {
            clearTimeout(previewTimeout.current);
        }

        if(e.relatedTarget?.closest('.style-tooltip')) {
            return;
        }

        previewTimeout.current = setTimeout(() => {
            dispatch({ type: 'HIDE_PREVIEW' });
        }, 50)
    }, []);

    useEffect(() => {
        fetchStyles(dispatch);
        searchInput.current.focus();
    }, []);

    useEffect(() => {
        searchWorker.addEventListener('message', handleWorkerMessage);
        return () => {
            searchWorker.removeEventListener('message', handleWorkerMessage);
        }
    }, [handleWorkerMessage]);

    useEffect(() => {
        if (!state.workerReady && !state.fetching && state.styles.length) {
            searchWorker.postMessage(['LOAD', { styles: state.styles }]);
            if (isEmptyQuery(state.query)) {
                dispatch({ type: 'APPLY_SEARCH', filtered: {} });
                setTimeout(() => {
                    dispatch({ type: 'COMPLETE_SEARCH' });
                }, 0);
            }
        }
    }, [state.fetching, state.query, state.styles, state.workerReady]);

    useEffect(() => {
        if (state.workerReady && !state.initialQueryExecuted && !isEmptyQuery(state.query)) {
            dispatch({ type: 'BEGIN_SEARCH' });
            searchWorker.postMessage(['SEARCH', { query: state.query }]);
        }
    }, [state.initialQueryExecuted, state.query, state.workerReady]);

    useEffect(() => {
        if (state.workerReady && prevQuery && (
            state.query.search !== prevQuery.search ||
            state.query.format !== prevQuery.format ||
            state.query.fields !== prevQuery.fields ||
            state.query.dependent !== prevQuery.dependent ||
            state.query.id !== prevQuery.id
        )) {
            const runSearch = () => {
                dispatch({ type: 'BEGIN_SEARCH' });
                if (!isEmptyQuery(state.query)) {
                    searchWorker.postMessage(['SEARCH', { query: state.query }]);
                } else {
                    dispatch({ type: 'APPLY_SEARCH', filtered: { styles: state.styles } });
                    setTimeout(() => {
                        dispatch({ type: 'COMPLETE_SEARCH' });
                    }, 0);
                }
                updateHistoryFromQuery(state.query);
            };
            
            if (timeout.current) {
                clearTimeout(timeout.current);
            }

            // debounce search for typing, but don't debounce for other changes
            if (state.query.search.length && state.query.search !== prevQuery.search) {
                timeout.current = setTimeout(runSearch, 200);
            } else {
                runSearch();
            }
        }
    }, [prevQuery, state.query, state.styles, state.workerReady]);

    useEffect(() => {
        if (state.showPreviewFor && state.showPreviewFor !== prevShowPreviewFor) {
            if (!state.previewsCache[state.showPreviewFor]) {
                const style = state.styles.find(style => style.name === state.showPreviewFor);
                fetchPreview(style, dispatch);
            }
            
            const anchor = document.querySelector(`li[data-name="${state.showPreviewFor}"] .title`);
            const tooltip = document.querySelector('.style-tooltip');

            tooltip.style.display = 'block';
            updateTooltipPosition(anchor, tooltip);
        }
        if (!state.showPreviewFor && prevShowPreviewFor) {
            const tooltip = document.querySelector('.style-tooltip');
            tooltip.style.display = 'none';
        }
    }, [prevShowPreviewFor, state.previewsCache, state.showPreviewFor, state.styles]);

    useEffect(() => {
        if (state.lastPreviewFetched !== prevPreviewFetched && state.showPreviewFor === state.lastPreviewFetched) {
            const anchor = document.querySelector(`li[data-name="${state.showPreviewFor}"] .title`);
            const tooltip = document.querySelector('.style-tooltip');
            updateTooltipPosition(anchor, tooltip);
        }
    }, [prevPreviewFetched, state.lastPreviewFetched, state.showPreviewFor]);
        
    return (
        <Fragment>
            <div className="search-pane">
                { (!state.fetching && state.searching) && <div className="search-pane-loading-indicator">Loading...</div> }
                <div className="search-pane-col-1">
                    <h2>Style Search</h2>
                    <p>
                        <input
                            ref={searchInput}
                            type="search"
                            className="search-field"
                            id="search-field"
                            placeholder="Title Search"
                            value={state.query.search}
                            onInput={handleSearchInput}
                            onChange={handleSearchInput}
                        />
                    </p>
                    <p>
                        <label className="search-unique">
                            <input
                                type="checkbox"
                                checked={state.query.dependent !== null && typeof state.query.dependent !== 'undefined' && !state.query.dependent}
                                onChange={handleUniqueClick}
                            />
                            <span>Show only unique styles</span>
                        </label>
                    </p>
                </div>
                <div className="search-pane-col-2">
                    <p>
                        <strong>Format:</strong>
                        {state.fetching ? <span>Loading...</span> : (
                            <ul className="formats-list">
                                {state.filtered.formats.map(format => (
                                    <li
                                        onClick={handleFormatClick}
                                        key={format}
                                    >
                                        <button
                                            aria-pressed={state.query.format === format}
                                            data-value={format}
                                            className={state.query.format === format ? 'format-active' : ''}
                                        >
                                            {format}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </p>
                    <p>
                        <strong>Fields:</strong>
                        {state.fetching ? <span>Loading...</span> : (
                            <ul className="fields-list">
                                {state.filtered.fields.map(field => (
                                    <li
                                        onClick={handleFieldClick}
                                        key={field}
                                    >
                                        <button
                                            aria-pressed={state.query.fields.includes(field)}
                                            className={state.query.fields.includes(field) ? 'field-active' : ''}
                                            data-value={field}
                                        >
                                            {field}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </p>
                </div>
            </div>
            { state.initialQueryExecuted ? (
                <Fragment>
                <div className="style-count">
                    {state && !state.fetching && state.count ?
                        `${numberFormat(state.count)} ${state.count > 1 ? 'styles' : 'style'} found:` :
                        state && state.fetching ? null : 'No styles found'
                    }
                </div>
                <ul className="style-list">
                    {state.filtered.styles.map((style, index) => (
                        <StyleItem
                            onLinkClick={ handleStyleItemLinkClick }
                            onMouseEnter={ handleMouseEnter }
                            onMouseLeave={ handleMouseLeave }
                            key={style.name}
                            style={style}
                            index={index}
                        />
                    ))}
                </ul>
                <StylePreview
                    onMouseLeave={ handleMouseLeave }
                    preview={state.previewsCache[state.showPreviewFor] ?? { fetching: true } }
                /> 
                </Fragment>
            ) : <StylesLoading /> }
        </Fragment>
    );
}

const StyleItem = ({ style, onMouseEnter, onMouseLeave, onLinkClick }) => {
    return (
        <li data-name={ style.name }>
            <a
                onMouseEnter={ onMouseEnter }
                onMouseLeave={ onMouseLeave }
                className="title"
                href={style.href}
            >
                {style.title}
            </a>
            <span className="metadata">({style.updated})</span>
            <a className="style-individual-link" tabIndex={ 0 } onClick={ onLinkClick } onKeyDown={ onLinkClick }>
                Link
            </a>
            <a className="style-view-source" href={style.href + '?source=1'}>
                Source
            </a>
        </li>
    );
};

const StylePreview = ({ preview, onMouseLeave }) => {
    return (
        <div className="style-tooltip" onMouseLeave={ onMouseLeave }>
            <div className='style-tooltip-content'>
                { preview.fetching ? 
                    <div>Loading Preview...</div> : (
                    <Fragment>
                        <h3>Citations</h3>
                        <p dangerouslySetInnerHTML={{ __html: preview.citation.join(' ')}} />
                        <h3>Bibliography</h3>
                        <p dangerouslySetInnerHTML={{ __html: preview.bibliography }} />
                    </Fragment>
                )}
            </div>
        </div>
    );
};

const StylesLoading = () => {
    return (
        <div className="styles-loading">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                <path stroke-width="1" stroke="currentColor" fill="none" d="M8,15c-3.866,0-7-3.134-7-7s3.134-7,7-7s7,3.134,7,7" />
            </svg>    
        </div>
    );
}


export default App;