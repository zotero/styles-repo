/*
    ***** BEGIN LICENSE BLOCK *****
    
    This file is part of the Zotero Style Repository.
    
    Copyright © 2011–2012 Center for History and New Media
                          George Mason University, Fairfax, Virginia, USA
                          http://zotero.org
    
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
    
    ***** END LICENSE BLOCK *****
*/


var ZSR = {};

ZSR.Search = (function () {
	var timeoutID;
	var selectedFormat = null;
	var selectedFields = [];
	var forceSearch = false;
	
	function updateSearchResults() {
		console.log("Searching");
		var t = new Date();
		
		var val = document.getElementById('searchField').value;
		var searchWords = val ? val.toLowerCase().split(" ") : [];
		var numDisplayedStyles = 0;
		var formatCounts = {};
		var fieldCounts = {};
		
		var showDepStyles = !document.getElementById('dependentToggle').checked;
		
		// Filter the style list based on search parameters
		var uls = $("ul.styleList a.title").each(function () {
			var container = $(this).parent();
			var name = $(this).attr("href").match(/([^\/]+(?:\?dep=1)?)$/)[0];
			var data = container.data();
			if (data.fields && typeof data.fields == 'string') {
				data.fields = data.fields.split(",");
			}
			
			var show = true;
			
			// Hide dependent styles if unchecked
			if (!showDepStyles && data.dependent) {
				show = false;
			}
			
			// Hide styles that don't match the search text
			if (show) {
				for (var i=0; i<searchWords.length; i++) {
					var word = searchWords[i];
					// If any search words don't appear in name, title, or short title,
					// it's not a match
					if (name.indexOf(word) == -1
							&& $(this).text().toLowerCase().indexOf(word) == -1
							&& (!data.titleshort || data.titleshort.toLowerCase().indexOf(word) == -1)) {
						show = false;
						break;
					}
				}
			}
			
			// Hide styles that don't match the selected categories
			if (show) {
				if (selectedFormat) {
					if (data.format != selectedFormat) {
						show = false;
					}
				}
				
				if (show) {
					for (var i=0; i<selectedFields.length; i++) {
						if (data.fields.indexOf(selectedFields[i]) == -1) {
							show = false;
							break;
						}
					}
				}
			}
			
			if (show) {
				container.get(0).style.display = 'list-item';
				numDisplayedStyles++;
				
				// Count citation formats
				if (data.format) {
					if (!formatCounts[data.format]) {
						formatCounts[data.format] = 1;
					}
					else {
						formatCounts[data.format]++;
					}
				}
				
				// Count fields
				if (data.fields) {
					for (var i=0; i<data.fields.length; i++) {
						var field = data.fields[i];
						if (!fieldCounts[field]) {
							fieldCounts[field] = 1;
						}
						else {
							fieldCounts[field]++;
						}
					}
				}
			}
			else {
				container.get(0).style.display = 'none';
			}
		});
		
		
		//
		// And now adjust the search parameters based on visible results
		//
		
		// Remove all category elements
		$("#formats").empty();
		$("#fields").empty();
		
		// Sort formats and add to category box
		var arr = [];
		for (var i in formatCounts) {
			arr.push([i, formatCounts[i]]);
		}
		arr.sort(function (a, b) { return a[0].localeCompare(b[0]) });
		for (var i in arr) {
			var selClass = selectedFormat == arr[i][0] ? ' class="selected"' : '';
			$("#formats").append('<li' + selClass + '>' + arr[i][0] + '</li>');
		}
		
		// Sort fields and add to category box
		var arr = [];
		for (var i in fieldCounts) {
			arr.push([i, fieldCounts[i]]);
		}
		arr.sort(function (a, b) { return a[0].localeCompare(b[0]) });
		for (var i in arr) {
			var selClass = selectedFields.indexOf(arr[i][0]) != -1 ? ' class="selected"' : '';
			$("#fields").append('<li' + selClass + '>' + arr[i][0] + '</li>');
		}
		
		// Fix disappearing categories in WebKit
		for (var i in document.styleSheets[0].cssRules) {
			var rules = document.styleSheets[0].cssRules[i];
			if (rules.selectorText == "#searchFields ul") {
				rules.style.display = 'block';
				break;
			}
		}
		
		// Add/remove categories on click
		$(".categoryBox li").click(function () {
			var name = $(this).text();
			var selected = $(this).hasClass("selected");
			
			var div = $(this).closest(".categoryBox");
			
			if (div.attr("id") == "formatsBox") {
				selectedFormat = selected ? null : name;
			}
			else if (div.attr("id") == "fieldsBox") {
				if (selected) {
					var pos = selectedFields.indexOf(name);
					selectedFields.splice(pos, 1);
				}
				else {
					selectedFields.push(name);
				}
			}
			else {
				throw ("Category box not found");
			}
			
			if (selected) {
				$(this).removeClass("selected");
			}
			else {
				$(this).addClass("selected");
			}
			
			ZSR.Search.startSearch();
		});
		
		// Update number of search results
		switch (numDisplayedStyles) {
			case 0:
				var str =  "No styles found";
				break;
			
			case 1:
				var str =  "1 style found:";
				break;
			
			default:
				var num = numDisplayedStyles + '';
				num = num.replace(/\B(?=(?:\d{3})+(?!\d))/g, ",");
				var str = num + " styles found:";
		}
		$("#styleCount").text(str);
		
		console.log((new Date() - t) + "ms");
	}
	
	return {
		init: function () {
			// Bind events to search field
			var searchField = $("#searchField");
			searchField.on("keyup", function (event) {
				ZSR.Search.onSearchKeyUp(event, this);
			});
			searchField.on("keypress", function (event) {
				ZSR.Search.onSearchKeyPress(event)
			});
			searchField.on("change", function () {
				ZSR.Search.onChange(this)
			});
			
			updateSearchResults();
			
			$("ul.styleList > li").hover(
				function () {
					// Show "View Source" button
					var button = $("#view-source");
					var href = $(this).find("a").attr('href');
					href += (href.indexOf('?') == -1 ? "?" : "&") + "source=1";
					button.on("click", function () {
						window.location.href = href;
					});
					$(this).append(button.show());
				},
				function () {
					$("#view-source").off("click").hide();
				}
			);
			
			$("ul.styleList a.title").hover(function() {
				if ($(this).data("qtipped")) {
					return;
				}
				
				var container = $(this).parent();
				
				var name = $(this).attr("href").match(/([^\/]+(?:\?dep=1)?)$/)[0];
				var dependent = !!container.data("dependent");
				
				$(this).qtip({
					content: {
						text: "Loading preview...",
						ajax: {
							url: "/styles-files/previews/bib/" + (dependent ? "dependent/" : "") + name + '.html',
							type: 'GET',
							data: {}
						}
					},
					position: {
						target: 'mouse',
						adjust: {
							x: 15,
							mouse: false
						},
						viewport: $(window),
						show: {
							delay: 120
						}
					},
					show: {
						solo: true,
						effect: false,
						ready: true
					}
				});
				
				$(this).data("qtipped", 1)
			});
		},
		
		onSearchKeyUp: function (event, input) {
			//console.log('keyup');
			//console.log(event.keyCode);
			
			var immediate = false;
			var timeout = 300;
			
			// Clear field on escape
			if (event.keyCode == 27 && input.value != '') {
				input.value = '';
				timeout = 1;
			}
			
			else if (event.keyCode == 8 || event.keyCode == 46) {
				// Ignore delete when already empty
				if (input.value == '') {
					//return;
				}
			}
			
			// Ignore tab and arrow keys
			else if ([9, 37, 38, 39, 40].indexOf(event.keyCode) != -1) {
				return;
			}
			
			// Ignore modifier keys
			else if ([16, 17, 18, 91, 224].indexOf(event.keyCode) != -1 && !forceSearch) {
				return;
			}
			
			// Immediate search on Enter
			else if (event.keyCode == 13) {
				immediate = true;
			}
			
			if (timeoutID) {
				clearTimeout(timeoutID);
				timeoutID = null;
			}
			
			forceSearch = false;
			
			if (immediate) {
				this.startSearch();
			}
			else {
				timeoutID = setTimeout(function () {
					ZSR.Search.startSearch();
				}, 400);
			}
		},
		
		
		// Pick up some things not caught by keyUp
		onSearchKeyPress: function (event) {
			//console.log('keypress');
			//console.log(event.keyCode);
			
			// Ignore tab and arrow keys
			if ([9, 37, 38, 39, 40].indexOf(event.keyCode) != -1) {
				return;
			}
			
			// Ignore modifier keys
			else if ([16, 17, 18, 91, 224].indexOf(event.keyCode) != -1) {
				return;
			}
			
			// Force search for cut/paste, which show up here but not
			// in onKeyUp(), where we ignore modifier keys
			forceSearch = true;
		},
		
		
		onChange: function (input) {
			if (input.value == '') {
				ZSR.Search.startSearch();
			}
		},
		
		
		startSearch: function () {
			document.getElementById('loading').style.visibility = 'visible';
			setTimeout(function () {
				updateSearchResults();
				document.getElementById('loading').style.visibility = 'hidden';
			}, 200);
		}
	};
}());
