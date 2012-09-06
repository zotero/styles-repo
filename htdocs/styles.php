<?
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
	$install = !empty($_GET['install']);
	$csl = Styles_Repo::getCode($name, $dependent);
	// Dependent flag is optional
	if (!$csl) {
		$csl = Styles_Repo::getCode($name, true);
	}
}
// Style list
else {
	$styleList = Styles_Repo::getAllStyles();
	$numStyles = number_format(sizeOf($styleList));
	$styleDataJSON = Styles_Repo::getStyleDataJSON();
}


// Single style
if (!empty($csl)) {
	if (!empty($install)) {
		header('Content-Type: text/x-csl; charset=utf-8');
	}
	else {
		header('Content-Type: text/xml');
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
