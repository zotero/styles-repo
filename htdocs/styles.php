<?php
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

require('../include/config.inc.php');
require('../include/static.inc.php');
require('../include/Styles_Repo.inc.php');

$uri = $_SERVER['REQUEST_URI'];

// Set $PATH_INFO
if (isset($_SERVER['PATH_INFO'])) {
	$PATH_INFO = explode('/', substr($_SERVER['PATH_INFO'], 1));
}
if (!isset($PATH_INFO) || $PATH_INFO[0] == '') {
	$PATH_INFO = array();
}

// Single style
if (isset($PATH_INFO[0])) {
	$name = $PATH_INFO[0];
	$dependent = !empty($_GET['dep']);
	$source = !empty($_GET['source']);
	$csl = Styles_Repo::getCode($name, $dependent);
	// Dependent flag is optional
	if ($csl) {
		$lastModified = Styles_Repo::getLastModified($name, false);
	}
	else {
		$csl = Styles_Repo::getCode($name, true);
		$lastModified = Styles_Repo::getLastModified($name, true);
	}
	if ((isset($_SERVER['HTTP_IF_MODIFIED_SINCE'])
				&& $_SERVER['HTTP_IF_MODIFIED_SINCE'] == $lastModified)) {
		header("HTTP/1.1 304 Not Modified");
		exit;
	}
}
// Style list
else {
	$cacheValues = Styles_Repo::getCacheValues();
	
	if ((isset($_SERVER['HTTP_IF_MODIFIED_SINCE'])
				&& $_SERVER['HTTP_IF_MODIFIED_SINCE'] == $cacheValues['lastModified'])
			|| (isset($_SERVER['HTTP_IF_MODIFIED_SINCE'])
				&& trim($_SERVER['HTTP_IF_NONE_MATCH']) == $cacheValues['etag'])) {
		header("HTTP/1.1 304 Not Modified");
		exit;
	}
	
	$styleList = Styles_Repo::getAllStyles();
	
	header("Last-Modified: {$cacheValues['lastModified']}");
	header('ETag: "' . $cacheValues['etag'] . '"');
	$numStyles = number_format(sizeOf($styleList));
}


// Single style
if (!empty($csl)) {
	header("Last-Modified: " . $lastModified);
	if (!empty($source)) {
		header('Content-Type: text/xml');
	}
	else {
		header('Content-Type: text/x-csl; charset=utf-8');
	}
	header("Content-Disposition: filename=$name.csl");
	echo $csl;
}

// Styles list
else if (!empty($styleList)) {
	require("../views/index.phtml");
}

// Style not found
else {
	header("HTTP/1.0 404 Not Found");
	echo "Style not found";
}
?>
