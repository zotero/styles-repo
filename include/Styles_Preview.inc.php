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

require_once("Styles.inc.php");

class CSLPreview {
	public static function getCitations($code, $data) {
		$server = CITEPROC_NODE_URL;
		
		$url = "$server?responseformat=json&citations=1&bibliography=0";
		
		$data->styleXml = $code;
		$json = json_encode($data);
		
		$response = self::callProcessor($url, $json);
		
		if (!$response) {
			throw new Exception("No response generating citations");
		}
		
		$response = json_decode($response);
		$citations = $response->citations;
		
		$toReturn = array();
		foreach ($citations as $citation) {
			$toReturn[] = $citation[1];
		}
		return $toReturn;
	}
	
	
	/**
	 * Generate JSON for items and send to citeproc-js web service
	 *
	 * From getBibliographyFromCiteServer() in Zotero_Cite data server class
	 */
	public static function getBibliography($code, $data) {
		$server = CITEPROC_NODE_URL;
		
		$url = "$server?responseformat=json";
		
		$data->styleXml = $code;
		$json = json_encode($data);
		
		$response = self::callProcessor($url, $json);
		
		if (!$response) {
			throw new Exception("No response generating bibliography");
		}
		
		//
		// Ported from Zotero.Cite.makeFormattedBibliography() in Zotero client
		//
		
		$bib = json_decode($response);
		$bib = $bib->bibliography;
		
		if (!$bib) {
			$url .= "&citations=1";
			$response = self::callProcessor($url, $json);
			if (!$response) {
				throw new Exception("No response generating citations");
			}
			$result = json_decode($response);
			$citations = array();
			foreach ($result->citations as $citation) {
				$citations[] = $citation[1];
			}
			$styleXML = new SimpleXMLElement($code);
			if ($styleXML['class'] == 'note') {
				return "<ol>\n\t<li>" . implode("</li>\n\t<li>", $citations) . "</li>\n</ol>";
			}
			else {
				return implode("<br />\n", $citations);
			}
		}
		
		$html = $bib[0]->bibstart . implode("", $bib[1]) . $bib[0]->bibend;
		
		$sfa = "second-field-align";
		
		//if (!empty($_GET['citedebug'])) {
		//	echo "<!--\n";
		//	echo("maxoffset: " . $bib[0]->maxoffset . "\n");
		//	echo("entryspacing: " . $bib[0]->entryspacing . "\n");
		//	echo("linespacing: " . $bib[0]->linespacing . "\n");
		//	echo("hangingindent: " . (isset($bib[0]->hangingindent) ? $bib[0]->hangingindent : "false") . "\n");
		//	echo("second-field-align: " . $bib[0]->$sfa . "\n");
		//	echo "-->\n\n";
		//}
		
		// Validate input
		if (!is_numeric($bib[0]->maxoffset)) throw new Exception("Invalid maxoffset");
		if (!is_numeric($bib[0]->entryspacing)) throw new Exception("Invalid entryspacing");
		if (!is_numeric($bib[0]->linespacing)) throw new Exception("Invalid linespacing");
		
		$maxOffset = (int) $bib[0]->maxoffset;
		$entrySpacing = (int) $bib[0]->entryspacing;
		$lineSpacing = (int) $bib[0]->linespacing;
		$hangingIndent = !empty($bib[0]->hangingindent) ? (int) $bib[0]->hangingindent : 0;
		$secondFieldAlign = !empty($bib[0]->$sfa); // 'flush' and 'margin' are the same for HTML
		
		$xml = new SimpleXMLElement($html);
		
		$multiField = !!$xml->xpath("//div[@class = 'csl-left-margin']");
		
		// One of the characters is usually a period, so we can adjust this down a bit
		$maxOffset = max(1, $maxOffset - 2);
		
		// Force a minimum line height
		if ($lineSpacing <= 1.35) $lineSpacing = 1.35;
		
		$xml['style'] .= "line-height: " . $lineSpacing . "; ";
		
		if ($hangingIndent) {
			if ($multiField && !$secondFieldAlign) {
				throw new Exception("second-field-align=false and hangingindent=true combination is not currently supported");
			}
			// If only one field, apply hanging indent on root
			else if (!$multiField) {
				$xml['style'] .= "padding-left: {$hangingIndent}em; text-indent:-{$hangingIndent}em;";
			}
		}
		
		$leftMarginDivs = $xml->xpath("//div[@class = 'csl-left-margin']");
		$clearEntries = sizeOf($leftMarginDivs) > 0;
		
		// csl-entry
		$divs = $xml->xpath("//div[@class = 'csl-entry']");
		$num = sizeOf($divs);
		$i = 0;
		foreach ($divs as $div) {
			$first = $i == 0;
			$last = $i == $num - 1;
			
			if ($clearEntries) {
				$div['style'] .= "clear: left; ";
			}
			
			if ($entrySpacing) {
				if (!$last) {
					$div['style'] .= "margin-bottom: " . $entrySpacing . "em;";
				}
			}
			
			$i++;
		}
		
		// Padding on the label column, which we need to include when
		// calculating offset of right column
		$rightPadding = .5;
		
		// div.csl-left-margin
		foreach ($leftMarginDivs as $div) {
			$div['style'] = "float: left; padding-right: " . $rightPadding . "em; ";
			
			// Right-align the labels if aligning second line, since it looks
			// better and we don't need the second line of text to align with
			// the left edge of the label
			if ($secondFieldAlign) {
				$div['style'] .= "text-align: right; width: " . $maxOffset . "em;";
			}
		}
		
		// div.csl-right-inline
		foreach ($xml->xpath("//div[@class = 'csl-right-inline']") as $div) {
			$div['style'] .= "margin: 0 .4em 0 " . ($secondFieldAlign ? $maxOffset + $rightPadding : "0") . "em;";
			
			if ($hangingIndent) {
				$div['style'] .= "padding-left: {$hangingIndent}em; text-indent:-{$hangingIndent}em;";
			}
		}
		
		// div.csl-indent
		foreach ($xml->xpath("//div[@class = 'csl-indent']") as $div) {
			$div['style'] = "margin: .5em 0 0 2em; padding: 0 0 .2em .5em; border-left: 5px solid #ccc;";
		}
		
		$xml = $xml->asXML();
		// Strip XML prolog
		$xml = substr($xml, strpos($xml, "\n") + 1);
		
		return $xml;
	}
	
	
	private static function callProcessor($url, $postdata) {
		$start = microtime(true);
		
		$ch = curl_init($url);
		curl_setopt($ch, CURLOPT_POST, 1);
		curl_setopt($ch, CURLOPT_POSTFIELDS, $postdata);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array("Expect:"));
		curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 1);
		curl_setopt($ch, CURLOPT_TIMEOUT, 4);
		curl_setopt($ch, CURLOPT_HEADER, 0); // do not return HTTP headers
		curl_setopt($ch, CURLOPT_RETURNTRANSFER , 1);
		$response = curl_exec($ch);
		
		$time = microtime(true) - $start;
		
		$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		if ($code == 404) {
			throw new Exception("Invalid style", Z_ERROR_CITESERVER_INVALID_STYLE);
		}
		
		return $response;
	}
}
?>
