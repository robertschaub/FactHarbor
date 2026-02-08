#!/usr/bin/env python3
"""
xwiki_xar_to_fulltree_generic.py

Generic XWiki .xar -> JSON "fulltree" converter.

Design goals:
- No hard-coded root nodes (e.g., not "Specification"/"Organisation"); it converts whatever is inside the .xar.
- Preserve page content EXACTLY as found in <content> (no whitespace normalization / compression).
- Keep original XAR order by default (sorting is opt-in via --sort).
- Produce JSON compatible with common "fulltree" snapshots (nodes list with content.body, parentId, xobjects, etc.).

Notes:
- If package.xml exists, some snapshot metadata is read from it.
- Attachments are optional and not present in every XAR. You can include attachment metadata and/or embed bytes.
"""

from __future__ import annotations

import argparse
import base64
import datetime as _dt
import json
import os
import sys
import zipfile
from typing import Any, Dict, List, Optional, Tuple
from xml.etree import ElementTree as ET


def _now_iso() -> str:
    return _dt.datetime.now(tz=_dt.timezone.utc).isoformat().replace("+00:00", "Z")


def _derive_default_output(xar_path: str) -> str:
    base = os.path.splitext(os.path.basename(xar_path))[0]
    return base + "_fulltree.json"


def _derive_default_export_dir(output_json: str) -> str:
    base = os.path.splitext(os.path.basename(output_json))[0]
    return base + "_pages"


def _safe_mkdir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def _read_zip_text(zf: zipfile.ZipFile, name: str) -> str:
    data = zf.read(name)
    # Keep exact bytes -> decode UTF-8 with replacement if needed (XWiki exports are UTF-8)
    return data.decode("utf-8", errors="replace")


def _parse_package_xml(package_xml_text: str) -> Dict[str, Any]:
    """
    Best-effort parse of package.xml metadata.
    Returns dict with optional keys: package_name, infos_name, infos_description, infos_version.
    """
    out: Dict[str, Any] = {}
    try:
        root = ET.fromstring(package_xml_text)
    except Exception:
        return out

    # <package name="...">
    if root.tag == "package":
        out["package_name"] = root.attrib.get("name", "")

    infos = root.find("infos")
    if infos is not None:
        out["infos_name"] = infos.findtext("name", default="") or ""
        out["infos_description"] = infos.findtext("description", default="") or ""
        out["infos_version"] = infos.findtext("version", default="") or ""

    return out


def _itertext_preserve(elem: Optional[ET.Element]) -> str:
    """
    Return full inner text (including nested text) without stripping.
    If element is None -> empty string.
    """
    if elem is None:
        return ""
    # itertext preserves order, but not markup; that's OK because XWiki stores content as text.
    return "".join(elem.itertext())


def _parse_xwikidoc(xml_bytes: bytes, file_path_in_xar: str, include_objects: bool) -> Dict[str, Any]:
    """
    Parse a single XWiki xwikidoc XML file into a node dict.
    """
    # Parse XML safely
    try:
        root = ET.fromstring(xml_bytes)
    except Exception as e:
        # last resort: decode then re-encode to try to recover broken sequences
        text = xml_bytes.decode("utf-8", errors="replace")
        try:
            root = ET.fromstring(text.encode("utf-8"))
        except Exception:
            raise ValueError(f"Failed to parse XML '{file_path_in_xar}': {e}") from e

    # Primary ID: xwikidoc@reference attribute (preferred)
    ref = root.attrib.get("reference") or ""
    if not ref:
        # Fallback: combine <web>.<name>
        web = root.findtext("web", default="") or ""
        name = root.findtext("name", default="") or ""
        ref = f"{web}.{name}".strip(".") if web or name else file_path_in_xar.replace("/", ".").removesuffix(".xml")

    web = root.findtext("web", default="") or ""
    name = root.findtext("name", default="") or ""
    title = root.findtext("title", default="") or name or ref
    parent = root.findtext("parent", default="") or ""
    syntax = root.findtext("syntaxId", default="xwiki/2.1") or "xwiki/2.1"
    hidden = (root.findtext("hidden", default="false") or "false").lower() == "true"

    content_elem = root.find("content")
    content_body = content_elem.text if content_elem is not None and content_elem.text is not None else ""
    # IMPORTANT: DO NOT STRIP / NORMALIZE content_body.

    node: Dict[str, Any] = {
        "type": "page",
        "id": ref,
        "pageId": ref,
        "title": title,
        "parentId": parent,
        "syntax": syntax,
        "hidden": hidden,
        "content": {"body": content_body},
        "meta": {
            "filePathInXar": file_path_in_xar,
            "web": web,
            "name": name,
            "isSpaceHome": ref.endswith(".WebHome") or name == "WebHome",
        },
    }

    if include_objects:
        xobjects: List[Dict[str, Any]] = []
        for obj in root.findall("object"):
            class_name = obj.findtext("className", default="") or ""
            guid = obj.findtext("guid", default="") or ""
            num_text = obj.findtext("number", default="0") or "0"
            try:
                number = int(num_text)
            except Exception:
                number = 0

            props: Dict[str, str] = {}
            # Iterate through ALL property elements (export creates one <property> per property)
            for prop_container in obj.findall("property"):
                for child in list(prop_container):
                    # Store tag -> full inner text (including nested text) without stripping.
                    props[child.tag] = _itertext_preserve(child)

            xobjects.append(
                {
                    "className": class_name,
                    "guid": guid,
                    "number": number,
                    "properties": props,
                }
            )

        if xobjects:
            node["xobjects"] = xobjects

    return node


def xar_to_fulltree(
    xar_path: str,
    output_json: str,
    export_pages: bool,
    export_pages_dir: Optional[str],
    sort_nodes: bool,
    include_objects: bool,
    include_attachments: bool,
    embed_attachments_base64: bool,
) -> Dict[str, Any]:
    if embed_attachments_base64 and not include_attachments:
        raise ValueError("--embed-attachments-base64 requires --include-attachments")

    with zipfile.ZipFile(xar_path, "r") as zf:
        names = zf.namelist()

        # package.xml is optional
        pkg_meta: Dict[str, Any] = {}
        if "package.xml" in names:
            pkg_meta = _parse_package_xml(_read_zip_text(zf, "package.xml"))

        # Collect page xml entries (exclude package.xml)
        xml_entries = [n for n in names if n.lower().endswith(".xml") and n != "package.xml"]

        nodes: List[Dict[str, Any]] = []
        errors: List[str] = []

        for entry in xml_entries:
            try:
                node = _parse_xwikidoc(zf.read(entry), entry, include_objects=include_objects)
                nodes.append(node)
            except Exception as e:
                errors.append(str(e))

        # Attachments (optional): any non-xml entry
        attachments: List[Dict[str, Any]] = []
        if include_attachments:
            other_entries = [n for n in names if not n.lower().endswith(".xml")]
            for entry in other_entries:
                try:
                    info = zf.getinfo(entry)
                    item: Dict[str, Any] = {
                        "pathInXar": entry,
                        "size": info.file_size,
                    }
                    if embed_attachments_base64:
                        raw = zf.read(entry)
                        item["base64"] = base64.b64encode(raw).decode("ascii")
                    attachments.append(item)
                except Exception as e:
                    errors.append(f"Attachment '{entry}': {e}")

        if sort_nodes:
            # Opt-in: stable sort by pageId
            nodes = sorted(nodes, key=lambda n: (n.get("pageId") or n.get("id") or ""))

        # Derive "subject" (best effort)
        subject = (pkg_meta.get("infos_name") or "").strip()
        if not subject:
            # Use top-level space name from first node web if available
            if nodes:
                web = nodes[0].get("meta", {}).get("web", "")
                subject = web.split(".")[0] if web else (nodes[0].get("pageId", "").split(".")[0] if nodes[0].get("pageId") else "XWikiExport")
            else:
                subject = "XWikiExport"

        snapshot = {
            "schema": "xwiki-fulltree@1",
            "createdAt": _now_iso(),
            "source": {
                "type": "xar",
                "fileName": os.path.basename(xar_path),
                "hasPackageXml": "package.xml" in names,
                "entries": len(names),
                "xmlPages": len(xml_entries),
            },
            "subject": subject,
            "snapshotLabel": (pkg_meta.get("package_name") or os.path.splitext(os.path.basename(xar_path))[0]).strip(),
            "snapshotVersion": (pkg_meta.get("infos_version") or "").strip() or "1.0",
            "snapshotDescription": (pkg_meta.get("infos_description") or "").strip(),
            "nodes": nodes,
        }

        if attachments:
            snapshot["attachments"] = attachments

        if errors:
            snapshot["warnings"] = errors

        # Export page bodies (optional)
        if export_pages:
            out_dir = export_pages_dir or _derive_default_export_dir(output_json)
            _safe_mkdir(out_dir)
            for node in nodes:
                src_path = node.get("meta", {}).get("filePathInXar")
                if not src_path:
                    continue
                rel = os.path.splitext(src_path)[0] + ".xwiki"
                out_path = os.path.join(out_dir, rel)
                _safe_mkdir(os.path.dirname(out_path))
                body = (node.get("content") or {}).get("body", "")
                # Write body exactly (no normalization)
                with open(out_path, "w", encoding="utf-8", newline="\n") as f:
                    f.write(body)

        # Write JSON
        with open(output_json, "w", encoding="utf-8", newline="\n") as f:
            json.dump(snapshot, f, ensure_ascii=False, indent=2)

        return snapshot


def main(argv: List[str]) -> int:
    p = argparse.ArgumentParser(
        description="Convert an XWiki .xar export into a generic JSON 'fulltree' snapshot (no hard-coded root node)."
    )
    p.add_argument("xar_path", help="Input .xar file")
    p.add_argument("--output", help="Output JSON path (default: <xarbase>_fulltree.json)", default=None)

    # Export page bodies
    p.add_argument("--export-pages", "--export-page", dest="export_pages", action="store_true",
                  help="Export each page body into separate .xwiki files (for diff-friendly editing).")
    p.add_argument("--export-pages-dir", dest="export_pages_dir", default=None,
                  help="Directory for exported page bodies (default: <outputjsonbase>_pages).")

    # Sorting: default is NO SORT (keep XAR order)
    p.add_argument("--sort", action="store_true",
                  help="Sort nodes by pageId (opt-in). Default keeps the original XAR order.")
    # Backwards-compat / explicitness: --no-sort does nothing because no-sort is the default
    p.add_argument("--no-sort", dest="no_sort", action="store_true",
                  help=argparse.SUPPRESS)

    # XObjects
    g = p.add_mutually_exclusive_group()
    g.add_argument("--no-objects", dest="include_objects", action="store_false",
                   help="Do not include XObjects in JSON (default includes them).")
    g.add_argument("--include-objects", dest="include_objects", action="store_true",
                   help=argparse.SUPPRESS)
    p.set_defaults(include_objects=True)

    # Attachments
    p.add_argument("--include-attachments", action="store_true",
                  help="Include attachment entries (non-XML zip entries) as metadata in JSON.")
    p.add_argument("--embed-attachments-base64", action="store_true",
                  help="Embed attachment bytes as base64 in JSON (can get very large; requires --include-attachments).")

    args = p.parse_args(argv[1:])
    xar_path = args.xar_path
    if not os.path.isfile(xar_path):
        print(f"ERROR: file not found: {xar_path}", file=sys.stderr)
        return 2

    output_json = args.output or _derive_default_output(xar_path)

    try:
        xar_to_fulltree(
            xar_path=xar_path,
            output_json=output_json,
            export_pages=args.export_pages,
            export_pages_dir=args.export_pages_dir,
            sort_nodes=bool(args.sort),
            include_objects=bool(args.include_objects),
            include_attachments=bool(args.include_attachments),
            embed_attachments_base64=bool(args.embed_attachments_base64),
        )
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    print(os.path.abspath(output_json))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
