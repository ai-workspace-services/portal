import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / 'scripts/github-actions/write-build-provenance.py'


class ProvenanceTest(unittest.TestCase):
    def test_feature_candidate_must_match_actual_content_and_host(self):
        with tempfile.TemporaryDirectory() as directory:
            tmp = Path(directory)
            (tmp / 'metadata').write_text(json.dumps({'containerimage.digest': 'sha256:' + 'a' * 64}))
            (tmp / 'content').write_text('a' * 40)
            hostname = 'demo-sit-test-1483-sit.onwalk.net'
            env = dict(os.environ, CONTENT_RESOLVED_SHA_FILE=str(tmp / 'content'),
                       IMAGE_METADATA_FILE=str(tmp / 'metadata'), BUILD_PROVENANCE_FILE=str(tmp / 'out'),
                       IMAGE_REF='ghcr.io/ai-workspace-services/console:sit-build-1-1',
                       GITHUB_REPOSITORY='ai-workspace-services/portal', NEXT_PUBLIC_RUNTIME_ENVIRONMENT='sit',
                       FEATURE_SIT='true', SIT_HOSTNAME=hostname, CANONICAL_DOMAIN=hostname, SIT_CONTENT_SHA='a' * 40)
            run = lambda: subprocess.run([sys.executable, str(SCRIPT)], cwd=ROOT, env=env, capture_output=True, text=True)
            self.assertEqual(run().returncode, 0)
            self.assertEqual(json.loads((tmp / 'out').read_text())['candidate_hostname'], hostname)
            for key, value in [('SIT_CONTENT_SHA', 'b' * 40), ('CANONICAL_DOMAIN', 'console.svc.plus'),
                               ('NEXT_PUBLIC_RUNTIME_ENVIRONMENT', 'uat')]:
                old = env[key]
                env[key] = value
                self.assertNotEqual(run().returncode, 0)
                env[key] = old


if __name__ == '__main__':
    unittest.main()
