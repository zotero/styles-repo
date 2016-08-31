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

require_once("Styles.inc.php");

class Styles_Repo {
	public static function getAllStyles() {
		$styles = array();
		$names = array();
		
		// Independent
		$dir = STYLES_PATH;
		$dh = opendir($dir);
		if (!$dh) {
			throw new Exception("Can't open directory");
		}
		while (($file = readdir($dh)) !== false) {
			if (strpos($file, ".") !== false) {
				continue;
			}
			if ($file == 'dependent') {
				continue;
			}
			
			$data = self::parseStyle($file, file_get_contents($dir . $file));
			
			$data['disambiguate'] = false;
			
			$styles[] = $data;
			$names[$file] = true;
		}
		
		// Dependent
		$dir = STYLES_PATH . 'dependent/';
		$dh = opendir($dir);
		if (!$dh) {
			throw new Exception("Can't open directory");
		}
		while (($file = readdir($dh)) !== false) {
			if (strpos($file, ".") !== false) {
				continue;
			}
			
			$data = self::parseStyle($file, file_get_contents($dir . $file), 1);
			
			$data['disambiguate'] = isset($names[$file]);
			
			$styles[] = $data;
		}
		
		usort($styles, function ($a, $b) {
			$aTitle = $a['title'];
			$bTitle = $b['title'];
			// TEMP: for Österreichische...
			if ($aTitle[0] == "\xc3") {
				$aTitle[0] = 'O';
			}
			if ($bTitle[0] == "\xc3") {
				$bTitle[0] = 'O';
			}
			return strcasecmp($aTitle, $bTitle);
		});
		
		return $styles;
	}
	
	
	public static function getCacheValues() {
		$cacheFile = ROOT_PATH . "styles/data/cache";
		if (!file_exists($cacheFile)) {
			return false;
		}
		return json_decode(file_get_contents($cacheFile), true);
	}
	
	
	public static function setCacheValues($styleList) {
		$cacheFile = ROOT_PATH . "styles/data/cache";
		$data = array();
		$lastModified = '';
		foreach ($styleList as $style) {
			if ($style['updated'] > $lastModified) {
				$lastModified = $style['updated'];
			}
			$data[] = $style['name'] . $style['updated'];
		}
		$lastModified = gmdate("D, d M Y H:i:s", strtotime($lastModified)) . " GMT";
		$etag = md5(implode('', $data));
		$json = json_encode(array(
			'lastModified' => $lastModified,
			'etag' => $etag
		));
		file_put_contents($cacheFile, $json);
	}
	
	
	public static function isValidName($name) {
		if (strpos($name, ".") !== false) {
			return false;
		}
		return true;
	}
	
	
	public static function getFilePath($name, $dependent=false) {
		// TEMP
		if ($name == 'bluebook-19th') {
			return file_get_contents(ROOT_PATH . 'include/bluebook-19th.csl');
		}
		
		if (!self::isValidName($name)) {
			throw new Exception('$name cannot include periods');
		}
		
		return STYLES_PATH . ($dependent ? 'dependent/' : '') . $name;
	}
	
	
	public static function getCode($name, $dependent=false) {
		$path = self::getFilePath($name, $dependent);
		if (!$path) {
			return false;
		}
		return file_exists($path) ? file_get_contents($path) : false;
	}
	
	
	public static function getXML($name, $dependent=false) {
		$code = self::getCode($name, $dependent);
		if (!$code) {
			return false;
		}
		$xml = new SimpleXMLElement($code);
		return $xml;
	}
	
	
	public static function getTitle($name, $dependent=false) {
		$xml = self::getXML($name, $dependent);
		if (!$xml) {
			return "";
		}
		return (string) $xml->info->title;
	}
	
	
	public static function getLastModified($name, $dependent=false) {
		$xml = self::getXML($name, $dependent);
		if (!$xml) {
			return "";
		}
		$lastUpdated = (string) $xml->info->updated;
		return gmdate("D, d M Y H:i:s", strtotime($lastUpdated)) . " GMT";
	}
	
	
	/**
	 * Gets the preview citations for the style as a JSON array
	 *
	 * Independent styles only
	 */
	public static function getPreviewCitations($name, $asJSON=false) {
		if (strpos($name, ".") !== false) {
			throw new Exception("Invalid name '" . $name . "'");
		}
		
		$path = ROOT_PATH . 'htdocs/styles-files/previews/citation/' . $name . '.json';
		
		if (!file_exists($path)) {
			error_log("Preview citations file '$name.json' not found");
			return "";
		}
		
		$citations = file_get_contents($path);
		
		if ($asJSON) {
			return $citations;
		}
		
		return json_decode($citations);
	}
	
	
	public static function setPreviewCitations($name, $preview, $dependent=false) {
		if (strpos($name, ".") !== false) {
			throw new Exception("Invalid name '" . $name . "'");
		}
		
		$path = ROOT_PATH . 'htdocs/styles-files/previews/citation/';
		if ($dependent) {
			$path .= 'dependent/';
		}
		$path .= $name . '.json';
		$preview = file_put_contents($path, json_encode($preview));
	}

	public static function setPreviewCombined($name, $previewCitation, $previewBibliography, $dependent=false) {
		if (strpos($name, ".") !== false) {
			throw new Exception("Invalid name '" . $name . "'");
		}
		
		$path = ROOT_PATH . 'htdocs/styles-files/previews/combined/';
		if ($dependent) {
			$path .= 'dependent/';
		}
		$path .= $name . '.json';


		$preview = array(
			"citation" => $previewCitation,
			"bibliography" => $previewBibliography
		);

		$preview = file_put_contents($path, json_encode($preview));
	}
	
	
	/**
	 * Gets the preview HTML for the style
	 *
	 * Independent styles only
	 */
	public static function getPreviewBibliography($name) {
		if (strpos($name, ".") !== false) {
			throw new Exception("Invalid name '" . $name . "'");
			
		}
		
		$path = ROOT_PATH . 'htdocs/styles-files/previews/bib/' . $name . '.html';
		
		if (!file_exists($path)) {
			error_log("Preview bibliography file '$name.html' not found");
			return "";
		}
		
		$preview = file_get_contents($path);
		
		return $preview;
	}
	
	
	public static function setPreviewBibliography($name, $preview, $dependent=false) {
		if (strpos($name, ".") !== false) {
			throw new Exception("Invalid name '" . $name . "'");
		}
		
		$path = ROOT_PATH . 'htdocs/styles-files/previews/bib/'
				. ($dependent ? 'dependent/' : '') . $name . '.html';
		$preview = file_put_contents($path, $preview);
	}
	
	
	private static function parseStyle($name, $code, $dependent=0) {
		try {
			$xml = new SimpleXMLElement($code);
		}
		catch (Exception $e) {
			error_log("Error parsing $name");
			return false;
		}
		
		$categories = array(
			"format" => "",
			"fields" => array()
		);
		$set = false;
		foreach ($xml->info->category as $category) {
			if (!empty($category['citation-format'])) {
				$categories["format"] = (string) $category['citation-format'];
				$set = true;
			}
			else if (!empty($category['field'])) {
				$categories["fields"][] = (string) $category['field'];
				$set = true;
			}
		}
		if (!$set) {
			$categories = null;
		}
		
		$data = file_get_contents(ROOT_PATH . 'styles/data/' . ($dependent ? 'dependent/' : '') . $name);
		if ($data) {
			$data = json_decode($data);
		}
		// Default to valid
		else {
			$data = new stdClass;
			$data->valid = true;
		}
		
		$data = array(
			'name' => $name,
			'dependent' => $dependent,
			'updated' => (string) $xml->info->updated,
			'title' => (string) $xml->info->title,
			'titleShort' => (string) $xml->info->{'title-short'},
			'valid' => $data->valid,
			'categories' => $categories,
			'code' => $code
		);
		
		return $data;
	}
}
?>
