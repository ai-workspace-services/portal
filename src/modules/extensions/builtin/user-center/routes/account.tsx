'use client'

import Breadcrumbs from '@/app/panel/components/Breadcrumbs'
import MfaSetupPanel from '../account/MfaSetupPanel'
import SubscriptionPanel from '../account/SubscriptionPanel'
import UserOverview from '../components/UserOverview'
import ServiceReadinessCard from '../components/ServiceReadinessCard'
import { useUserStore } from '@lib/userStore'

export default function UserCenterAccountRoute() {
  const user = useUserStore((state) => state.user)
  const isReadOnlyRole = Boolean(user?.isReadOnly)

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/panel' },
          { label: 'Account', href: '/panel/account' },
        ]}
      />
      <UserOverview hideMfaMainPrompt />
      {!isReadOnlyRole ? <ServiceReadinessCard /> : null}
      {!isReadOnlyRole ? <MfaSetupPanel showSummary={false} /> : null}
      {!isReadOnlyRole ? <SubscriptionPanel /> : null}
    </div>
  )
}
