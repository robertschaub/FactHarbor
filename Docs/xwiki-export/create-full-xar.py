import zipfile
import os
from pathlib import Path

# Extract original full XAR
print("Extracting original XAR...")
orig_xar = Path(r"c:\DEV\FactHarbor\Docs\FactHarbor_Spec_and_Impl_21.Jan.26_Fixed.xar")
extract_dir = Path(r"c:\DEV\FactHarbor\Docs\xwiki-export\temp-full")
extract_dir.mkdir(exist_ok=True)

with zipfile.ZipFile(orig_xar, 'r') as zip_ref:
    zip_ref.extractall(extract_dir)

# Add our corrected page
print("Adding corrected Architecture Analysis page...")
docs_dir = extract_dir / "Docs"
docs_dir.mkdir(exist_ok=True)

# Copy our corrected page XML
our_page = Path(r"c:\DEV\FactHarbor\Docs\xwiki-export")
with zipfile.ZipFile(our_page / "FactHarbor-POC1-Architecture-Analysis-Full.xar") as z:
    page_content = z.read("Docs.FactHarbor_POC1_Architecture_Analysis.xml")
    with open(docs_dir / "FactHarbor_POC1_Architecture_Analysis.xml", 'wb') as f:
        f.write(page_content)

# Update package.xml
print("Updating package.xml...")
package_xml_path = extract_dir / "package.xml"
with open(package_xml_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update package info and add our page
content = content.replace(
    '<name>FactHarbor_20Jan26 </name>',
    '<name>FactHarbor Full Export with POC1 Architecture Analysis v2.6.17</name>'
)
content = content.replace(
    '<version/>',
    '<version>2.6.17</version>'
)
content = content.replace(
    '<backupPack>false</backupPack>',
    '<backupPack>true</backupPack>'
)

# Add our page entry after CKEditor.Config
content = content.replace(
    '<file defaultAction="0" language="">CKEditor.Config</file>',
    '<file defaultAction="0" language="">CKEditor.Config</file>\n    <file defaultAction="0" language="">Docs.FactHarbor POC1 Architecture Analysis</file>'
)

with open(package_xml_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Create new XAR
print("Creating new full XAR...")
output_xar = Path(r"c:\DEV\FactHarbor\Docs\xwiki-export\FactHarbor-Full-Export-v2.6.17.xar")

with zipfile.ZipFile(output_xar, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(extract_dir):
        for file in files:
            file_path = Path(root) / file
            arcname = str(file_path.relative_to(extract_dir))
            zipf.write(file_path, arcname)

print(f"Created: {output_xar}")
print(f"Size: {output_xar.stat().st_size / 1024:.1f} KB")

# Count files
with zipfile.ZipFile(output_xar, 'r') as z:
    print(f"Files in archive: {len(z.namelist())}")
