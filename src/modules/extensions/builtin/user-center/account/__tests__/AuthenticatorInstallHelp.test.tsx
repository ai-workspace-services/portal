import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import AuthenticatorInstallHelp from '../AuthenticatorInstallHelp'

describe('AuthenticatorInstallHelp', () => {
  it('shows official authenticator app store links below a decorative, non-secret illustration', () => {
    const { container } = render(<AuthenticatorInstallHelp />)

    expect(screen.getByRole('link', { name: 'App Store' })).toHaveAttribute(
      'href',
      'https://apps.apple.com/app/google-authenticator/id388497605',
    )
    expect(screen.getByRole('link', { name: 'Google Play' })).toHaveAttribute(
      'href',
      'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2',
    )
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/\b\d{6}\b/)
  })
})
