import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('Headmaster command center', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the command dashboard and its empty operational states', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Shift overview' })).toBeTruthy()
    expect(screen.getByText('No open duties')).toBeTruthy()
    expect(screen.getByText('No active incidents')).toBeTruthy()
  })

  it('navigates to the duty form and adds a complete assignment', async () => {
    const user = userEvent.setup()
    render(<App />)

    const dutyLinks = screen.getAllByRole('button', { name: 'Duty board' })
    await user.click(dutyLinks[0])
    await user.type(screen.getByLabelText('Task'), 'Verify west gate coverage')
    await user.type(screen.getByLabelText('Zone'), 'West gate')
    await user.type(screen.getByLabelText('Assigned to'), 'Duty lead')
    await user.selectOptions(screen.getByLabelText('Priority'), 'urgent')
    await user.click(screen.getByRole('button', { name: 'Add duty' }))

    expect(screen.getByRole('heading', { name: 'Verify west gate coverage' })).toBeTruthy()
    expect(screen.getByText(/West gate · Duty lead/)).toBeTruthy()
  })
})
