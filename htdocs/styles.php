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
// Strip query string
$mainURI = preg_replace('/\?.*/', '', $uri);

if (strpos($uri, '/styles/?s=Harvard/') !== false) {
	header("HTTP/1.1 400 Bad Request");
	echo "400 Bad Request";
	exit;
}

// Set $PATH_INFO
if (isset($_SERVER['PATH_INFO'])) {
	$PATH_INFO = explode('/', substr($_SERVER['PATH_INFO'], 1));
}
if (!isset($PATH_INFO) || $PATH_INFO[0] == '') {
	$PATH_INFO = array();
}

// Single style
if (isset($PATH_INFO[0])) {
	header('Access-Control-Allow-Origin: *');
	header('Access-Control-Allow-Headers: Accept, If-Modified-Since');
	header('Cache-control: max-age=900');

	if($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
		header("HTTP/1.1 200 Ok");
		exit;
	}

	$name = $PATH_INFO[0];
	$dependent = !empty($_GET['dep']);
	$source = !empty($_GET['source']);
	
	if (!Styles_Repo::isValidName($name) || isset($PATH_INFO[1])) {
		header("HTTP/1.1 404 Not Found");
		exit;
	}
	
	$newName = Styles_Repo::getRenamedStyle($name);
	if ($newName && $name != $newName) {
		header("Location: $newName");
		exit;
	}
	
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
	
	// Single style
	if (!empty($csl)) {
		header("Last-Modified: " . $lastModified);
		if (!empty($source)) {
			header('Content-Type: text/xml');
			header("Content-Disposition: inline; filename=$name.csl");
		}
		else {
			header('Content-Type: application/vnd.citationstyles.style+xml');
			header("Content-Disposition: attachment; filename=$name.csl");
		}
		echo $csl;
	}
	// Style not found
	else {
		header("HTTP/1.0 404 Not Found");
		echo "Style not found";
	}
	exit;
}

// Styles list
$searchString = isset($_GET['q']) ? $_GET['q'] : '';
$client = !empty($_SERVER['HTTP_USER_AGENT']) && strpos($_SERVER['HTTP_USER_AGENT'], "Zotero/") !== false;
require("../views/index.phtml");
