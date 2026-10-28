#!/usr/bin/env python3
"""Write the build's source, content and image identities without credentials."""
import json
import os
from pathlib import Path
import re
import subprocess

sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
content_sha = Path(os.environ['CONTENT_RESOLVED_SHA_FILE']).read_text().strip()
metadata = json.loads(Path(os.environ['IMAGE_METADATA_FILE']).read_text())
digest = metadata.get('containerimage.digest', '')
image_ref = os.environ['IMAGE_REF']
repository = os.environ['GITHUB_REPOSITORY']
environment = os.environ['NEXT_PUBLIC_RUNTIME_ENVIRONMENT']
if not all(re.fullmatch(r'[0-9a-f]{40}', value) for value in (sha, content_sha)):
    raise SystemExit('Invalid source or content commit identity')
if not re.fullmatch(r'sha256:[0-9a-f]{64}', digest):
    raise SystemExit('Missing image digest from build metadata')
image_repository = image_ref.rsplit(':', 1)[0]
if image_repository != 'ghcr.io/ai-workspace-services/console' or repository != 'ai-workspace-services/portal':
    raise SystemExit('Unexpected image or source repository')
if environment not in ('sit', 'uat', 'prod'):
    raise SystemExit('Invalid build environment')
result = {'schema': 1, 'repository': repository, 'source_sha': sha,
          'website_content_sha': content_sha, 'environment': environment,
          'image': image_repository + '@' + digest}
Path(os.environ['BUILD_PROVENANCE_FILE']).write_text(json.dumps(result, sort_keys=True) + '\n')
