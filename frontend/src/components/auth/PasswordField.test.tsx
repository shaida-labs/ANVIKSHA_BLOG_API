import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { PasswordField } from './PasswordField'

describe('PasswordField', () => {
  it('starts masked and toggles visibility with an accessible control', async () => {
    const user = userEvent.setup()
    render(
      <PasswordField
        label="Password"
        name="password"
        value="secret"
        onChange={() => undefined}
      />,
    )

    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')

    const showButton = screen.getByRole('button', { name: 'Show password' })
    expect(showButton).toHaveAttribute('aria-pressed', 'false')

    await user.click(showButton)

    expect(input).toHaveAttribute('type', 'text')
    expect(
      screen.getByRole('button', { name: 'Hide password' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })
})
