'use client'

import { useLanguage } from '@i18n/LanguageProvider'
import { NodesTable } from '../components/xds/AccountPanels'

export default function UserCenterAgentRoute() {
  const { language } = useLanguage()
  return (
    <div className="xds" style={{ background: 'transparent' }}>
      <NodesTable zh={language === 'zh'} />
    </div>
  )
}
