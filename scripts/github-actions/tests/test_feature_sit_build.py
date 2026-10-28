import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / 'scripts/github-actions/configure-feature-sit-build.sh'


class FeatureSitBuildTest(unittest.TestCase):
    def test_pins_isolated_domains_and_content(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'env'
            env = dict(os.environ, GITHUB_ENV=str(output), GITHUB_EVENT_NAME='workflow_dispatch',
                       GITHUB_REF='refs/heads/main', SIT_ENVIRONMENT='sit',
                       SIT_HOSTNAME='smoke-sit-test-1483-sit.onwalk.net', SIT_CONTENT_SHA='a' * 40)
            def run():
                return subprocess.run(['bash', str(SCRIPT)], env=env, capture_output=True, text=True)
            self.assertEqual(run().returncode, 0)
            result = output.read_text()
            self.assertIn('WEBSITE_CONTENT_REF=' + 'a' * 40, result)
            self.assertIn('ACCOUNT_SERVICE_URL=https://accounts-smoke-sit-test-1483-sit.onwalk.net', result)
            self.assertNotIn('svc.plus', result)
            resolved = dict(line.split('=', 1) for line in result.splitlines())
            build_env = dict(env, **resolved, IMAGE_REF='ghcr.io/ai-workspace-services/console:sit-build-1-1')
            args = subprocess.run(['bash', str(ROOT / 'scripts/github-actions/render-frontend-build-args.sh'), '--stdout'],
                                  env=build_env, capture_output=True, text=True, check=True).stdout
            for key in ('NEXT_PUBLIC_APP_BASE_URL', 'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_LOGIN_URL', 'NEXT_PUBLIC_DOCS_BASE_URL'):
                value = next(line.split('=', 1)[1] for line in args.splitlines() if line.startswith(key + '='))
                self.assertTrue(value.startswith('https://smoke-sit-test-1483-sit.onwalk.net'))
            for key, value in [('SIT_CONTENT_SHA', 'main'), ('SIT_HOSTNAME', 'console.svc.plus'),
                               ('SIT_ENVIRONMENT', 'uat'), ('GITHUB_REF', 'refs/heads/other')]:
                previous = env[key]
                env[key] = value
                self.assertNotEqual(run().returncode, 0)
                env[key] = previous


if __name__ == '__main__':
    unittest.main()
