#!/usr/bin/env python3
"""
xwiki_fulltree_to_xar_ROBUST.py
Convert a "fulltree" JSON snapshot into an XWiki .xar file.
Supports XObjects, flexible node IDs, and UTF-8 encoding.
"""

import json
import os
import sys
import time
import zipfile
from xml.etree.ElementTree import Element, SubElement, tostring

def derive_output_path(input_path: str, explicit_output: str | None) -> str:
    if explicit_output:
        return explicit_output
    base, _ = os.path.splitext(input_path)
    if base.endswith("_fulltree"):
        return base + ".xar"
    return base + "_fulltree.xar"

def pageid_to_web_and_name(page_id: str) -> tuple[str, str]:
    parts = page_id.split(".")
    if len(parts) < 2:
        # Handle root pages or simple IDs. 
        # Strategy: If it's just "Page", treat it as "Main.Page" or just web=""/name="Page"
        # XWiki usually expects Web.Page. 
        # If input is just "FactHarbor", we return web="", name="FactHarbor"
        return "", page_id
    web = ".".join(parts[:-1])
    name = parts[-1]
    return web, name

def make_xwikidoc(node: dict, wiki_name: str, now_ms: int) -> bytes:
    page_id = node.get("pageId") or node.get("id")
    if not page_id:
         # Fallback if ID is missing
         return b""

    web, name = pageid_to_web_and_name(page_id)

    xdoc = Element("xwikidoc", {"version": "1.5", "reference": page_id, "locale": "", "wiki": wiki_name})

    SubElement(xdoc, "web").text = web
    SubElement(xdoc, "name").text = name
    SubElement(xdoc, "language").text = ""
    SubElement(xdoc, "defaultLanguage").text = "en"
    SubElement(xdoc, "translation").text = "0"
    SubElement(xdoc, "creator").text = "xwiki:XWiki.Admin"
    SubElement(xdoc, "author").text = "xwiki:XWiki.Admin"
    SubElement(xdoc, "contentAuthor").text = "xwiki:XWiki.Admin"
    
    t_str = str(now_ms)
    for tag in ("creationDate", "date", "contentUpdateDate"):
        SubElement(xdoc, tag).text = t_str

    SubElement(xdoc, "parent").text = node.get("parentId") or ""
    SubElement(xdoc, "title").text = node.get("title") or name
    SubElement(xdoc, "syntaxId").text = node.get("syntax") or "xwiki/2.1"
    SubElement(xdoc, "hidden").text = "false"

    # Content
    content_body = node.get("content", {}).get("body", "")
    SubElement(xdoc, "content").text = content_body

    # --- XObjects Support ---
    # Essential for Diagrams to be recognized by the Diagram App
    for obj in node.get("xobjects", []):
        obj_elem = SubElement(xdoc, "object")
        # Standard object fields
        SubElement(obj_elem, "name").text = page_id
        SubElement(obj_elem, "number").text = str(obj.get("number", 0))
        SubElement(obj_elem, "className").text = obj.get("className", "")
        SubElement(obj_elem, "guid").text = obj.get("guid", "")
        
        # Properties
        for prop_key, prop_val in obj.get("properties", {}).items():
            prop_elem = SubElement(obj_elem, "property")
            SubElement(prop_elem, prop_key).text = prop_val

    # Return valid XML bytes
    return tostring(xdoc, encoding="utf-8", xml_declaration=True)

def build_package_xml(snapshot: dict, page_ids: list[str]) -> bytes:
    pkg = Element("package", {
        "formatVersion": "1.0", 
        "name": snapshot.get("snapshotLabel", "Snapshot"), 
        "backupPack": "true"
    })
    
    # Metadata
    infos = SubElement(pkg, "infos")
    SubElement(infos, "name").text = snapshot.get("subject", "FactHarbor Export")
    SubElement(infos, "description").text = snapshot.get("snapshotLabel", "")
    SubElement(infos, "version").text = snapshot.get("snapshotVersion", "1.0")
    
    # Files list
    files = SubElement(pkg, "files")
    for pid in page_ids:
        # XWiki Import expects <file> entries to match the files in the zip
        SubElement(files, "file", {"language": "", "defaultAction": "0", "action": "0"}).text = pid + ".xml"
        
    return tostring(pkg, encoding="utf-8", xml_declaration=True)

def json_fulltree_to_xar(input_path: str, output_path: str, wiki_name: str = "xwiki") -> None:
    with open(input_path, "r", encoding="utf-8") as f:
        snapshot = json.load(f)

    nodes = snapshot.get("nodes", [])
    now_ms = int(time.time() * 1000)
    
    # Filter valid page nodes
    page_nodes = []
    for n in nodes:
        if n.get("type") in (None, "page"):
             pid = n.get("pageId") or n.get("id")
             if pid:
                 page_nodes.append(n)

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        valid_pids = []
        for node in page_nodes:
            xml_bytes = make_xwikidoc(node, wiki_name, now_ms)
            if xml_bytes:
                pid = node.get("pageId") or node.get("id")
                zf.writestr(pid + ".xml", xml_bytes)
                valid_pids.append(pid)
        
        pkg_bytes = build_package_xml(snapshot, valid_pids)
        zf.writestr("package.xml", pkg_bytes)

def main(argv: list[str]) -> None:
    if len(argv) < 2:
        print("Usage: python xwiki_fulltree_to_xar_ROBUST.py input.json [out.xar]", file=sys.stderr)
        raise SystemExit(1)
    
    input_path = argv[1]
    output_path = derive_output_path(input_path, None if len(argv) < 3 else argv[2])
    
    print(f"Converting '{input_path}' to '{output_path}'...")
    try:
        json_fulltree_to_xar(input_path, output_path)
        print(f"Success! Written XAR file to: {os.path.abspath(output_path)}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main(sys.argv)