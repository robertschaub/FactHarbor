"""Check that every committed diagram render matches its canonical source hash."""
from pathlib import Path
import hashlib, xml.etree.ElementTree as ET

root=Path(__file__).resolve().parents[2]/'Docs/site/diagrams'
count=0
for source in sorted(root.glob('*.mmd')):
    image=source.with_suffix('.svg')
    svg=ET.parse(image).getroot()
    metadata=svg.find("{http://www.w3.org/2000/svg}metadata[@id='mermaid-source-sha256']")
    assert metadata is not None and metadata.text==hashlib.sha256(source.read_bytes()).hexdigest(),f'Regenerate {image.name}'
    assert svg.get('viewBox') and float(svg.get('width','0'))>0 and float(svg.get('height','0'))>0,image
    count+=1
assert count,'No shared diagrams found'
print(f'{count} diagram sources match their generated SVG metadata.')
