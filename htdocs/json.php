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


$cacheValues = Styles_Repo::getCacheValues();
	
if ((isset($_SERVER['HTTP_IF_MODIFIED_SINCE'])
			&& $_SERVER['HTTP_IF_MODIFIED_SINCE'] == $cacheValues['lastModified'])
		|| (isset($_SERVER['HTTP_IF_NONE_MATCH'])
			&& trim($_SERVER['HTTP_IF_NONE_MATCH']) == $cacheValues['etag'])) {
	header("HTTP/1.1 304 Not Modified");
	exit;
}

$styleList = Styles_Repo::getAllStyles();
$searchString = isset($_GET['q']) ? $_GET['q'] : '';

header("Last-Modified: {$cacheValues['lastModified']}");
header('ETag: "' . $cacheValues['etag'] . '"');
header('Content-Type: application/json');
$numStyles = number_format(sizeOf($styleList));
$pureArray = [];
foreach($styleList as $key => $style) {
	date_default_timezone_set('UTC');
	$styleList[$key]['updatedFormatted'] = date("Y-m-d H:i:s", strtotime($styleList[$key]['updated']));
	$styleList[$key]['href'] = $mainURI . (substr($mainURI, -1) == '/' ? '' : '/') . $styleList[$key]['name'];
}
print(json_encode($styleList));
?>


