"""MkDocs compatibility assets generated from one explicit public route map."""
from pathlib import Path
import html, json, os, subprocess
from mkdocs.structure.files import File, Files

def on_pre_build(config):
    docs=Path(config.docs_dir)
    mapping=json.loads((docs/'assets/legacy-routes.json').read_text(encoding='utf-8'))
    template=(Path(__file__).parent/'legacy-navigation.js').read_text(encoding='utf-8')
    (docs/'assets/legacy-navigation.js').write_text(template.replace('ROUTE_DATA',json.dumps(mapping['pages'],ensure_ascii=True)),encoding='utf-8')

def on_files(files, config):
    repo=Path(config.config_file_path).resolve().parent
    entries=subprocess.check_output(['git','ls-files','-s','-z'],cwd=repo).decode('utf-8').split('\0')
    tracked={row.partition('\t')[2] for row in entries if row.startswith(('100644 ','100755 ')) and row.partition('\t')[0].endswith(' 0')}
    themes=[Path(directory).resolve() for directory in config.theme.dirs]
    approved=[]
    for file in files:
        source=Path(file.abs_src_path).resolve() if file.abs_src_path else None
        if source and source.is_relative_to(repo) and source.relative_to(repo).as_posix() in tracked:
            approved.append(file)
        elif source and not source.is_relative_to(repo) and any(source.is_relative_to(theme) for theme in themes):
            # Installed theme assets are build dependencies, not project notes.
            approved.append(file)
    for path in sorted(tracked):
        if path.startswith('Docs/TESTREPORTS/') and (repo/path).is_file() and (repo/path).resolve()==repo/path:
            approved.append(File(path.removeprefix('Docs/'),str(repo/'Docs'),config.site_dir,False))
    return Files(approved)

def on_page_content(content, page, config, files):
    # Stable public media URLs remain usable on GitHub; local previews use their
    # matching build outputs instead of fetching the deployed website.
    parent=Path(page.file.dest_uri).parent
    prefix=os.path.relpath('.',str(parent)).replace('\\','/')
    for directory in ('TESTREPORTS',):
        content=content.replace('"https://robertschaub.github.io/FactHarbor/'+directory+'/',
                                '"'+prefix+'/'+directory+'/')
    return content

def on_post_build(config):
    mapping=json.loads((Path(config.docs_dir)/'assets/legacy-routes.json').read_text(encoding='utf-8'))
    site=Path(config.site_dir).resolve()
    for alias,target in mapping['paths'].items():
        # Preserve exact case at build time, including TestReports vs TESTREPORTS.
        # On a case-insensitive host both share a directory; Linux emits both.
        dest=site/alias/'index.html'
        assert dest.resolve().is_relative_to(site)
        assert (site/target).is_file()
        dest.parent.mkdir(parents=True,exist_ok=True)
        url='../'+target
        dest.write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>FactHarbor</title><meta http-equiv="refresh" content="0; url='+html.escape(url,quote=True)+'"></head><body><a href="'+html.escape(url,quote=True)+'">Continue to FactHarbor</a></body></html>',encoding='utf-8')
