import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Breadcrumbs from '@/app/panel/components/Breadcrumbs'

let mockPathname = '/panel'
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

describe('Panel Breadcrumbs', () => {
  it('renders default root breadcrumb for /panel', () => {
    mockPathname = '/panel'
    render(<Breadcrumbs />)
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    expect(screen.getByText('用户中心')).toBeInTheDocument()
    expect(screen.getByText('总览')).toBeInTheDocument()
  })

  it('renders dynamic crumbs for /panel/account', () => {
    mockPathname = '/panel/account'
    render(<Breadcrumbs />)
    expect(screen.getByText('用户中心')).toBeInTheDocument()
    expect(screen.getByText('账户中心')).toBeInTheDocument()
  })

  it('renders dynamic crumbs for /panel/subscription', () => {
    mockPathname = '/panel/subscription'
    render(<Breadcrumbs />)
    expect(screen.getByText('用户中心')).toBeInTheDocument()
    expect(screen.getByText('订阅计划')).toBeInTheDocument()
  })

  it('renders dynamic crumbs for /panel/agent', () => {
    mockPathname = '/panel/agent'
    render(<Breadcrumbs />)
    expect(screen.getByText('用户中心')).toBeInTheDocument()
    expect(screen.getByText('运行节点')).toBeInTheDocument()
  })

  it('renders multi-level crumbs for /panel/ops/billing/ledger', () => {
    mockPathname = '/panel/ops/billing/ledger'
    render(<Breadcrumbs />)
    expect(screen.getByText('用户中心')).toBeInTheDocument()
    expect(screen.getByText('运营工作台')).toBeInTheDocument()
    expect(screen.getByText('账单与对账')).toBeInTheDocument()
  })

  it('supports custom explicit items if provided', () => {
    render(
      <Breadcrumbs
        items={[
          { label: '自定义首页', href: '/panel' },
          { label: '自定义子页', href: '/panel/custom' },
        ]}
      />
    )
    expect(screen.getByText('自定义首页')).toBeInTheDocument()
    expect(screen.getByText('自定义子页')).toBeInTheDocument()
  })
})
