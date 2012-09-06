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

function staticFile($relPath) {
	$basePath = ROOT_PATH . 'htdocs';
	$file = $basePath . $relPath;
	if (!file_exists($file)) {
		return $relPath;
	}
	return str_replace($basePath, "", preg_replace('/(.+)(\.[\w]{2,4})$/', '$1.' . filemtime($file) . '$2', $file));
}
?>
