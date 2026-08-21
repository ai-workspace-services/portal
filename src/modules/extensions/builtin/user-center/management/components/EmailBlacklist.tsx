'use client'

import { useState, useEffect } from 'react'
import Card from '../../components/Card'
import { ADMIN_API_BASE } from '../../lib/adminApi'

type EmailBlacklistProps = {
    isOpen: boolean
    onClose: () => void
}

export function EmailBlacklist({ isOpen, onClose }: EmailBlacklistProps) {
    const [blacklist, setBlacklist] = useState<string[]>([])
    const [newEmail, setNewEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const fetchBlacklist = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`${ADMIN_API_BASE}/blacklist`)
            if (response.ok) {
                const data = await response.json()
                setBlacklist(data.blacklist || [])
            }
        } catch (error) {
            console.error('Failed to fetch blacklist:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            fetchBlacklist()
        }
    }, [isOpen])

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newEmail) return

        setIsSubmitting(true)
        try {
            const response = await fetch(`${ADMIN_API_BASE}/blacklist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail }),
            })
            if (response.ok) {
                setNewEmail('')
                fetchBlacklist()
            }
        } catch (error) {
            console.error('Failed to add to blacklist:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRemove = async (email: string) => {
        try {
            const response = await fetch(`${ADMIN_API_BASE}/blacklist/${encodeURIComponent(email)}`, {
                method: 'DELETE',
            })
            if (response.ok) {
                fetchBlacklist()
            }
        } catch (error) {
            console.error('Failed to remove from blacklist:', error)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg">
                <Card>
                    <div className="flex flex-col gap-4">
                        <header className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">邮件黑名单管理</h2>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </header>

                        <form onSubmit={handleAdd} className="flex gap-2">
                            <input
                                type="email"
                                placeholder="输入要屏蔽的邮箱"
                                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                disabled={isSubmitting}
                            />
                            <button
                                type="submit"
                                disabled={isSubmitting || !newEmail}
                                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 disabled:opacity-50"
                            >
                                {isSubmitting ? '添加中...' : '添加'}
                            </button>
                        </form>

                        <div className="max-h-64 overflow-y-auto">
                            {isLoading ? (
                                <div className="py-4 text-center text-sm text-gray-500">加载中...</div>
                            ) : blacklist.length === 0 ? (
                                <div className="py-4 text-center text-sm text-gray-500">暂无黑名单数据</div>
                            ) : (
                                <table className="min-w-full text-left text-sm">
                                    <tbody className="divide-y divide-gray-100">
                                        {blacklist.map((email) => (
                                            <tr key={email} className="hover:bg-gray-50">
                                                <td className="py-2 text-gray-800">{email}</td>
                                                <td className="py-2 text-right">
                                                    <button
                                                        onClick={() => handleRemove(email)}
                                                        className="text-xs text-red-600 hover:text-red-700"
                                                    >
                                                        移除
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <footer className="mt-2 flex justify-end">
                            <button
                                onClick={onClose}
                                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                            >
                                关闭
                            </button>
                        </footer>
                    </div>
                </Card>
            </div>
        </div>
    )
}
